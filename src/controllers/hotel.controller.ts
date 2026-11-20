import { Request, Response, NextFunction } from "express";
import { HotelQuerySchema } from "../models/hotel.schema.js";
import { hotelService } from "../services/hotel.service.js";
import { logger } from "../utils/logger.js";

export class HotelController {
  public static async getHotels(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate request query parameters using Zod
      const parsed = HotelQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        logger.warn({ errors: parsed.error.errors, query: req.query }, "Validation error on /api/hotels");
        res.status(400).json({
          error: "Bad Request",
          message: "Invalid query parameters",
          details: parsed.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }

      const { city, minPrice, maxPrice } = parsed.data;

      const hotels = await hotelService.searchHotels({
        city,
        minPrice,
        maxPrice,
      });

      // Response format strictly matches assignment specification
      res.json(hotels);
    } catch (err: any) {
      logger.error({ error: err.message, query: req.query }, "Error handling /api/hotels");
      next(err);
    }
  }
}

