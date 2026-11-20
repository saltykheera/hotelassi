import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT) || 3000;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(port),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  TEMPORAL_ADDRESS: z.string().default("localhost:7233"),
  TEMPORAL_TASK_QUEUE: z.string().default("HOTEL_OFFER_TASK_QUEUE"),
  SUPPLIER_A_URL: z.string().default(`http://127.0.0.1:${port}/supplierA/hotels`),
  SUPPLIER_B_URL: z.string().default(`http://127.0.0.1:${port}/supplierB/hotels`),
});

export const env = envSchema.parse(process.env);

