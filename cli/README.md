# k6 CLI — the cookbook

Load profiles, TLS opt-outs, outputs, and reports — all things you do with
flags rather than scripts. Pair with the scenarios in this folder:

- [`load-flags.ts`](load-flags.ts) — a script with no load options, driven entirely by CLI flags
- [`insecure-request.ts`](insecure-request.ts) — TLS verification opt-out against badssl.com

## VUs, duration & iterations from the CLI

```sh
k6 run cli/load-flags.ts                      # no flags: 1 VU, 1 iteration
k6 run -u 5 -d 10s cli/load-flags.ts          # 5 VUs looping for 10 seconds
k6 run -u 5 -i 10 cli/load-flags.ts           # 10 iterations shared among 5 VUs
k6 run -s 10s:10 -s 20s:10 -s 5s:0 cli/…      # stages: 0→10, hold, →0
```

Flags override the script's `options`, which override k6 defaults
(full precedence chain in [docs/SCRIPTING.md §5](../docs/SCRIPTING.md)).
`-d` and `-i` are alternatives — duration runs "as long as", iterations
run "exactly N".

## Allow insecure requests

k6 verifies TLS certificates by default. Self-signed/expired certs fail
until you opt out, explicitly and per run:

```sh
k6 run cli/insecure-request.ts                        # fails: self-signed cert
k6 run --insecure-skip-tls-verify cli/insecure-request.ts   # 200 OK
```

Also available: `tlsInsecure: true` in the script's `options`, or the
`K6_INSECURE_SKIP_TLS_VERIFY=true` env var. Scoping rule: flag per run >
env per shell > option in the file — prefer the narrowest.

## Output results as JSON

```sh
k6 run --out json=results.json -d 10s intro/load-test.ts
```

Every metric sample, tagged, one JSON object per line (NDJSON) — the raw
material for scripted analysis or `xk6-dashboard` replay.

## The official documentation

- Everything: <https://grafana.com/docs/k6/>
- Options reference (all flags/env vars/options, one table):
  <https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/>
- jslib (the helper library used via `lib/jslib.ts`):
  <https://grafana.com/docs/k6/latest/javascript-api/jslib/>

## Local dashboard & HTML reports

```sh
K6_WEB_DASHBOARD=true k6 run intro/load-test.ts          # live UI at 127.0.0.1:5665
K6_WEB_DASHBOARD_EXPORT=report.html \
  K6_WEB_DASHBOARD=true k6 run cli/load-flags.ts         # + static HTML report
```

The process stays alive while a dashboard tab is open (close it or
Ctrl+C). For headless runs use `K6_WEB_DASHBOARD_PORT=-1` — the export
still works.
