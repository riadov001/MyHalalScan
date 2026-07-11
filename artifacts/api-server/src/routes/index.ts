import { Router, type IRouter } from "express";
import healthRouter from "./health";
import halalRouter from "./halal";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(halalRouter);
router.use(storageRouter);

export default router;
