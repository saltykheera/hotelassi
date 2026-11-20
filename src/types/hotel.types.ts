/**
 * Raw supplier offer schema returned by supplier APIs
 */
export interface RawSupplierHotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

/**
 * Canonical deduplicated hotel offer schema returned to clients
 */
export interface HotelOffer {
  name: string;
  price: number;
  supplier: string;
  commissionPct: number;
}

/**
 * Common contract for supplier clients (LSP & OCP)
 */
export interface IHotelSupplierClient {
  readonly supplierName: string;
  fetchHotels(city: string, simulateError?: boolean): Promise<RawSupplierHotel[]>;
  healthCheck(): Promise<{ status: "UP" | "DOWN"; latencyMs: number }>;
}

/**
 * Filter parameters for querying hotels
 */
export interface HotelFilterParams {
  city: string;
  minPrice?: number;
  maxPrice?: number;
}

