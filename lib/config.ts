/**
 * Shared target configuration for all scenarios.
 *
 * The default points at the self-hosted QuickPizza service from compose.yaml
 * (`make up` → http://localhost:3333). Override per run for another
 * instance — the public one is small-scale only:
 *
 *   k6 run -e BASE_URL=https://quickpizza.grafana.com intro/smoke-test.ts
 */
export const BASE_URL = __ENV.BASE_URL ?? "http://localhost:3333";
