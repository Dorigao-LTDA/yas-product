// Spike test — pico repentino de tráfego (YAS product-service)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://yas-product.app.svc.cluster.local:8080/product';
const errors = new Rate('yas_product_errors');

const ERR_RATE = parseFloat(__ENV.K6_SPIKE_THRESHOLD_HTTP_REQ_FAILED_RATE || 0.10);
const P99_THRESH = parseInt(__ENV.K6_SPIKE_THRESHOLD_HTTP_REQ_DURATION_P99 || 3000);

function parseStages(envStr) {
  if (!envStr) return [
    { duration: '1m', target: 25 },
    { duration: '30s', target: 200 },
    { duration: '2m', target: 250 },
    { duration: '1m30s', target: 0 },
  ];
  try { return JSON.parse(envStr); } catch { return []; }
}

export const options = {
  thresholds: {
    http_req_failed: [`rate<${ERR_RATE}`],
    http_req_duration: [`p(99)<${P99_THRESH}`],
    yas_product_errors: [`rate<${ERR_RATE}`],
  },
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: parseStages(__ENV.K6_SPIKE_STAGES),
      gracefulStop: '30s',
    },
  },
};

export default function () {
  const r = Math.random();
  if (r < 0.5) {
    const products = http.get(`${BASE_URL}/storefront/products?pageNo=0&pageSize=10`, { tags: { operation: 'list-products' } });
    check(products, { 'products 200': (x) => x.status === 200 }) || errors.add(1);
  } else if (r < 0.7) {
    const brands = http.get(`${BASE_URL}/storefront/brands`, { tags: { operation: 'list-brands' } });
    check(brands, { 'brands 200': (x) => x.status === 200 }) || errors.add(1);
  } else {
    const categories = http.get(`${BASE_URL}/storefront/categories`, { tags: { operation: 'list-categories' } });
    check(categories, { 'categories 200': (x) => x.status === 200 }) || errors.add(1);
  }
  sleep(0.3 + Math.random() * 0.7);
}

export function handleSummary(data) {
  const summary = { metrics: {} };
  for (const [name, m] of Object.entries(data.metrics)) {
    if (m && m.values) summary.metrics[name] = { values: m.values };
  }
  const json = JSON.stringify(summary);
  const outFile = __ENV.K6_SUMMARY_FILE || '/output/summary.json';
  const result = { stdout: json };
  result[outFile] = json;
  return result;
}
