import { HotelOffer } from "./hotel.types.js";

/**
 * Segregated Reader Interface (ISP)
 */
export interface IHotelCacheReader {
  getHotelsByPriceRange(
    city: string,
    minPrice?: number,
    maxPrice?: number
  ): Promise<HotelOffer[]>;
  hasHotels(city: string): Promise<boolean>;
}

/**
 * Segregated Writer Interface (ISP)
 */
export interface IHotelCacheWriter {
  saveHotels(
    city: string,
    hotels: HotelOffer[],
    ttlSeconds?: number
  ): Promise<void>;
}

/**
 * Health Check Contract (ISP)
 */
export interface IHealthCheckable {
  healthCheck(): Promise<{
    status: "UP" | "DOWN";
    latencyMs: number;
    error?: string;
  }>;
}

/**
 * Composite Repository Contract
 */
export interface IHotelCacheRepository
  extends IHotelCacheReader,
    IHotelCacheWriter,
    IHealthCheckable {
  disconnect(): Promise<void>;
}

