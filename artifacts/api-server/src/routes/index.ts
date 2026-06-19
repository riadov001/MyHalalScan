import { Router, type IRouter } from "express";
import healthRouter from "./health";
import halalRouter from "./halal";

const router: IRouter = Router();

router.use(healthRouter);
router.use(halalRouter);

export default router;
