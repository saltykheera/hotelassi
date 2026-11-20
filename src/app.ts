import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import { rootRouter } from "./routes/index.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    logger.debug({ method: req.method, path: req.path, query: req.query }, "Incoming HTTP Request");
    next();
  });

  // Swagger Documentation Setup
  const possibleSwaggerPaths = [
    path.resolve(__dirname, "./docs/swagger.json"),
    path.resolve(__dirname, "../src/docs/swagger.json"),
    path.resolve(__dirname, "../dist/docs/swagger.json"),
  ];
  const swaggerPath = possibleSwaggerPaths.find((p) => fs.existsSync(p));
  if (swaggerPath) {
    const swaggerDoc = JSON.parse(fs.readFileSync(swaggerPath, "utf-8"));
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    app.get("/api-docs.json", (_req, res) => {
      res.json(swaggerDoc);
    });
  }

  // Serve static UI assets (Airbnb-inspired design tokens)
  const publicPath = path.resolve(__dirname, "../src/public");
  const fallbackPublicPath = path.resolve(__dirname, "./public");
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  } else if (fs.existsSync(fallbackPublicPath)) {
    app.use(express.static(fallbackPublicPath));
  }

  // Mount API & Mock routes
  app.use(rootRouter);

  // Global error handler
  app.use(errorMiddleware);

  return app;
}
