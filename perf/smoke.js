// Smoke test — validação rápida pós-deploy (YAS product-service)
// Thresholds and scenario params from __ENV (nfr.yaml via nfr-to-env.py)
import http from 'k6/http';
import { check, sleep } from 'k6';

const VUS = __ENV.K6_SMOKE_VUS ? parseInt(__ENV.K6_SMOKE_VUS) : 1;
const DURATION = __ENV.K6_SMOKE_DURATION || '1m';
const THRESHOLD_FAILED = parseFloat(__ENV.K6_SMOKE_THRESHOLD_HTTP_REQ_FAILED_RATE || 0.05);
const THRESHOLD_P95 = parseInt(__ENV.K6_SMOKE_THRESHOLD_HTTP_REQ_DURATION_P95 || 1000);

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_failed: [`rate<${THRESHOLD_FAILED}`],
    http_req_duration: [`p(95)<${THRESHOLD_P95}`],
  },
};

// context-path is /product
const BASE_URL = __ENV.BASE_URL || 'http://yas-product.app.svc.cluster.local:8080/product';

export default function () {
  const health = http.get(`${BASE_URL}/actuator/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const products = http.get(`${BASE_URL}/storefront/products?pageNo=0&pageSize=10`);
  check(products, { 'products 200': (r) => r.status === 200 });

  const brands = http.get(`${BASE_URL}/storefront/brands`);
  check(brands, { 'brands 200': (r) => r.status === 200 });

  const categories = http.get(`${BASE_URL}/storefront/categories`);
  check(categories, { 'categories 200': (r) => r.status === 200 });

  sleep(1);
}

// handleSummary: writes aggregated summary JSON at test end (replaces --summary-export,
// removed in k6 v0.48+).
export function handleSummary(data) {
  const summary = { metrics: {} };
  for (const [name, m] of Object.entries(data.metrics)) {
    if (m && m.values) summary.metrics[name] = { values: m.values };
  }
  const json = JSON.stringify(summary);
  const outFile = __ENV.K6_SUMMARY_FILE || '/output/summary.json';
  // ponytail: goja (k6 JS runtime) does not support ES6 computed property names.
  const result = { stdout: json };
  result[outFile] = json;
  return result;
}
