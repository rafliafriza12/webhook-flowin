import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  MidtransNotification,
  mapTransactionStatus,
  verifySignature,
} from "../utils/midtrans";

const handle = async (req: Request, res: Response): Promise<void> => {
  try {
    const notif = req.body as MidtransNotification;

    if (!notif?.order_id || !notif?.signature_key || !notif?.status_code) {
      res.status(400).json({ status: 400, message: "Invalid payload" });
      return;
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      console.error("MIDTRANS_SERVER_KEY is not defined");
      res.status(500).json({ status: 500, message: "Server config error" });
      return;
    }

    if (!verifySignature(notif, serverKey)) {
      res.status(403).json({ status: 403, message: "Invalid signature" });
      return;
    }

    const db = mongoose.connection.db;
    if (!db) {
      res.status(500).json({ status: 500, message: "Database not ready" });
      return;
    }

    const newStatus = mapTransactionStatus(
      notif.transaction_status,
      notif.fraud_status
    );
    const now = new Date();

    const tagihanCol = db.collection("tagihans");
    const meterCol = db.collection("meters");
    const rabCol = db.collection("rabs");

    const tagihan = await tagihanCol.findOne({
      MidtransOrderId: notif.order_id,
    });

    if (tagihan) {
      const tagihanUpdate: Record<string, unknown> = {
        StatusPembayaran: newStatus,
        MetodePembayaran: notif.payment_type ?? tagihan.MetodePembayaran,
        MidtransResponse: notif,
        MidtransTransactionId:
          notif.transaction_id ?? tagihan.MidtransTransactionId,
        updatedAt: now,
      };
      if (newStatus === "settlement") {
        tagihanUpdate.TanggalPembayaran = now;
        tagihanUpdate.Menunggak = false;
      }

      await tagihanCol.updateOne(
        { _id: tagihan._id },
        { $set: tagihanUpdate }
      );

      if (
        newStatus === "settlement" &&
        tagihan.IdMeteran &&
        typeof tagihan.TotalPemakaian === "number"
      ) {
        await meterCol.updateOne(
          { _id: tagihan.IdMeteran },
          {
            $inc: { pemakaianBelumTerbayar: -tagihan.TotalPemakaian },
            $set: { updatedAt: now },
          }
        );
      }

      res.status(200).json({
        status: 200,
        message: "Tagihan updated",
        order_id: notif.order_id,
        new_status: newStatus,
      });
      return;
    }

    const rab = await rabCol.findOne({ orderId: notif.order_id });
    if (rab) {
      await rabCol.updateOne(
        { _id: rab._id },
        {
          $set: {
            statusPembayaran: newStatus,
            updatedAt: now,
          },
        }
      );

      res.status(200).json({
        status: 200,
        message: "RAB updated",
        order_id: notif.order_id,
        new_status: newStatus,
      });
      return;
    }

    res.status(404).json({
      status: 404,
      message: "Order not found",
      order_id: notif.order_id,
    });
  } catch (error) {
    console.error("Midtrans webhook error:", error);
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

export default { handle };
