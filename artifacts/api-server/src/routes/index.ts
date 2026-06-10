import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import transactionsRouter from "./transactions";
import statsRouter from "./stats";
import qrCodesRouter from "./qrcodes";
import transferRouter from "./transfer";
import paydunyaWebhookRouter from "./paydunya-webhook";
import paydunyaDiagnoseRouter from "./paydunya-diagnose";
import gomboplusWebhookRouter from "./gomboplus-webhook";
import adminRouter from "./admin";
import pushNotificationRouter from "./push-notification";
import testPushRouter from "./test-push";
import configRouter from "./config";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(authRouter);
router.use(transactionsRouter);
router.use(statsRouter);
router.use(qrCodesRouter);
router.use(transferRouter);
router.use(paydunyaWebhookRouter);
router.use(paydunyaDiagnoseRouter);
router.use(gomboplusWebhookRouter);
router.use(adminRouter);
router.use(pushNotificationRouter);
router.use(testPushRouter);
router.use(feedbackRouter);

export default router;
