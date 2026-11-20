import { Request, Response } from "express";
import { RawSupplierHotel } from "../types/hotel.types.js";
import { logger } from "../utils/logger.js";

// Mock Data for Supplier A with overlapping and unique hotels
const supplierAHotels: RawSupplierHotel[] = [
  {
    hotelId: "a1",
    name: "Holtin",
    price: 6000,
    city: "delhi",
    commissionPct: 10,
  },
  {
    hotelId: "a2",
    name: "Radison",
    price: 5900,
    city: "delhi",
    commissionPct: 13,
  },
  {
    hotelId: "a3",
    name: "Marriott",
    price: 7500,
    city: "delhi",
    commissionPct: 15,
  },
  {
    hotelId: "a4",
    name: "Taj Palace",
    price: 9200,
    city: "delhi",
    commissionPct: 12,
  },
  {
    hotelId: "a5",
    name: "The Oberoi",
    price: 11000,
    city: "mumbai",
    commissionPct: 18,
  },
];

// Mock Data for Supplier B with overlapping and unique hotels
const supplierBHotels: RawSupplierHotel[] = [
  {
    hotelId: "b1",
    name: "Holtin",
    price: 5340, // Cheaper than Supplier A (6000) -> Winner
    city: "delhi",
    commissionPct: 20,
  },
  {
    hotelId: "b2",
    name: "Radison",
    price: 6200, // More expensive than Supplier A (5900) -> Supplier A wins
    city: "delhi",
    commissionPct: 14,
  },
  {
    hotelId: "b3",
    name: "Marriott",
    price: 7500, // Same price as Supplier A -> Tie-breaker selects higher commission or Supplier A
    city: "delhi",
    commissionPct: 16,
  },
  {
    hotelId: "b4",
    name: "Hyatt Regency",
    price: 4800, // Unique to Supplier B
    city: "delhi",
    commissionPct: 11,
  },
  {
    hotelId: "b5",
    name: "ITC Maratha",
    price: 8800,
    city: "mumbai",
    commissionPct: 15,
  },
];

export class MockSupplierController {
  public static getSupplierA(req: Request, res: Response): void {
    const city = (req.query.city as string)?.toLowerCase();
    const simulateError = req.query.simulateError === "true";

    if (simulateError) {
      logger.warn({ supplier: "Supplier A" }, "Simulated error triggered on Supplier A");
      res.status(500).json({ error: "Supplier A internal error (simulated)" });
      return;
    }

    const results = city
      ? supplierAHotels.filter((h) => h.city.toLowerCase() === city)
      : supplierAHotels;

    res.json(results);
  }

  public static getSupplierB(req: Request, res: Response): void {
    const city = (req.query.city as string)?.toLowerCase();
    const simulateError = req.query.simulateError === "true";

    if (simulateError) {
      logger.warn({ supplier: "Supplier B" }, "Simulated error triggered on Supplier B");
      res.status(500).json({ error: "Supplier B internal error (simulated)" });
      return;
    }

    const results = city
      ? supplierBHotels.filter((h) => h.city.toLowerCase() === city)
      : supplierBHotels;

    res.json(results);
  }

  public static healthSupplierA(req: Request, res: Response): void {
    res.json({ status: "UP", supplier: "Supplier A", timestamp: new Date().toISOString() });
  }

  public static healthSupplierB(req: Request, res: Response): void {
    res.json({ status: "UP", supplier: "Supplier B", timestamp: new Date().toISOString() });
  }
}

