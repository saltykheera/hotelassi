import RedisMock from "ioredis-mock";
import { RedisService } from "../services/redis.service.js";
import { HotelOffer } from "../types/hotel.types.js";

async function runRedisTests() {
  console.log("--- Starting Phase 2: Redis Service Verification ---");

  const mockRedis = new RedisMock();
  const redisService = new RedisService(mockRedis as any);

  // 1. Health check test
  const health = await redisService.healthCheck();
  console.log("Health check result:", health);
  if (health.status !== "UP") {
    throw new Error("Health check failed");
  }

  // Sample deduplicated hotels
  const sampleHotels: HotelOffer[] = [
    { name: "Holtin", price: 5340, supplier: "Supplier B", commissionPct: 20 },
    { name: "Radison", price: 5900, supplier: "Supplier A", commissionPct: 13 },
    { name: "Marriott", price: 7500, supplier: "Supplier A", commissionPct: 15 },
    { name: "Taj Palace", price: 9200, supplier: "Supplier A", commissionPct: 12 },
  ];

  // 2. Save hotels
  await redisService.saveHotels("delhi", sampleHotels, 300);
  console.log("Successfully saved 4 hotels to Redis for city 'delhi'");

  // 3. Query without price bounds
  const allHotels = await redisService.getHotelsByPriceRange("delhi");
  console.log("All hotels count:", allHotels.length);
  if (allHotels.length !== 4) {
    throw new Error(`Expected 4 hotels, got ${allHotels.length}`);
  }

  // 4. Query with price filter: minPrice=5400, maxPrice=6000
  // Holtin is 5340 (excluded), Radison is 5900 (included), Marriott is 7500 (excluded)
  const filtered = await redisService.getHotelsByPriceRange("delhi", 5400, 6000);
  console.log("Filtered hotels (5400 - 6000):", filtered);
  if (filtered.length !== 1 || filtered[0].name !== "Radison") {
    throw new Error(`Price filter failed. Expected Radison, got: ${JSON.stringify(filtered)}`);
  }

  // 5. Query out of range: minPrice=10000
  const outOfRange = await redisService.getHotelsByPriceRange("delhi", 10000);
  console.log("Out of range count:", outOfRange.length);
  if (outOfRange.length !== 0) {
    throw new Error(`Expected 0 hotels, got ${outOfRange.length}`);
  }

  console.log("✅ All Redis storage and in-memory price filtering tests PASSED!");
  await redisService.disconnect();
}

runRedisTests().catch((err) => {
  console.error("❌ Redis verification failed:", err);
  process.exit(1);
});

