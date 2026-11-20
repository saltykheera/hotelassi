import axios from "axios";
import { RawSupplierHotel, HotelOffer } from "../types/hotel.types.js";
import { MockSupplierController } from "../controllers/mock.controller.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { RedisService } from "../services/redis.service.js";

const redisService = new RedisService();

export interface HotelActivities {
  fetchSupplierAActivity(city: string): Promise<RawSupplierHotel[]>;
  fetchSupplierBActivity(city: string): Promise<RawSupplierHotel[]>;
  saveHotelsToRedisActivity(city: string, hotels: HotelOffer[]): Promise<void>;
}

export const createActivities = (): HotelActivities => ({
  async fetchSupplierAActivity(city: string): Promise<RawSupplierHotel[]> {
    logger.info({ city, supplier: "Supplier A" }, "Fetching hotels from Supplier A");
    try {
      const response = await axios.get<RawSupplierHotel[]>(env.SUPPLIER_A_URL, {
        params: { city },
        timeout: 3000,
      });
      return response.data;
    } catch (err: any) {
      logger.debug({ error: err.message }, "Using local supplier A mock data");
      let data: RawSupplierHotel[] = [];
      const mockReq = { query: { city } } as any;
      MockSupplierController.getSupplierA(mockReq, {
        json: (d: any) => {
          data = d;
        },
        status: () => ({ json: () => {} }),
      } as any);
      return data;
    }
  },

  async fetchSupplierBActivity(city: string): Promise<RawSupplierHotel[]> {
    logger.info({ city, supplier: "Supplier B" }, "Fetching hotels from Supplier B");
    try {
      const response = await axios.get<RawSupplierHotel[]>(env.SUPPLIER_B_URL, {
        params: { city },
        timeout: 3000,
      });
      return response.data;
    } catch (err: any) {
      logger.debug({ error: err.message }, "Using local supplier B mock data");
      let data: RawSupplierHotel[] = [];
      const mockReq = { query: { city } } as any;
      MockSupplierController.getSupplierB(mockReq, {
        json: (d: any) => {
          data = d;
        },
        status: () => ({ json: () => {} }),
      } as any);
      return data;
    }
  },

  async saveHotelsToRedisActivity(city: string, hotels: HotelOffer[]): Promise<void> {
    logger.info({ city, count: hotels.length }, "Saving deduplicated hotels to Redis");
    await redisService.saveHotels(city, hotels);
  },
});
