# k6 Load Testing Basics

This document explains the fundamental concepts in k6 load testing, along with common output metrics and interpretations for high or low values.

## 1. Virtual Users (VUs)

- **Definition**: Virtual Users (VUs) simulate real users interacting with the application by running scripts that emulate actions such as making requests, waiting for responses, and performing tasks.
- **Configuration**: The number of VUs defines the concurrent load on the system.
- **Example**:

  ```ts
  export const options = {
    vus: 10, // 10 concurrent virtual users
    duration: "30s",
  };
  ```

- **Output Reference**:
  - **`vus`**: Shows the number of active VUs throughout the test, often graphed to show VU changes over time.
  - **`vus_max`**: Indicates the maximum number of VUs reached.
- **Interpretation**:
  - **High VU Count**: Implies a higher load, useful for stress testing. If your system handles high VU counts without degradation in performance, it suggests good scalability.
  - **Low VU Count**: Used in baseline or smoke tests to verify basic application functionality with minimal load.

## 2. Request

- **Definition**: A request is an HTTP call made by a VU to the server, representing how users interact with the application.
- **Details**: Each request can specify HTTP methods (e.g., GET, POST), headers, and payload data.
- **Example**:

  ```ts
  import http from "k6/http";

  export default function () {
    http.get("https://example.com");

    http.post("https://api.example.com/users", JSON.stringify({ name: "k6" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  ```

- **Output Reference**:
  - **`http_reqs`**: Total number of requests sent during the test, indicating demand placed on the server.
  - **`http_req_duration`**: Average duration of each request, showing the time taken for a full request-response cycle.
  - **`http_req_failed`**: Number or percentage of failed requests, signaling potential issues.
- **Interpretation**:
  - **High Request Count**: Indicates that the application can handle large volumes of requests; however, if accompanied by high error rates, it may signal instability under load.
  - **Low Request Count**: Indicates light load or short tests. If low counts accompany high failure rates, it may indicate problems at low loads.
  - **High `http_req_duration`**: Suggests slow response times, indicating a performance bottleneck or server overload.
  - **High `http_req_failed`**: Indicates issues with reliability or server errors, often related to improper configuration or capacity constraints.

## 3. Latency

- **Definition**: Latency measures the time taken for a request to reach the server and for the first byte of the response to arrive back, also called time-to-first-byte (TTFB).
- **Example**:

  ```
  http_req_waiting...............: avg=120ms min=90ms  med=118ms max=1.2s
  http_req_connecting............: avg=12ms  min=1ms   med=8ms   max=150ms
  ```

- **Output Reference**:
  - **`http_req_waiting`**: Latency time, showing the server’s response time before sending the first byte.
  - **`http_req_connecting`**: Time taken to establish a connection, useful for understanding network delays.
- **Interpretation**:
  - **High Latency**: Indicates network or server delays; may suggest server overload, resource bottlenecks, or suboptimal network paths.
  - **Low Latency**: Indicates a highly responsive server; generally desirable but can also signify a light load.

## 4. Throughput

- **Definition**: Throughput is the amount of data processed by the server per unit of time, often measured in requests per second (RPS). It reflects the system's ability to handle concurrent load.
- **Example**:

  ```
  http_reqs......................: 160    14.68/s
  iteration_duration.............: avg=1.35s min=1.0s med=1.27s max=1.95s
  ```

- **Output Reference**:
  - **`iteration_duration`**: Duration of each iteration, helping calculate average throughput across VUs.
  - **`http_reqs` per second**: Used to assess requests per second (RPS), often labeled as "Throughput."
- **Interpretation**:
  - **High Throughput**: Indicates high processing capacity and good performance under load; however, if accompanied by high latency, it may point to an overloaded system.
  - **Low Throughput**: Could indicate limited server capacity, throttling, or bottlenecks. It’s generally acceptable in low-load tests but can be a concern under stress conditions.

## 5. Iterations

- **Definition**: An iteration is a complete execution of the test script by a VU. Each VU can perform multiple iterations based on test duration or iteration count settings.
- **Example**:

  ```ts
  export const options = {
    vus: 10,
    duration: "10s",
  };
  // Each VU loops the default function until time is up —
  // "iterations" counts the full loops all VUs completed together.
  ```

  ```
  iterations.....................: 80     7.34/s
  iteration_duration.............: avg=1.35s min=1.0s med=1.27s max=1.95s
  ```

- **Output Reference**:
  - **`iterations`**: Total number of completed iterations, reflecting the total test cycles performed.
  - **`iteration_duration`**: Duration of each iteration, helping identify slow or time-consuming areas in the test.
- **Interpretation**:
  - **High Iteration Count**: Implies that VUs can complete multiple cycles quickly, indicating efficient execution under load. However, if iteration times are high, it might indicate an overextended load or insufficient resources.
  - **Low Iteration Count**: Could signal long-running operations or bottlenecks in the script, possibly resulting in fewer completed cycles under heavier loads.

## 6. Checks

- **Definition**: Assertions inside the test code that verify each response behaves as expected — status codes, body content, headers. Every check passes or fails per iteration and feeds the `checks` metric. Checks never fail the test by themselves; they report behavior.
- **Example**:

  ```ts
  check(res, {
    "status is 200": (r) => r.status === 200,
    "body has content": (r) => r.body.includes("Welcome"),
  });
  ```

