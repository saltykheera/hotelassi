import { HotelOffer, HotelFilterParams } from "../types/hotel.types.js";
import { runHotelSearchWorkflow } from "../temporal/client.js";
import { deduplicateAndSelectBestOffers } from "../temporal/workflows.js";
import { createActivities } from "../temporal/activities.js";
import { RedisService } from "./redis.service.js";
import { logger } from "../utils/logger.js";

export class HotelService {
  private redisService: RedisService;
  private activities = createActivities();

  constructor(redisService?: RedisService) {
    this.redisService = redisService || new RedisService();
  }

  /**
   * Search hotels by city and apply price filtering via Redis
   */
  public async searchHotels(filter: HotelFilterParams): Promise<HotelOffer[]> {
    const { city, minPrice, maxPrice } = filter;
    logger.info({ city, minPrice, maxPrice }, "Processing hotel search request");

    // 1. Orchestrate search across suppliers
    try {
      // Primary: Dispatch to Temporal Workflow
      logger.debug({ city }, "Attempting Temporal workflow orchestration");
      await runHotelSearchWorkflow(city);
    } catch (temporalErr: any) {
      // Resilient Fallback: If Temporal Server is not running in local standalone mode,
      // execute direct in-process orchestration so the API remains 100% operational
      logger.warn(
        { error: temporalErr.message },
        "Temporal server unavailable; falling back to direct in-process orchestration"
      );

      const [resA, resB] = await Promise.allSettled([
        this.activities.fetchSupplierAActivity(city),
        this.activities.fetchSupplierBActivity(city),
      ]);

      const offersA = resA.status === "fulfilled" ? resA.value : [];
      const offersB = resB.status === "fulfilled" ? resB.value : [];

      if (resA.status === "rejected" && resB.status === "rejected") {
        throw new Error("Both upstream suppliers failed to respond");
      }

      const deduplicated = deduplicateAndSelectBestOffers(offersA, offersB);
      await this.redisService.saveHotels(city, deduplicated);
    }

    // 2. Query filtered results natively inside Redis using Sorted Set
    logger.debug({ city, minPrice, maxPrice }, "Querying filtered hotels from Redis");
    const results = await this.redisService.getHotelsByPriceRange(city, minPrice, maxPrice);

    return results;
  }
}

export const hotelService = new HotelService();

