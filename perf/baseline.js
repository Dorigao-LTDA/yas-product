// Baseline test — ramping VUs até 25 para validar SLAs críticos (YAS product-service)
// Thresholds and scenario params from __ENV (nfr.yaml via nfr-to-env.py)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://yas-product.app.svc.cluster.local:8080/product';

const errors = new Rate('yas_product_errors');

// Thresholds from nfr.yaml
const ERR_RATE = parseFloat(__ENV.K6_BASELINE_THRESHOLD_HTTP_REQ_FAILED_RATE || 0.01);
const P95_THRESH = parseInt(__ENV.K6_BASELINE_THRESHOLD_HTTP_REQ_DURATION_P95 || 300);
const P99_THRESH = parseInt(__ENV.K6_BASELINE_THRESHOLD_HTTP_REQ_DURATION_P99 || 800);
const THROUGHPUT_MIN = parseInt(__ENV.K6_BASELINE_THRESHOLD_HTTP_REQS_RATE || 10);
const BIZ_ERR_RATE = parseFloat(__ENV.K6_BASELINE_THRESHOLD_BUSINESS_ERRORS_RATE || 0.05);

function parseStages(envStr) {
  if (!envStr) return [
    { duration: '1m', target: 25 },
    { duration: '3m', target: 25 },
    { duration: '1m', target: 0 },
  ];
  try { return JSON.parse(envStr); } catch { return []; }
}

export const options = {
  thresholds: {
    http_req_failed: [`rate<${ERR_RATE}`],
    http_req_duration: [`p(95)<${P95_THRESH}`, `p(99)<${P99_THRESH}`],
    http_reqs: [`rate>=${THROUGHPUT_MIN}`],
    yas_product_errors: [`rate<${BIZ_ERR_RATE}`],
  },
  scenarios: {
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: parseStages(__ENV.K6_BASELINE_STAGES),
      gracefulStop: '30s',
    },
  },
};

export default function () {
  // Leitura (85%): list products, brands, categories, health
  const r = Math.random();
  if (r < 0.5) {
    const products = http.get(`${BASE_URL}/storefront/products?page=0&size=10`, { tags: { operation: 'list-products' } });
    check(products, { 'list products 200': (x) => x.status === 200 }) || errors.add(1);
  } else if (r < 0.7) {
    const brands = http.get(`${BASE_URL}/storefront/brands`, { tags: { operation: 'list-brands' } });
    check(brands, { 'list brands 200': (x) => x.status === 200 }) || errors.add(1);
  } else if (r < 0.9) {
    const categories = http.get(`${BASE_URL}/storefront/categories`, { tags: { operation: 'list-categories' } });
    check(categories, { 'list categories 200': (x) => x.status === 200 }) || errors.add(1);
  } else {
    const health = http.get(`${BASE_URL}/actuator/health`, { tags: { operation: 'health' } });
    check(health, { 'health 200': (x) => x.status === 200 }) || errors.add(1);
  }

  sleep(0.5 + Math.random() * 1.5);
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
