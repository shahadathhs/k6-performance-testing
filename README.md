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

| Tool                                                         | Why                                     | Manual install                                                                                                                |
| ------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [k6 CLI](https://grafana.com/docs/k6/latest/set-up/install/) | runs scenarios directly                 | `brew install k6`                                                                                                             |
| Node.js ≥ 20 + pnpm 10                                       | workspace tooling (types, lint, format) | `brew install node` + `corepack enable`                                                                                       |
| Docker                                                       | hosts the QuickPizza test target        | [Docker Desktop](https://www.docker.com/products/docker-desktop/) · [Engine (Linux)](https://docs.docker.com/engine/install/) |
| git + Make                                                   | basics                                  | `xcode-select --install` (macOS) · `sudo apt install build-essential` (Linux)                                                 |

## Quick start

```bash
git clone https://github.com/shahadathhs/k6-performance-testing.git
cd k6-performance-testing

make setup                 # prerequisites + deps + QuickPizza target
k6 run intro/smoke-test.ts # or: make run s=intro/smoke-test.ts
```

## Scenario gallery

Intro-course scenarios live in [`intro/`](intro/) and target the self-hosted
QuickPizza service from [`compose.yaml`](compose.yaml) — the shared
[`lib/config.ts`](lib/config.ts) reads a `BASE_URL` env override for pointing
at another instance.

| Scenario                                       | Command                               | Profile             | Verifies                                     |
| ---------------------------------------------- | ------------------------------------- | ------------------- | -------------------------------------------- |
| [first-script.ts](intro/first-script.ts)       | `make run s=intro/first-script.ts`    | 10 VUs · 10s        | hello world                                  |
| [smoke-test.ts](intro/smoke-test.ts)           | `make run s=intro/smoke-test.ts`      | 1 VU · 30s          | target works at all                          |
| [load-test.ts](intro/load-test.ts)             | `make run s=intro/load-test.ts`       | 10→0 VUs · 1m       | normal peak behavior                         |
| [soak-test.ts](intro/soak-test.ts)             | `make run s=intro/soak-test.ts`       | 1000 VUs · **24h**  | long-run leaks/degradation                   |
| [breakpoint-test.ts](intro/breakpoint-test.ts) | `make run s=intro/breakpoint-test.ts` | →10000 VUs · **2h** | system ceiling                               |
| [spike-test.ts](intro/spike-test.ts)           | `make run s=intro/spike-test.ts`      | 10000→0 VUs · 3m    | burst + recovery                             |
| [thresholds.ts](intro/thresholds.ts)           | `make run s=intro/thresholds.ts`      | 10 VUs · 10s        | pass/fail criteria (p95, error rate, checks) |

⚠️ Soak and breakpoint scenarios run for hours — never point them at a system
you don't own.

## Commands

| Make             | pnpm             | What it does                      |
| ---------------- | ---------------- | --------------------------------- |
| `make install`   | `pnpm install`   | install workspace deps            |
| `make up`        | —                | start self-hosted QuickPizza      |
| `make down`      | —                | stop QuickPizza + containers      |
| `make lint`      | `pnpm lint`      | oxlint + `prettier --check`       |
| `make format`    | `pnpm format`    | write formatting                  |
| `make typecheck` | `pnpm typecheck` | `tsc --noEmit` over all scenarios |
| `make check`     | —                | lint + typecheck (the CI gate)    |
| `make run s=…`   | `k6 run …`       | run any scenario                  |
| `make version`   | `k6 version`     | installed k6 version              |
| `make help`      | —                | list all targets                  |

## Running scenarios

k6 runs **directly on your machine** — every CLI flag is at your fingertips:

```sh
k6 run intro/smoke-test.ts                                  # basic run
k6 run --http-debug intro/thresholds.ts                      # dump requests
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
├── intro/              # intro-course scenarios (TypeScript, runnable as-is)
├── lib/                # shared config/helpers imported by all scenarios
├── packages/           # future shared helpers as pnpm workspace members
├── compose.yaml        # self-hosted QuickPizza test target
├── docs/               # concept notes (metrics, VUs, throughput…)
└── .github/            # CI, PR/issue templates, dependabot
```

## Docs

- [docs/BASICS.md](docs/BASICS.md) — k6 load-testing fundamentals: VUs,
  requests, latency, throughput, iterations, checks, thresholds, scenarios,
  and how to read the end-of-test summary.

## Contributing

PRs and issues are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) to get
started, and open an issue first for bigger scenario ideas. Bug reports use
the issue templates (`.github/ISSUE_TEMPLATE/`).

## License

[MIT](LICENSE) © shahadathhs
