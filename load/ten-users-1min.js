/**
 * Load scenario: 10 users simultaneously; each requests subtitles for one video at a time
 * until 1 minute has elapsed (next request after previous response).
 * Uses VIDEO_POOL via getVideoRequest.
 */
import http from 'k6/http';
import { BASE_URL, getVideoRequest } from './config.js';

export const options = {
  scenarios: {
    ten_users_1min: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<120000'],
  },
};

export default function () {
  const iter = typeof __ITER === 'number' ? __ITER : Math.floor(Date.now() / 1000);
  const { url, type, lang } = getVideoRequest(iter, __VU);
  const res = http.post(
    `${BASE_URL}/subtitles`,
    JSON.stringify({ url, type, lang }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '120s',
    }
  );
  if (res.status !== 200) {
    console.error(`Subtitles failed: ${res.status} ${res.body?.slice(0, 200)}`);
  }
}
