/**
 * JSON — parsing responses and correlating values into the next request
 *
 * What:  `res.json()` parses the body; give it a JSON selector string and
 *        it extracts one nested value instead of the whole tree. Once a
 *        value is in a variable, feed it into the NEXT request — that's
 *        CORRELATION, the backbone of every realistic API test.
 * Why:   real user journeys are chains: search → pick an id → open it →
 *        act on it. Without correlation you're testing disconnected
 *        endpoints; with it, you're testing flows.
 * Watch: the log — one response's value (a quote string, a count) used
 *        verbatim in the following request URL and check.
 */
import { check } from "k6";
import http from "k6/http";

import { BASE_URL } from "../lib/config.ts";

export default function (): void {
  // ── parse the whole body ─────────────────────────────────────────
  const quotesRes = http.get(`${BASE_URL}/api/quotes`);

  // json() is typed JSONValue — TS can't know the shape (any JSON, or
  // null). Assert the shape for the compiler, and CHECK it at runtime:
  // a malformed response should fail the test loudly, not crash it.
  const data = quotesRes.json() as { quotes: string[] };
  check(quotesRes, { "response is a quotes list": () => Array.isArray(data.quotes) });

  const count = data.quotes.length;
  console.info(`got ${count} quotes`);

  // ── extract one nested value with a selector string ─────────────
  const first = quotesRes.json("quotes.0"); // first element of the array
  console.info(`first quote: ${String(first).slice(0, 50)}…`);

  // ── correlation: response value → what you do next ───────────────
  // The COUNT from one response drives how we read the NEXT one — the
  // same response-drives-request idea that powers "create → grab id →
  // GET it" in crud.ts.
  const namesRes = http.get(`${BASE_URL}/api/names`);
  const names = namesRes.json("names") as string[];
  const chosen = names[count % names.length]; // index decided by earlier response
  console.info(`picked name by response-driven index: ${chosen}`);

  check(namesRes, {
    "parsed a non-empty list": () => Array.isArray(names) && names.length > 0,
    "picked a name from the other response": () => typeof chosen === "string",
  });
}
