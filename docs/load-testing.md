# Load testing REST API

Load tests use [k6](https://k6.io) and target the REST API (port 3000). The scripts use a video pool of varying lengths (short, medium, long) with round-robin selection.

## Prerequisites

- REST API running (Docker or local)
- k6 installed, or Docker for running k6 via `make load-test-*`

## Starting the API for tests

**Docker:**

```bash
docker run -p 3000:3000 -e RATE_LIMIT_MAX=1000 artsamsonov/transcriptor-mcp-api
```

**Local:**

```bash
npm run build && RATE_LIMIT_MAX=1000 npm start
```

For load tests, raise `RATE_LIMIT_MAX` so the default 100 req/min limit does not cap throughput.

## Running load tests

### Via Make (Docker)

```bash
# All scenarios
make load-test

# Individual scenarios
make load-test-health    # GET /health only (50 VU, 30s)
make load-test-subtitles # POST /subtitles (5–10 VU, 60s)
make load-test-mixed     # health + available + subtitles (10 VU, 60s)
```

Override base URL:

```bash
make load-test-health LOAD_BASE_URL=http://localhost:3000
```

### Via npm (requires k6 installed)

```bash
npm run load-test           # health
npm run load-test:subtitles
npm run load-test:mixed
```

With custom base URL:

```bash
BASE_URL=http://192.168.1.10:3000 npm run load-test
```

### Direct k6

```bash
k6 run load/health.js
k6 run -e BASE_URL=http://localhost:3000 load/subtitles.js
```

## Scenarios

| Script | Endpoint(s) | VUs | Duration | Description |
|--------|-------------|-----|----------|-------------|
| `health.js` | GET /health | 50 | 30s | Baseline, no yt-dlp |
| `subtitles.js` | POST /subtitles | 5→10 | 60s | Heavy load, video pool |
| `mixed.js` | /health, /subtitles/available, /subtitles | 10 | 60s | 70% / 20% / 10% mix |

## Video pool

Videos in `load/config.js` are real YouTube IDs with different durations:

- **Short (≤2 min):** Me at the zoo, Potter Puppet Pals
- **Medium (3–5 min):** Rick Astley, Gangnam Style, Despacito, Tom Scott
- **Long (14–20 min):** TED talks (Tim Urban, Hans Rosling, Ken Robinson)

Selection is round-robin across VUs and iterations.

## Metrics

k6 reports:

- `http_reqs` — requests per second
- `http_req_duration` — latency (avg, p95, p99)
- `http_req_failed` — error rate
- `iterations` — completed script runs

For throughput (videos/min): `http_reqs` for POST /subtitles × 60.

## Recommended env for load tests

```bash
RATE_LIMIT_MAX=1000
YT_DLP_TIMEOUT=90000
```

See [configuration.md](configuration.md) for all options.
