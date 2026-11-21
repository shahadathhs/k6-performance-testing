# k6-performance-testing

[![CI](https://github.com/shahadathhs/k6-performance-testing/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/shahadathhs/k6-performance-testing/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![k6](https://img.shields.io/badge/k6-v2.4.0-orange?logo=k6)](https://k6.io)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](prettier.config.mjs)

A collection of **TypeScript [k6](https://k6.io) load-testing scenarios** —
smoke, load, soak, spike, and breakpoint profiles with real pass/fail
thresholds.

The **k6 CLI runs directly** on your machine (see
[Prerequisites](#prerequisites) or run `make setup`), so every flag, command,
and bit of k6 tooling is available. The test target — a
**self-hosted [QuickPizza](https://github.com/grafana/quickpizza)** instance —
is the only thing containerized. k6 runs `.ts` natively, so scenarios have no
build step; types are enforced separately by `tsc --noEmit`.

## Contents

- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Scenario gallery](#scenario-gallery)
- [Commands](#commands)
- [Running scenarios](#running-scenarios)
- [Test target (QuickPizza via Docker)](#test-target-quickpizza-via-docker)
- [Viewing results](#viewing-results)
- [Repo layout](#repo-layout)
- [Docs](#docs)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

Global tools you need on your machine — `make setup` checks for all of them
and is OS-aware ([scripts/setup.sh](scripts/setup.sh)):

- **macOS** — auto-installs missing k6/node via brew, pnpm via corepack
- **Linux** — checks everything, prints exact install commands for anything
  missing (never runs `sudo` for you)
- **Windows** — run from **WSL2** (recommended); Git Bash also works for the
  checks, with choco/scoop hints for missing tools

| Tool                                                         | Why                                     | Install                                                                                                                       |
| ------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [k6 CLI](https://grafana.com/docs/k6/latest/set-up/install/) | runs scenarios directly                 | [official docs](https://grafana.com/docs/k6/latest/set-up/install/) — brew · apt/dnf/snap · choco/scoop                       |
| Node.js ≥ 20 + pnpm 10                                       | workspace tooling (types, lint, format) | [nodejs.org](https://nodejs.org/en/download) + `corepack enable`                                                              |
| Docker                                                       | hosts the QuickPizza test target        | [Docker Desktop](https://www.docker.com/products/docker-desktop/) · [Engine (Linux)](https://docs.docker.com/engine/install/) |
| git + Make                                                   | basics                                  | your platform's package manager (Xcode CLT on macOS, `build-essential` on Debian/Ubuntu)                                      |

## Quick start

```bash
git clone https://github.com/shahadathhs/k6-performance-testing.git
cd k6-performance-testing

make setup                 # prerequisites + deps + QuickPizza + local Jenkins
k6 run intro/smoke-test.ts # or: make run s=intro/smoke-test.ts
```

## Scenario gallery

Scenarios in [`intro/`](intro/) cover the k6 fundamentals — test types,
scripting, checks, thresholds, tags, groups and metrics — against the
self-hosted QuickPizza service from [`compose.yaml`](compose.yaml); the
shared [`lib/config.ts`](lib/config.ts) reads a `BASE_URL` env override
for pointing at another instance.

| Scenario                                           | Command                                 | Profile             | Verifies                                      |
| -------------------------------------------------- | --------------------------------------- | ------------------- | --------------------------------------------- |
| [first-script.ts](intro/first-script.ts)           | `make run s=intro/first-script.ts`      | 10 VUs · 10s        | hello world                                   |
| [smoke-test.ts](intro/smoke-test.ts)               | `make run s=intro/smoke-test.ts`        | 1 VU · 30s          | target works at all                           |
| [load-test.ts](intro/load-test.ts)                 | `make run s=intro/load-test.ts`         | 10→0 VUs · 1m       | normal peak behavior                          |
| [stress-test.ts](intro/stress-test.ts)             | `make run s=intro/stress-test.ts`       | 50→0 VUs · 9m       | failure mode beyond peak                      |
| [soak-test.ts](intro/soak-test.ts)                 | `make run s=intro/soak-test.ts`         | 1000 VUs · **24h**  | long-run leaks/degradation                    |
| [breakpoint-test.ts](intro/breakpoint-test.ts)     | `make run s=intro/breakpoint-test.ts`   | →10000 VUs · **2h** | system ceiling                                |
| [spike-test.ts](intro/spike-test.ts)               | `make run s=intro/spike-test.ts`        | 10000→0 VUs · 3m    | burst + recovery                              |
| [thresholds.ts](intro/thresholds.ts)               | `make run s=intro/thresholds.ts`        | 10 VUs · 10s        | pass/fail criteria (p95, error rate, checks)  |
| [custom-metrics.ts](intro/custom-metrics.ts)       | `make run s=intro/custom-metrics.ts`    | 5 VUs · 5s          | custom Counter & Trend with thresholds        |
| [tags.ts](intro/tags.ts)                           | `make run s=intro/tags.ts`              | 2 VUs · 10s         | custom tags slicing metrics, checks, counters |
| [groups.ts](intro/groups.ts)                       | `make run s=intro/groups.ts`            | 2 VUs · 8s          | nested groups + `group_duration` budgets      |
| [expected-response.ts](intro/expected-response.ts) | `make run s=intro/expected-response.ts` | 2 VUs · 8s          | expected vs unexpected response slicing       |
| [lifecycle.ts](intro/lifecycle.ts)                 | `make run s=intro/lifecycle.ts`         | 2 VUs · 6s          | init/setup/VU/teardown order, live            |
| [abort.ts](intro/abort.ts)                         | `make run s=intro/abort.ts`             | 10 VUs · 10s        | `exec.test.abort()` when target is down       |

⚠️ Stress, soak and breakpoint scenarios exceed normal load (and run long) —
never point them at a system you don't own.

### HTTP requests

Scenarios in [`http-requests/`](http-requests/) walk the full API-testing
progression against the self-hosted QuickPizza — GET, JSON parsing,
token auth, and the complete CRUD lifecycle:

| Scenario                         | Command                        | Demonstrates                                    |
| -------------------------------- | ------------------------------ | ----------------------------------------------- |
| [get.ts](http-requests/get.ts)   | `k6 run http-requests/get.ts`  | the Response object, headers, debugging         |
| [json.ts](http-requests/json.ts) | `k6 run http-requests/json.ts` | parsing JSON, extracting values, correlation    |
| [auth.ts](http-requests/auth.ts) | `k6 run http-requests/auth.ts` | register + token login + authenticated requests |
| [crud.ts](http-requests/crud.ts) | `k6 run http-requests/crud.ts` | POST→GET→PUT→PATCH→DELETE with id correlation   |

### Parameters

Scenarios in [`parameters/`](parameters/) cover parameterized test data —
env vars, randomized pacing and data, and bulk data from JSON/CSV files:

| Scenario                                                | Command                                  | Demonstrates                                    |
| ------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| [env-var.ts](parameters/env-var.ts)                     | `k6 run parameters/env-var.ts`           | `__ENV` with `-e` overrides and defaults        |
| [random-think-time.ts](parameters/random-think-time.ts) | `k6 run parameters/random-think-time.ts` | jittered `sleep(randomIntBetween(…))`           |
| [random-string.ts](parameters/random-string.ts)         | `k6 run parameters/random-string.ts`     | unique test data (`randomString`) per iteration |
| [random-item.ts](parameters/random-item.ts)             | `k6 run parameters/random-item.ts`       | random pick from a LIVE response array          |
| [shared-array-json.ts](parameters/shared-array-json.ts) | `k6 run parameters/shared-array-json.ts` | `SharedArray` + `open()` from JSON              |
| [shared-array-csv.ts](parameters/shared-array-csv.ts)   | `k6 run parameters/shared-array-csv.ts`  | `SharedArray` + papaparse from CSV              |

### CLI

Everything in [`cli/`](cli/) (including its [README](cli/README.md) — the
full CLI cookbook with outputs, dashboards and HTML reports):

| Scenario                                       | Command                                                     | Demonstrates                                |
| ---------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| [load-flags.ts](cli/load-flags.ts)             | `k6 run -u 5 -d 10s cli/load-flags.ts`                      | load profile from CLI flags, not the script |
| [insecure-request.ts](cli/insecure-request.ts) | `k6 run --insecure-skip-tls-verify cli/insecure-request.ts` | TLS opt-out against badssl.com              |

### CI/CD pipelines

Everything in [`ci-cd/`](ci-cd/) (including its
[README](ci-cd/README.md) — the CI cookbook: exit codes, a local
`make jenkins` setup, pipeline walkthroughs). One contract: thresholds
decide, the pipeline reads the exit code:

| Pipeline / scenario                            | Run where                 | Demonstrates                              |
| ---------------------------------------------- | ------------------------- | ----------------------------------------- |
| [ci-gate.ts](ci-cd/ci-gate.ts)                 | `k6 run ci-cd/ci-gate.ts` | thresholds as the CI gate (5 VUs · 15s)   |
| [ci-gate.ts](ci-cd/ci-gate.ts) poisoned        | `POISON=true k6 run …`    | the red half — threshold breach → exit 99 |
| [Jenkinsfile](ci-cd/Jenkinsfile)               | Jenkins Pipeline job      | k6 on the agent (host CLI)                |
| [Jenkinsfile.docker](ci-cd/Jenkinsfile.docker) | Jenkins Pipeline job      | k6 in the official `grafana/k6` container |

### Browser (UI) testing

Browser scenarios in [`browser/`](browser/) drive a real Chromium end-to-end
(pages, forms, screenshots) — they verify a page _works_, not just that it
responds. Needs a local Chrome/Chromium; slow by nature, so few iterations:

| Scenario                     | Command                   | Demonstrates                                                        |
| ---------------------------- | ------------------------- | ------------------------------------------------------------------- |
| [login.ts](browser/login.ts) | `k6 run browser/login.ts` | Chromium end-to-end: form login, rendered-header checks, screenshot |

## Commands

| Make             | pnpm             | What it does                           |
| ---------------- | ---------------- | -------------------------------------- |
| `make install`   | `pnpm install`   | install workspace deps                 |
| `make up`        | —                | start self-hosted QuickPizza           |
| `make down`      | —                | stop QuickPizza + Jenkins + containers |
| `make jenkins`   | —                | build + start local Jenkins → :8080    |
| `make lint`      | `pnpm lint`      | oxlint + `prettier --check`            |
| `make format`    | `pnpm format`    | write formatting                       |
| `make typecheck` | `pnpm typecheck` | `tsc --noEmit` over all scenarios      |
| `make check`     | —                | lint + typecheck (the CI gate)         |
| `make run s=…`   | `k6 run …`       | run any scenario                       |
| `make version`   | `k6 version`     | installed k6 version                   |
| `make help`      | —                | list all targets                       |

## Running scenarios

k6 runs **directly on your machine** — every CLI flag is at your fingertips:

```sh
k6 run intro/smoke-test.ts                                  # basic run
k6 run --http-debug="full" intro/thresholds.ts              # dump requests + responses, incl. bodies
k6 run -e BASE_URL=https://quickpizza.grafana.com intro/smoke-test.ts
k6 inspect intro/load-test.ts                                # resolved options
```

**Web dashboard** — enable it with an env var and k6 serves a live,
browser-based dashboard (charts for VUs, requests/s, latency percentiles)
at `http://127.0.0.1:5665` _while the test runs_ — no account, no upload:

```sh
K6_WEB_DASHBOARD=true k6 run intro/load-test.ts
```

> **k6 won't exit while a dashboard tab is open.** The process deliberately
> stays alive as long as at least one browser window is viewing the dashboard —
> close the tab (or Ctrl+C; the test itself is already finished) and it exits
> with the summary. For headless runs/CI, disable the HTTP server entirely:
> `K6_WEB_DASHBOARD_PORT=-1`.

> ⚠️ The public instance is for **small-scale** tests only. Soak, breakpoint,
> and spike profiles must always run against the self-hosted target.

## Test target (QuickPizza via Docker)

Scenarios hit a **self-hosted [QuickPizza](https://github.com/grafana/quickpizza)**
instance — Grafana's official k6 practice app — defined in
[`compose.yaml`](compose.yaml):

```sh
make up     # start QuickPizza → http://localhost:3333
make down   # stop it
```

The shared [`lib/config.ts`](lib/config.ts) resolves the target:
`__ENV.BASE_URL` when set, `http://localhost:3333` by default.

- k6 ≥ 0.53 executes `.ts` natively, so scenarios need no build step; type
  safety is enforced separately by `tsc --noEmit`.

## Viewing results

| Option                             | What you get                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| default                            | end-of-test summary in the terminal (what the docs/BASICS.md guide explains) |
| `K6_WEB_DASHBOARD=true k6 run …`   | live local dashboard at `127.0.0.1:5665` — charts while the test runs        |
| `k6 run --out json=results.json …` | raw metric samples to a file for scripted analysis                           |
| Prometheus + Grafana (self-hosted) | long-term storage, dashboards, and alerting on your own infra                |

**Can you self-host "k6 Cloud"?** The managed k6 Cloud UI itself is
SaaS-only — but the equivalent self-hosted stack is fully OSS: point k6 at
your own metrics backend (`--out prometheus-remote-write` or `--out influxdb`)
and visualize with self-hosted Grafana using the official
[k6 dashboards](https://grafana.com/grafana/dashboards/?search=k6). The
[QuickPizza repo](https://github.com/grafana/quickpizza) ships ready-made
Compose files for exactly this kind of local observability stack.

## Repo layout

```
k6-performance-testing/
├── intro/              # k6 fundamentals: test types, scripting, metrics (.ts)
├── http-requests/      # GET/JSON/token-auth/CRUD scenarios
├── parameters/         # env vars, random data, JSON/CSV test data
├── cli/                # flag-driven load, TLS opt-out + the CLI cookbook
├── ci-cd/              # CI gate scenario + Jenkins pipelines (host/Docker)
├── browser/            # Chromium end-to-end scenarios (k6/browser module)
├── data/               # shared test-data files (users.json, users.csv)
├── lib/                # shared config/helpers (BASE_URL, jslib wrapper)
├── compose.yaml        # QuickPizza target + opt-in local Jenkins (make jenkins)
├── docs/               # concept notes (metrics, VUs, throughput…)
└── .github/            # CI, PR/issue templates, dependabot
```

## Docs

- [docs/BASICS.md](docs/BASICS.md) — k6 load-testing fundamentals: VUs,
  requests, latency, throughput, iterations, checks, thresholds, scenarios,
  and how to read the end-of-test summary.
- [docs/SCRIPTING.md](docs/SCRIPTING.md) — how a k6 script works: the export
  contract (`options`, `default`, `setup`, `teardown`), execution lifecycle,
  and the mental model.
- [docs/HTTP.md](docs/HTTP.md) — HTTP primer for API testing: methods, status
  codes, and authentication (API keys, tokens vs session cookies).

## Contributing

PRs and issues are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) to get
started, and open an issue first for bigger scenario ideas. Bug reports use
the issue templates (`.github/ISSUE_TEMPLATE/`).

## License

[MIT](LICENSE) © shahadathhs
