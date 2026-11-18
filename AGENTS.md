# k6-performance-testing — Project Agent Instructions

TypeScript k6 load-testing scenarios, structured as a pnpm workspace (mirrors
the `adda` repo's tooling). The k6 CLI runs **directly** on the host
(`brew install k6`); only the QuickPizza test target is containerized
(`compose.yaml`).

## Structure

```
k6-performance-testing/
├── intro/              # intro-course scenarios (.ts, k6-native — no build step)
├── lib/                # shared config/helpers imported by all scenarios
├── packages/           # future shared helpers as workspace members
├── compose.yaml        # self-hosted QuickPizza test target (:3333)
├── docs/               # concept notes and guides (docs/basics.md)
└── .github/workflows/  # CI: oxlint + prettier + tsc
```

## Commands

```bash
make setup                             # first-time: prerequisites + deps + QuickPizza
pnpm install                           # workspace deps only
make up                                # start self-hosted QuickPizza (:3333)
k6 run intro/smoke-test.ts             # any scenario directly (or: make run s=…)
pnpm lint                              # oxlint + prettier --check
pnpm format                            # prettier --write
pnpm typecheck                         # tsc --noEmit
make check                             # lint + typecheck (the CI gate)
```

## Conventions

- **Everything is TypeScript.** No new `.js` scenarios. k6 (≥ 0.53) executes
  `.ts` natively — never add a build/bundle step for scenarios. Relative
  imports must include the explicit `.ts` extension (k6 requirement;
  `allowImportingTsExtensions` is enabled for this).
- Every scenario exports `options` typed as `Options` from `k6/options`.
- The **k6 CLI is a host dependency** (`brew install k6` — ≥ 0.53 for native
  TS). Run it directly (`k6 run …`, `--http-debug`, `K6_WEB_DASHBOARD=true`,
  …); do not reintroduce a Docker wrapper for k6.- **Test target is the self-hosted QuickPizza service** (`compose.yaml`,
  `make up`). Scenarios get the URL from `lib/config.ts` (`__ENV.BASE_URL`
  override, default `http://localhost:3333`). The public
  `https://quickpizza.grafana.com` instance is for **small-scale** manual
  checks only (`-e BASE_URL=…`) — soak/breakpoint/spike never run against it.
- Public QuickPizza endpoints used by scenarios: `/`, `/api/quotes`,
  `/api/names`, `/api/adjectives`, `/api/config`, `/healthz`, `/ready`.
  `/api/pizza` and `/api/doughs` require auth — out of scope for intro.
- Every non-trivial scenario should declare `thresholds` — a load test without
  pass/fail criteria is just data collection.
- Formatting: prettier (semi, double quotes, width 100 — same config as the
  adda repo). Linting: oxlint (`correctness` category as errors).
- Git hooks (husky): pre-commit runs lint-staged (oxlint --fix + prettier on
  staged files); commit-msg runs commitlint. Conventional commit style is
  **enforced** (`feat:`, `fix:`, `chore:`, `docs:` …).
- Docs live in `docs/`, not the repo root.
- Never commit unless explicitly asked.
- Commits follow the existing style: `feat:`, `fix:`, `chore:`, `docs:`.

## Quality policy

- After any scenario change: `pnpm lint && pnpm typecheck`.
- After tooling/config changes: run `make check` and one real scenario run
  (e.g. `make run s=intro/first-script.ts`).
- CI (`.github/workflows/ci.yml`) runs lint + typecheck on every push/PR —
  keep it green.
