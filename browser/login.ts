/**
 * BROWSER (UI) TESTING — a real Chromium drives the page, not http.get()
 *
 * What:  k6 launches a local Chromium and the VU interacts with it like a
 *        user: open QuickPizza's login page, fill the form, submit, wait
 *        for the navigation, screenshot the result — checking the rendered
 *        header before and after login. This is END-TO-END testing: JS
 *        execution, redirects, cookies and layout are all real.
 * Why:   http.get() can only tell you a page RESPONDS, not that it works.
 *        Browser tests catch broken client-side JS, bad redirects and
 *        rendering failures. They're slow (seconds per iteration), so
 *        they run a handful of iterations — pair them with load-test.ts,
 *        don't replace it.
 * Watch: the screenshot in ./screenshots/ (relative to where you run k6)
 *        showing the logged-in page. Checks assert the header is "Login"
 *        before submitting and "Welcome, admin!" after. Cookies would
 *        survive across iterations of the same VU — clearCookies() resets
 *        them so every iteration starts logged out.
 *
 * Target: the self-hosted QuickPizza via BASE_URL (lib/config.ts) — its
 *         demo login app lives at /my_messages.php, so the flow runs
 *         fully local. Needs a local Chrome/Chromium (k6 finds it;
 *         K6_BROWSER_PATH overrides).
 * Import: k6/browser — the graduated module (k6/experimental/browser is
 *         REMOVED in current k6). locator().textContent() is async here:
 *         await it before comparing, Promise === string is always false.
 */
import { check } from "k6";
import { browser } from "k6/browser";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  scenarios: {
    ui: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 3,
      options: {
        browser: {
          type: "chromium",
          headless: true, // flip to false to watch the browser work
        },
      },
    },
  },
};

export default async function (): Promise<void> {
  const page = await browser.newPage();
  await page.context().clearCookies(); // start logged out, every iteration
  await page.goto(`${BASE_URL}/my_messages.php`);

  // textContent() is a Promise in the graduated API — await it first
  const loginHeader = await page.locator("body > h2").textContent();
  check(loginHeader, { "header is the login form": (h) => h === "Login" });

  await page.locator('input[name="login"]').type("admin");
  await page.locator('input[name="password"]').type("123");
  await page.locator("input[type=submit]").click();
  await page.waitForNavigation();

  const welcomeHeader = await page.locator("body > h2").textContent();
  check(welcomeHeader, {
    "header is Welcome, admin!": (h) => h === "Welcome, admin!",
  });

  await page.screenshot({ path: "screenshots/authenticated.png" });
  await page.close();
}
