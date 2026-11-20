import { Connection, Client } from "@temporalio/client";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { HotelOffer } from "../types/hotel.types.js";
import { hotelOfferOrchestratorWorkflow } from "./workflows.js";

let clientInstance: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (clientInstance) {
    return clientInstance;
  }

  try {
    const connection = await Connection.connect({
      address: env.TEMPORAL_ADDRESS,
      connectTimeout: 1000,
    });

    clientInstance = new Client({
      connection,
    });

    logger.info({ address: env.TEMPORAL_ADDRESS }, "Connected to Temporal Server");
    return clientInstance;
  } catch (err: any) {
    logger.debug({ address: env.TEMPORAL_ADDRESS, error: err.message }, "Temporal connection check failed");
    throw err;
  }
}

/**
 * Executes the Hotel Search Workflow and returns the deduplicated offers
 */
export async function runHotelSearchWorkflow(city: string): Promise<HotelOffer[]> {
  const client = await getTemporalClient();
  const workflowId = `hotel-search-${city.toLowerCase()}-${Date.now()}`;

  logger.info({ workflowId, city, taskQueue: env.TEMPORAL_TASK_QUEUE }, "Dispatching Temporal workflow");

  const handle = await client.workflow.start(hotelOfferOrchestratorWorkflow, {
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    workflowId,
    args: [{ city }],
  });

  return await handle.result();
}

/**
 * Health check for Temporal Server connectivity
 */
export async function checkTemporalHealth(): Promise<{
  status: "UP" | "DOWN";
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const client = await getTemporalClient();
    await client.workflowService.getSystemInfo({});
    const latencyMs = Date.now() - start;
    return { status: "UP", latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return { status: "DOWN", latencyMs, error: err.message || "Failed to reach Temporal server" };
  }
}
