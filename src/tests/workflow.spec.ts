import { deduplicateAndSelectBestOffers } from "../temporal/workflows.js";
import { RawSupplierHotel } from "../types/hotel.types.js";

async function runWorkflowDeduplicationTests() {
  console.log("--- Starting Phase 3: Workflow Logic Verification ---");

  // Supplier A Dataset
  const supplierAOffers: RawSupplierHotel[] = [
    { hotelId: "a1", name: "Holtin", price: 6000, city: "delhi", commissionPct: 10 },
    { hotelId: "a2", name: "Radison", price: 5900, city: "delhi", commissionPct: 13 },
    { hotelId: "a3", name: "Marriott", price: 7500, city: "delhi", commissionPct: 15 },
    { hotelId: "a4", name: "Taj Palace", price: 9200, city: "delhi", commissionPct: 12 },
  ];

  // Supplier B Dataset
  const supplierBOffers: RawSupplierHotel[] = [
    { hotelId: "b1", name: "Holtin", price: 5340, city: "delhi", commissionPct: 20 }, // Cheaper
    { hotelId: "b2", name: "Radison", price: 6200, city: "delhi", commissionPct: 14 }, // More expensive
    { hotelId: "b3", name: "Marriott", price: 7500, city: "delhi", commissionPct: 18 }, // Same price, higher commission
    { hotelId: "b4", name: "Hyatt Regency", price: 4800, city: "delhi", commissionPct: 11 }, // B only
  ];

  // 1. Test Deduplication
  const results = deduplicateAndSelectBestOffers(supplierAOffers, supplierBOffers);
  console.log("Deduplicated results count:", results.length);
  console.log("Results summary:", results);

  // Assertions:
  // Total unique hotels: Holtin, Radison, Marriott, Taj Palace, Hyatt Regency = 5
  if (results.length !== 5) {
    throw new Error(`Expected 5 unique hotels, got ${results.length}`);
  }

  // Check Holtin: Supplier B should win with price 5340
  const holtin = results.find((h) => h.name === "Holtin");
  if (!holtin || holtin.supplier !== "Supplier B" || holtin.price !== 5340) {
    throw new Error(`Holtin assertion failed: expected Supplier B at 5340, got ${JSON.stringify(holtin)}`);
  }

  // Check Radison: Supplier A should win with price 5900
  const radison = results.find((h) => h.name === "Radison");
  if (!radison || radison.supplier !== "Supplier A" || radison.price !== 5900) {
    throw new Error(`Radison assertion failed: expected Supplier A at 5900, got ${JSON.stringify(radison)}`);
  }

  // Check Marriott: Same price (7500), Supplier B has higher commission (18% vs 15%)
  const marriott = results.find((h) => h.name === "Marriott");
  if (!marriott || marriott.supplier !== "Supplier B" || marriott.commissionPct !== 18) {
    throw new Error(`Marriott assertion failed: expected Supplier B at 7500 with 18% commission, got ${JSON.stringify(marriott)}`);
  }

  // Check Taj Palace: Supplier A only
  const taj = results.find((h) => h.name === "Taj Palace");
  if (!taj || taj.supplier !== "Supplier A" || taj.price !== 9200) {
    throw new Error(`Taj Palace assertion failed: got ${JSON.stringify(taj)}`);
  }

  // Check Hyatt Regency: Supplier B only
  const hyatt = results.find((h) => h.name === "Hyatt Regency");
  if (!hyatt || hyatt.supplier !== "Supplier B" || hyatt.price !== 4800) {
    throw new Error(`Hyatt Regency assertion failed: got ${JSON.stringify(hyatt)}`);
  }

  // 2. Test Supplier Outage Resilience:
  // If Supplier A is empty (failed or returned nothing), Supplier B offers should still process cleanly
  const fallbackResults = deduplicateAndSelectBestOffers([], supplierBOffers);
  if (fallbackResults.length !== 4) {
    throw new Error(`Fallback resilience failed: expected 4 offers from Supplier B, got ${fallbackResults.length}`);
  }

  console.log("✅ All Phase 3 Workflow Deduplication & Resilience tests PASSED!");
}

runWorkflowDeduplicationTests().catch((err) => {
  console.error("❌ Workflow test failed:", err);
  process.exit(1);
});

