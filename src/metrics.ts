/**
 * Prometheus metrics for /metrics endpoint.
 * Uses prom-client for counters, histograms, gauges.
 * Counts are process-local and reset on restart.
 */

import { Counter, Gauge, Histogram, Registry } from 'prom-client';

const register = new Registry();

const defaultLabels = { service: 'api' };
register.setDefaultLabels(defaultLabels);

// HTTP metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestErrorsTotal = new Counter({
  name: 'http_request_errors_total',
  help: 'Total HTTP request errors (4xx/5xx)',
  registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Cache metrics
export const cacheHitsTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  registers: [register],
});

export const cacheMissesTotal = new Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  registers: [register],
});

// Subtitles extraction failures (YouTube + Whisper both failed)
export const subtitlesExtractionFailuresTotal = new Counter({
  name: 'subtitles_extraction_failures_total',
  help: 'Videos where subtitles could not be obtained (neither YouTube nor Whisper)',
  registers: [register],
});

// MCP metrics (labels set when used from MCP)
export const mcpToolCallsTotal = new Counter({
  name: 'mcp_tool_calls_total',
  help: 'Total MCP tool calls',
  labelNames: ['tool'],
  registers: [register],
});

export const mcpToolErrorsTotal = new Counter({
  name: 'mcp_tool_errors_total',
  help: 'Total MCP tool errors',
  labelNames: ['tool'],
  registers: [register],
});

export const mcpSessionTotal = new Gauge({
  name: 'mcp_session_total',
  help: 'Active MCP sessions',
  labelNames: ['type'],
  registers: [register],
});

export const mcpRequestDurationSeconds = new Histogram({
  name: 'mcp_request_duration_seconds',
  help: 'MCP request duration in seconds',
  labelNames: ['endpoint'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Bounded ring buffer for failed subtitles URLs (max 100)
const FAILURES_BUFFER_SIZE = 100;
const failuresBuffer: Array<{ url: string; timestamp: string }> = [];
let failuresTotalCount = 0;

export function recordRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number
): void {
  httpRequestsTotal.inc({ method, route, status_code: String(statusCode) });
  httpRequestDurationSeconds.observe({ method, route }, durationSeconds);
  if (statusCode >= 400) {
    httpRequestErrorsTotal.inc();
  }
}

export function recordError(): void {
  httpRequestErrorsTotal.inc();
}

export function recordCacheHit(): void {
  cacheHitsTotal.inc();
}

export function recordCacheMiss(): void {
  cacheMissesTotal.inc();
}

export function recordSubtitlesFailure(url: string): void {
  subtitlesExtractionFailuresTotal.inc();
  failuresTotalCount += 1;
  const entry = { url, timestamp: new Date().toISOString() };
  if (failuresBuffer.length >= FAILURES_BUFFER_SIZE) {
    failuresBuffer.shift();
  }
  failuresBuffer.push(entry);
}

export function getFailedSubtitlesUrls(): {
  failures: Array<{ url: string; timestamp: string }>;
  total: number;
} {
  return {
    failures: [...failuresBuffer],
    total: failuresTotalCount,
  };
}

export function recordMcpToolCall(tool: string): void {
  mcpToolCallsTotal.inc({ tool });
}

export function recordMcpToolError(tool: string): void {
  mcpToolErrorsTotal.inc({ tool });
}

export function setMcpSessionCount(type: 'streamable' | 'sse', count: number): void {
  mcpSessionTotal.set({ type }, count);
}

export function recordMcpRequestDuration(endpoint: string, durationSeconds: number): void {
  mcpRequestDurationSeconds.observe({ endpoint }, durationSeconds);
}

/**
 * Sets default labels (service=api or service=mcp). Call from mcp-http to override.
 */
export function setMetricsService(service: 'api' | 'mcp'): void {
  register.setDefaultLabels({ service });
}

/**
 * Returns Prometheus text exposition format (UTF-8).
 */
export async function renderPrometheus(): Promise<string> {
  return register.metrics();
}
