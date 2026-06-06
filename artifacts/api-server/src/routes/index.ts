import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import transactionsRouter from "./transactions";
import statsRouter from "./stats";
import qrCodesRouter from "./qrcodes";
import transferRouter from "./transfer";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(transactionsRouter);
router.use(statsRouter);
router.use(qrCodesRouter);
router.use(transferRouter);

export default router;
