/**
 * GROUPS — nested request bundles with their own duration budgets
 *
 * What:  `group("name", fn)` bundles related requests — every sample inside
 *        gets a `group` tag, and the bundle's wall time is measured as the
 *        `group_duration` metric. Groups NEST: "Main page::Assets" is the
 *        full path. Thresholds can target one group's duration with the
 *        `{group:::Name}` selector — including nested paths.
 * Why:   a page is rarely one request: HTML + assets + XHR. Grouping gives
 *        you per-page budgets that match what a user actually experiences,
 *        and nesting separates the page shell from its sub-resources.
 *        (The course used mocky.io 5s/1s delays to make budgets bite;
 *        locally QuickPizza is fast, so the budgets are loose — the syntax
 *        is the point.)
 * Watch: group_duration in the full summary (`--summary-mode=full`) or JSON
 *        output — the compact summary hides it — plus one ✓/✗ per group
 *        threshold below.
 */
import { check, group, sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  vus: 2,
  duration: "8s",
  thresholds: {
    http_req_duration: ["p(95)<500"], // per-request budget
    // per-PAGE budgets — note the triple-colon group selector syntax,
    // and the ::-joined path for the nested group
    "group_duration{group:::Main page}": ["p(95)<1000"],
    "group_duration{group:::Main page::Assets}": ["p(95)<500"],
    "group_duration{group:::News page}": ["p(95)<500"],
    // `group` is itself a BUILT-IN tag on every sample inside a group —
    // it slices any built-in metric, e.g. only the News page's requests:
    "http_reqs{group:::News page}": ["count>0"],
  },
};

export default function (): void {
  group("Main page", () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, { "status is 200": (r) => r.status === 200 });

    // nested group — samples are tagged group="Main page::Assets"
    group("Assets", () => {
      http.get(`${BASE_URL}/api/names`);
      http.get(`${BASE_URL}/api/adjectives`);
    });
  });

  group("News page", () => {
    http.get(`${BASE_URL}/api/quotes`);
  });

  sleep(1);
}
