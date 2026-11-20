export interface DependencyHealth {
  status: "UP" | "DOWN";
  latencyMs?: number;
  error?: string;
}

export interface SystemHealthResponse {
  status: "UP" | "DEGRADED" | "DOWN";
  timestamp: string;
  dependencies: {
    supplierA: DependencyHealth;
    supplierB: DependencyHealth;
    redis: DependencyHealth;
    temporal: DependencyHealth;
  };
}

