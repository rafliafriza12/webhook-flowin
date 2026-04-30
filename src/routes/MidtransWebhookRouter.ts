import express from "express";
import MidtransWebhookController from "../controllers/MidtransWebhookController";

const router = express.Router();

router.post("/", MidtransWebhookController.handle);

export default router;
