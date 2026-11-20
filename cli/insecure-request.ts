/**
 * INSECURE REQUESTS — when the target's TLS can't be verified
 *
 * What:  k6 verifies TLS certificates by default, like a browser should.
 *        A self-signed, expired, or wrong-host certificate makes the
 *        request FAIL — unless you explicitly opt out with
 *        `--insecure-skip-tls-verify` (or `tlsInsecure: true` in
 *        options). This script targets badssl.com — a public site built
 *        exactly for practicing these failure modes.
 * Why:   test environments often ship self-signed certs (local stacks,
 *        internal staging). You need to know: (a) why it fails, (b) the
 *        exact, EXPLICIT way to allow it, and (c) that skipping
 *        verification is a scoped decision — never a global habit, and
 *        never against production.
 * Try:
 *        k6 run cli/insecure-request.ts
 *          → transport error (TLS verification refuses the self-signed cert)
 *        k6 run --insecure-skip-tls-verify cli/insecure-request.ts
 *          → 200 OK from self-signed.badssl.com
 * Watch: res.error — a TLS failure is a TRANSPORT error (not a status
 *        code); the check below tells the two apart. badssl can be flaky
 *        from some networks (connection resets) — rerun if that happens.
 */
import { check } from "k6";
import { sleep } from "k6";
import http from "k6/http";

// badssl.com is a public service for TLS failure-mode practice — the one
// external target in this repo that isn't our own QuickPizza.
const URL = "https://self-signed.badssl.com/";

export default function (): void {
  // badssl resets connections intermittently from some networks, so give
  // the request a few attempts. Note what this can and can't fix:
  // WITHOUT the flag every attempt fails (cert rejection is
  // deterministic); WITH it, a reset or two still gets through.
  let res = http.get(URL);
  for (let attempt = 1; attempt <= 3 && res.error; attempt++) {
    console.info(`attempt ${attempt} failed (${res.error}) — retrying`);
    sleep(2);
    res = http.get(URL);
  }

  if (res.error) {
    console.info(`still failing: ${res.error}`);
  }

  check(res, {
    "TLS allowed & status 200 (needs the flag)": (r) => !res.error && r.status === 200,
  });
  sleep(1);
}
