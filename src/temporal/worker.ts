import { NativeConnection, Worker } from "@temporalio/worker";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { createActivities } from "./activities.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runWorker() {
  logger.info({ address: env.TEMPORAL_ADDRESS }, "Starting Temporal Worker...");

  const connection = await NativeConnection.connect({
    address: env.TEMPORAL_ADDRESS,
  });

  const worker = await Worker.create({
    connection,
    namespace: "default",
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    workflowsPath: resolve(__dirname, "./workflows.js"),
    activities: createActivities(),
  });

  logger.info(
    { taskQueue: env.TEMPORAL_TASK_QUEUE },
    "Temporal Worker is listening for workflow tasks"
  );

  await worker.run();
}

runWorker().catch((err) => {
  logger.error({ err: err.message }, "Temporal Worker fatal error");
  process.exit(1);
});

