import crypto from "crypto";

export interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  transaction_id?: string;
  fraud_status?: string;
  payment_type?: string;
  [key: string]: unknown;
}

export const verifySignature = (
  notif: MidtransNotification,
  serverKey: string
): boolean => {
  const raw = `${notif.order_id}${notif.status_code}${notif.gross_amount}${serverKey}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  return expected === notif.signature_key;
};

export const mapTransactionStatus = (
  transactionStatus: string,
  fraudStatus?: string
): string => {
  const t = transactionStatus.toLowerCase();
  if (t === "capture") {
    return fraudStatus === "challenge" ? "pending" : "settlement";
  }
  if (t === "settlement") return "settlement";
  if (t === "pending") return "pending";
  if (t === "deny") return "deny";
  if (t === "expire") return "expire";
  if (t === "cancel") return "cancel";
  if (t === "refund" || t === "partial_refund") return "refund";
  if (t === "failure") return "failure";
  return t;
};
