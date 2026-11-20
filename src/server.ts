import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Hotel Offer Orchestrator API listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
  logger.info(`Mock Supplier A: http://localhost:${env.PORT}/supplierA/hotels`);
  logger.info(`Mock Supplier B: http://localhost:${env.PORT}/supplierB/hotels`);
});

