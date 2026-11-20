/**
 * TOKEN AUTH — register, log in, prove who you are on every request
 *
 * What:  stateless token auth: POST credentials once, receive a token,
 *        then attach it as a header (`Authorization: Token <16 chars>`
 *        for QuickPizza — many APIs use `Bearer <jwt>` instead; same
 *        idea, different word). The server checks the token per request;
 *        it stores no session state.
 * Why:   authenticated endpoints are the ones worth load testing (they're
 *        the expensive paths). QuickPizza needs a token for /api/ratings.
 *        Registration uses a unique username per iteration (__VU/__ITER
 *        globals) — concurrent VUs must never share accounts mid-test.
 * Token vs cookies (the short version — full primer in docs/HTTP.md):
 *        tokens travel in a header, YOU manage them explicitly; cookies
 *        travel in Set-Cookie/Cookie headers, k6's jar manages them
 *        automatically per VU. QuickPizza even supports both
 *        (/api/users/token/login?set_cookie=true returns a session
 *        cookie instead of a token).
 * Note:  registering + logging in EVERY iteration is simple and isolated,
 *        but expensive — for big runs, do it once in setup() instead
 *        (see docs/SCRIPTING.md §6).
 * Course: lessons 49–53 (POST, assignments, token-based authentication).
 */
import { check } from "k6";
import http from "k6/http";

import { BASE_URL } from "../lib/config.ts";

const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

export default function (): void {
  // unique per VU AND per iteration — parallel VUs never collide
  const credentials = {
    username: `k6_${Date.now()}_${__VU}_${__ITER}`,
    password: "secret123",
  };

  // ── 1. register a fresh user ──────────────────────────────────────
  const regRes = http.post(`${BASE_URL}/api/users`, JSON.stringify(credentials), JSON_HEADERS);
  check(regRes, {
    "registered (201 Created)": (r) => r.status === 201,
    "got a user id": (r) => typeof r.json("id") === "number",
  });

  // ── 2. log in → receive a token ───────────────────────────────────
  const loginRes = http.post(
    `${BASE_URL}/api/users/token/login`,
    JSON.stringify(credentials),
    JSON_HEADERS,
  );
  const token = loginRes.json("token"); // 16-char opaque token
  check(loginRes, { "login returned a token": () => typeof token === "string" });
  console.info(`token: ${token}`);

  // ── 3. call an authenticated endpoint — the token goes everywhere ──
  const authHeaders = {
    headers: { Authorization: `Token ${token}` }, // ← the credential
  };

  const ratingsRes = http.get(`${BASE_URL}/api/ratings`, authHeaders);
  check(ratingsRes, {
    "authorized request accepted (200)": (r) => r.status === 200,
  });

  // ── and without it, the door stays closed ─────────────────────────
  const anonRes = http.get(`${BASE_URL}/api/ratings`);
  check(anonRes, {
    "anonymous request rejected (401)": (r) => r.status === 401,
  });
}
