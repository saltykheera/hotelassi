import { Router } from "express";
import { HotelController } from "../controllers/hotel.controller.js";
import { HealthController } from "../controllers/health.controller.js";

export const apiRouter = Router();

apiRouter.get("/api/hotels", HotelController.getHotels);
apiRouter.get("/health", HealthController.getHealth);

