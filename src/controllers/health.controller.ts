import { Request, Response } from "express";
import axios from "axios";
import { env } from "../config/env.js";
import { RedisService } from "../services/redis.service.js";
import { checkTemporalHealth } from "../temporal/client.js";
import { SystemHealthResponse, DependencyHealth } from "../types/health.types.js";
import { logger } from "../utils/logger.js";

const redisService = new RedisService();

export class HealthController {
  public static async getHealth(_req: Request, res: Response): Promise<void> {
    const timestamp = new Date().toISOString();

    // Check Supplier A health
    const checkSupplierA = async (): Promise<DependencyHealth> => {
      const start = Date.now();
      try {
        const url = env.SUPPLIER_A_URL.replace("/hotels", "/health");
        await axios.get(url, { timeout: 2000 });
        return { status: "UP", latencyMs: Date.now() - start };
      } catch (err: any) {
        return {
          status: "DOWN",
          latencyMs: Date.now() - start,
          error: err.message || "Unreachable",
        };
      }
    };

    // Check Supplier B health
    const checkSupplierB = async (): Promise<DependencyHealth> => {
      const start = Date.now();
      try {
        const url = env.SUPPLIER_B_URL.replace("/hotels", "/health");
        await axios.get(url, { timeout: 2000 });
        return { status: "UP", latencyMs: Date.now() - start };
      } catch (err: any) {
        return {
          status: "DOWN",
          latencyMs: Date.now() - start,
          error: err.message || "Unreachable",
        };
      }
    };

    // Run all health checks concurrently
    const [supplierA, supplierB, redis, temporal] = await Promise.all([
      checkSupplierA(),
      checkSupplierB(),
      redisService.healthCheck(),
      checkTemporalHealth(),
    ]);

    // Aggregate overall system status
    const allUp =
      supplierA.status === "UP" &&
      supplierB.status === "UP" &&
      redis.status === "UP" &&
      temporal.status === "UP";

    const allDown =
      supplierA.status === "DOWN" &&
      supplierB.status === "DOWN" &&
      redis.status === "DOWN";

    let overallStatus: "UP" | "DEGRADED" | "DOWN" = "UP";
    if (allDown) {
      overallStatus = "DOWN";
    } else if (!allUp) {
      overallStatus = "DEGRADED";
    }

    const healthResponse: SystemHealthResponse = {
      status: overallStatus,
      timestamp,
      dependencies: {
        supplierA,
        supplierB,
        redis,
        temporal,
      },
    };

    logger.debug({ health: healthResponse }, "Health check executed");

    const httpStatusCode = overallStatus === "DOWN" ? 503 : 200;
    res.status(httpStatusCode).json(healthResponse);
  }
}

