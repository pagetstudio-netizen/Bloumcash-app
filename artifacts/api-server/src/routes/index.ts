import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import transactionsRouter from "./transactions";
import statsRouter from "./stats";
import qrCodesRouter from "./qrcodes";
import transferRouter from "./transfer";
import paydunyaWebhookRouter from "./paydunya-webhook";
import paydunyaDiagnoseRouter from "./paydunya-diagnose";
import adminRouter from "./admin";
import pushNotificationRouter from "./push-notification";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(transactionsRouter);
router.use(statsRouter);
router.use(qrCodesRouter);
router.use(transferRouter);
router.use(paydunyaWebhookRouter);
router.use(paydunyaDiagnoseRouter);
router.use(adminRouter);
router.use(pushNotificationRouter);

export default router;
