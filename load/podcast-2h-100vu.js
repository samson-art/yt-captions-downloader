/**
 * Load scenario: 100 users simultaneously request transcripts of 2-hour podcasts.
 * 100 VU, 1 iteration per VU; test runs until all 100 complete.
 * Metric: test_run_duration = time to process all requests.
 */
import http from 'k6/http';
import { BASE_URL, getPodcast2hRequest } from './config.js';

export const options = {
  scenarios: {
    podcast_2h_100_users: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 1,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<900000'],
  },
};

export default function () {
  const iter = typeof __ITER === 'number' ? __ITER : Math.floor(Date.now() / 1000);
  const { url, type, lang } = getPodcast2hRequest(iter, __VU);
  const res = http.post(
    `${BASE_URL}/subtitles`,
    JSON.stringify({ url, type, lang }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '900s',
    }
  );
  if (res.status !== 200) {
    console.error(`Subtitles failed: ${res.status} ${res.body?.slice(0, 200)}`);
  }
}
