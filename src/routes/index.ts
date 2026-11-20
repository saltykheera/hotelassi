import { Router } from "express";
import { mockRouter } from "./mock.routes.js";
import { apiRouter } from "./api.routes.js";

export const rootRouter = Router();

// Mount API routes (/api/hotels, /health)
rootRouter.use(apiRouter);

// Mount mock supplier routes (/supplierA/*, /supplierB/*)
rootRouter.use(mockRouter);
