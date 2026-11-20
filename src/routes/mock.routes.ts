import { Router } from "express";
import { MockSupplierController } from "../controllers/mock.controller.js";

export const mockRouter = Router();

mockRouter.get("/supplierA/hotels", MockSupplierController.getSupplierA);
mockRouter.get("/supplierB/hotels", MockSupplierController.getSupplierB);
mockRouter.get("/supplierA/health", MockSupplierController.healthSupplierA);
mockRouter.get("/supplierB/health", MockSupplierController.healthSupplierB);

