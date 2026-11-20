import { proxyActivities, ApplicationFailure } from "@temporalio/workflow";
import type { HotelActivities } from "./activities.js";
import { RawSupplierHotel, HotelOffer } from "../types/hotel.types.js";

const { fetchSupplierAActivity, fetchSupplierBActivity, saveHotelsToRedisActivity } =
  proxyActivities<HotelActivities>({
    startToCloseTimeout: "5s",
    retry: {
      initialInterval: "500ms",
      backoffCoefficient: 2,
      maximumAttempts: 3,
    },
  });

/**
 * Pure, deterministic deduplication and best-offer selection function
 */
export function deduplicateAndSelectBestOffers(
  supplierAOffers: RawSupplierHotel[],
  supplierBOffers: RawSupplierHotel[]
): HotelOffer[] {
  const offerMap = new Map<string, { candidate: HotelOffer; priorityScore: number }>();

  // Process Supplier A offers
  for (const offer of supplierAOffers) {
    const key = offer.name.trim().toLowerCase();
    offerMap.set(key, {
      candidate: {
        name: offer.name.trim(),
        price: offer.price,
        supplier: "Supplier A",
        commissionPct: offer.commissionPct,
      },
      priorityScore: 1,
    });
  }

  // Process Supplier B offers and compare
  for (const offer of supplierBOffers) {
    const key = offer.name.trim().toLowerCase();
    const existing = offerMap.get(key);

    const bCandidate: HotelOffer = {
      name: offer.name.trim(),
      price: offer.price,
      supplier: "Supplier B",
      commissionPct: offer.commissionPct,
    };

    if (!existing) {
      // Only Supplier B has this hotel
      offerMap.set(key, { candidate: bCandidate, priorityScore: 2 });
    } else {
      // Hotel exists in both lists: Compare prices
      if (bCandidate.price < existing.candidate.price) {
        // Supplier B is cheaper
        offerMap.set(key, { candidate: bCandidate, priorityScore: 2 });
      } else if (bCandidate.price === existing.candidate.price) {
        // Equal price: tie-breaker prefers higher commission percentage
        if (bCandidate.commissionPct > existing.candidate.commissionPct) {
          offerMap.set(key, { candidate: bCandidate, priorityScore: 2 });
        }
      }
      // If Supplier A was cheaper, leave Supplier A
    }
  }

  // Return formatted deduplicated array sorted by price ascending for neat presentation
  return Array.from(offerMap.values())
    .map((item) => item.candidate)
    .sort((a, b) => a.price - b.price);
}

/**
 * Temporal Workflow: Orchestrates parallel supplier fetches, pure deduplication,
 * and Redis persistence with supplier failure resilience.
 */
export async function hotelOfferOrchestratorWorkflow(params: {
  city: string;
}): Promise<HotelOffer[]> {
  const { city } = params;

  // 1. Fetch from Supplier A and Supplier B in parallel
  const [resultA, resultB] = await Promise.allSettled([
    fetchSupplierAActivity(city),
    fetchSupplierBActivity(city),
  ]);

  const supplierAOffers: RawSupplierHotel[] =
    resultA.status === "fulfilled" ? resultA.value : [];
  const supplierBOffers: RawSupplierHotel[] =
    resultB.status === "fulfilled" ? resultB.value : [];

  // If both suppliers failed, fail the workflow
  if (resultA.status === "rejected" && resultB.status === "rejected") {
    throw ApplicationFailure.create({
      message: "Both upstream hotel suppliers are unreachable or failed",
      nonRetryable: false,
    });
  }

  // 2. Deterministic deduplication & best price selection
  const deduplicatedOffers = deduplicateAndSelectBestOffers(
    supplierAOffers,
    supplierBOffers
  );

  // 3. Persist deduplicated list to Redis for subsequent price-range filtering
  await saveHotelsToRedisActivity(city, deduplicatedOffers);

  return deduplicatedOffers;
}

