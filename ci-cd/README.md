# CI/CD — k6 in Jenkins pipelines (the cookbook)

The CI contract in one sentence: **thresholds decide, the exit code tells
the pipeline.** `k6 run` exits `0` when all thresholds pass and non-zero
when any crosses — Jenkins only needs to run k6 and check that code.

Everything in this folder runs fully local: the load targets the
self-hosted QuickPizza service from `compose.yaml` — no public
instances, no cloud services.

In this folder:

- [`ci-gate.ts`](ci-gate.ts) — the gate pipelines run: 5 VUs · 15s, strict thresholds
- [`Jenkinsfile`](Jenkinsfile) — k6 on the agent (the local compose Jenkins bakes it in)
- [`Jenkinsfile.docker`](Jenkinsfile.docker) — k6 in the official `grafana/k6` container (no install)
- [`jenkins.Dockerfile`](jenkins.Dockerfile) — Jenkins LTS + k6 image behind the compose `jenkins` service

## Exit codes

The whole CI contract is k6's exit code, so it's worth memorizing.
Verified empirically on k6 v2.4.0:

| Exit code | Meaning                       | What the pipeline sees      |
| --------- | ----------------------------- | --------------------------- |
| `0`       | success — thresholds met      | green build                 |
| `99`      | threshold(s) crossed          | red build — perf regression |
| `107`     | uncaught script exception     | red build — stack trace     |
| `108`     | test aborted (`test.abort()`) | red build                   |
| `255`     | script file not found         | red build — path typo       |

Watch the contract live against the self-hosted target:

```sh
k6 run ci-cd/ci-gate.ts                        # exit 0 — green
POISON=true k6 run ci-cd/ci-gate.ts; echo $?   # exit 99 — red
```

## Local Jenkins (docker compose)

The repo ships an opt-in Jenkins service (a compose profile — `make up`
still starts only QuickPizza). `make setup` provisions it too:

```sh
make jenkins   # build + start → http://localhost:8080
```

First-time setup in the browser:

1. Unlock: `docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword`
2. Install suggested plugins, create the admin user
3. New Item → **Pipeline** → pick one of the two options below

**Option A — paste-in job (fastest, works without pushing):** Pipeline
script:

```groovy
pipeline {
    agent any
    environment {
        BASE_URL = 'http://quickpizza:3333' // QuickPizza service from compose.yaml
    }
    stages {
        stage('k6') {
            steps {
                sh 'k6 run /repo/ci-cd/ci-gate.ts --quiet'
            }
        }
    }
}
```

`/repo` is your checkout, bind-mounted read-only into the Jenkins
container — local edits are picked up as-is, no git push needed.

**Option B — Pipeline script from SCM (the real thing):** SCM: Git →
your repo URL → Script Path: `ci-cd/Jenkinsfile`. Runs the committed
pipeline verbatim — push your changes first, since Jenkins checks out
from GitHub, not your disk.

Stop it with everything else: `make down`.

## Installing k6 on the agent

The compose Jenkins image already contains k6
([jenkins.Dockerfile](jenkins.Dockerfile)). For a Jenkins installed
directly on a machine: `brew install k6` (macOS), the official apt/dnf
repo (Linux), choco/scoop (Windows). The
[Docker variant](Jenkinsfile.docker) needs no install at all.

### Freestyle job

New Item → Freestyle project → Build → Execute shell:

```sh
k6 run ci-cd/ci-gate.ts --quiet
```

Same exit-code contract: a non-zero exit marks the build FAILED; the
end-of-test summary in the console log carries the threshold table.

### Docker agent

[`Jenkinsfile.docker`](Jenkinsfile.docker) runs the k6 stage in
`grafana/k6:2.4.0`:

- `args '--entrypoint=""'` clears the image's `k6` ENTRYPOINT so the `sh`
  step controls the whole command line
- `reuseNode true` keeps the checkout's workspace visible inside the container
- the spawned k6 container is not on the compose network — it reaches
  QuickPizza via the host's published port (`host.docker.internal:3333`)
- caveat: a Jenkins _inside_ a container cannot hand its workspace (a
  named volume) to the docker daemon — k6 exits 255, script not found.
  Run this variant from a host-installed Jenkins.

## Target selection

Pipelines set `BASE_URL` in their `environment` block; the scenario
reads it through [`lib/config.ts`](../lib/config.ts). Local map:

| Where k6 runs                     | BASE_URL                           |
| --------------------------------- | ---------------------------------- |
| your machine                      | `http://localhost:3333`            |
| compose Jenkins container         | `http://quickpizza:3333`           |
| a container spawned by the daemon | `http://host.docker.internal:3333` |

## Other CI platforms

GitHub Actions — the same contract (install k6, run the gate), fully
local: the job starts its own QuickPizza target.

```yaml
# .github/workflows/k6-gate.yml
name: k6 gate
on:
  push:
    branches: [main]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start the QuickPizza target
        run: docker compose up -d quickpizza
      - uses: grafana/setup-k6-action@v1
      - uses: grafana/run-k6-action@v1
        with:
          path: ci-cd/ci-gate.ts
        env:
          BASE_URL: http://localhost:3333
```

This repo's existing [`ci.yml`](../.github/workflows/ci.yml) gates
lint/typecheck — a job like the above adds the performance gate next to it.

## Official documentation

- Options reference (flags, env vars, defaults):
  <https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/>
- `grafana/setup-k6-action`: <https://github.com/grafana/setup-k6-action>