- **Output Reference**:
  - **`checks`**: The rate (and count) of passed checks across the whole test, e.g. `98.50% ✓ 197 ✗ 3`.
- **Interpretation**:
  - **High check rate**: The system is not just fast but _correct_ under load.
  - **Falling check rate as load rises**: Functional breakage under stress — often more alarming than slow responses, because users are getting broken answers.

## 7. Thresholds

- **Definition**: Pass/fail criteria bound to metrics. If any threshold is crossed, k6 exits with a non-zero exit code — this is what makes a load test automatable in CI instead of just producing numbers.
- **Example**:

  ```ts
  export const options = {
    thresholds: {
      http_req_duration: ["p(95)<500"], // 95th percentile under 500ms
      http_req_failed: ["rate<=0.02"], // at most 2% failed requests
      checks: ["rate>=0.98"], // at least 98% of checks pass
    },
  };
  ```

- **Output Reference**: threshold results appear in the summary prefixed with `✓` (met) or `✗` (crossed); a crossed threshold fails the whole run.
- **Interpretation**:
  - **Thresholds met (`✓`)**: The system satisfied the performance budget under that load profile.
  - **Thresholds crossed (`✗`)**: An SLO breach — the non-zero exit code lets CI gates, alerts, and scripts react automatically.

## 8. Scenarios & Executors

- **Definition**: A scenario describes _how_ VUs are scheduled over time; the executor is the scheduling engine behind it. The simple `vus`/`duration` and `stages` options are shorthand for the `shared-iterations` and `ramping-vus` executors.
- **Configuration styles**:

  ```ts
  export const options = {
    vus: 10,
    duration: "10s", // constant load
    stages: [{ duration: "10s", target: 10 }], // ramped load
    scenarios: {
      // explicit form — and multiple scenarios can run at once
      my_scenario: { executor: "constant-arrival-rate", rate: 50, timeUnit: "1s" },
    },
  };
  ```

- **Output Reference**:
  - The progress bar and summary are grouped per scenario, e.g. `default ✓ [====] 10 VUs 10s`.
  - The `k6/execution` module exposes the live scenario context inside a script — `exec.scenario.iterationInTest`, `.executor`, `.name`, and more.
  - **`gracefulRampDown` / `gracefulStop`** (default 30s each): after a stage ends or the test stops, in-flight iterations get this long to finish before being interrupted — which is why a "1m" staged test can take ~1m30s wall-clock time.
- **Interpretation**:
  - **Multiple scenarios**: each reports its own metric subsets — compare them to see how different traffic shapes stress the system differently.
  - **Interrupted iterations**: iterations cut off by the graceful timeouts are reported separately — a large number means iterations are too long for the schedule.

## 9. Test Lifecycle (Init Context)

> The full execution model — every export k6 picks up, the run order, and the
> mental model — is covered in depth in [SCRIPTING.md](SCRIPTING.md).

- **Definition**: k6 runs a script in two phases. **Init code** — top-level statements, imports, the exported `options` — runs **once per VU** before any traffic. The **default function** then runs once per iteration. Exported `setup()` and `teardown()` run once per test, before and after all VUs.
- **Why it matters**:
  - Reading configuration (like env vars) belongs in init code — it is evaluated once and stays constant for the whole run.
  - The default function should be lean: every line in it executes thousands of times.
  - Some APIs (like `open()`) work only in init code — a common beginner error is calling them inside the default function.

## 10. Test Types at a Glance

| Type       | Profile                      | Answers                                         |
| ---------- | ---------------------------- | ----------------------------------------------- |
| Smoke      | 1 VU, seconds                | "Does it work at all?"                          |
| Load       | Ramp → hold at expected peak | "Can we handle a normal day?"                   |
| Stress     | Ramp beyond expected peak    | "Where does it start hurting?"                  |
| Soak       | Peak sustained for hours     | "Does it degrade over time (leaks, GC, pools)?" |
| Spike      | Sudden burst, instant drop   | "Do we survive and recover from flashes?"       |
| Breakpoint | Ramp until it breaks         | "What is the hard ceiling?"                     |

## 11. Reading the End-of-Test Summary

```
http_req_duration..........: avg=135ms med=128ms max=1.2s  p(90)=200ms p(95)=264ms
http_req_failed............: 0.00%  0 out of 160
http_reqs..................: 160    14.68/s
checks.....................: 100.00% ✓ 320 ✗ 0
```

- **`avg` lies, `med` and percentiles don’t**: one slow outlier drags the average up while most users are fine. Read `p(95)` (or `p(90)`) as "the experience of your slowest 5% (10%) of users" — that is usually what an SLO should be written against.
- **`http_req_failed`**: count _and_ rate. A 0.5% failure rate sounds small until you see it is 500 requests.
- **`http_reqs` rate**: achieved throughput (req/s) — compare it to the VU count to see whether VUs are blocked on latency (few req/s per VU) or streaming requests.
- **Exit code**: `0` = all thresholds met; non-zero = at least one crossed (or the run errored). This is the contract CI uses.
