import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import midtransWebhookRouter from "./routes/MidtransWebhookRouter";
import connectDB from "./config/database";

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.middlewares();
    this.routes();
  }

  private middlewares(): void {
    this.app.use(cors({ origin: "*", optionsSuccessStatus: 200 }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use(async (_req: Request, res: Response, next: NextFunction) => {
      try {
        await connectDB();
        next();
      } catch (err) {
        console.error("DB connect error:", err);
        res.status(500).json({ status: 500, message: "Database unavailable" });
      }
    });

    this.app.use("/api/webhook/midtrans", midtransWebhookRouter);
  }

  private routes(): void {
    this.app.get("/", (_req: Request, res: Response) => {
      res.json({
        message: "Webhook Flowin running",
        timestamp: new Date().toISOString(),
      });
    });
  }
}

export default new App().app;
