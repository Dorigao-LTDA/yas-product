// Chaos traffic — GET only, para medir disponibilidade durante chaos (YAS product-service)
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://yas-product.app.svc.cluster.local:8080/product';

export const options = {
  vus: 5,
  duration: '3m',
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const products = http.get(`${BASE_URL}/storefront/products?page=0&size=10`);
  check(products, { 'products 200': (r) => r.status === 200 });

  const health = http.get(`${BASE_URL}/actuator/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  sleep(0.5);
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
