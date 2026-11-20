/**
 * RANDOM ITEM — picking from a live response (randomized correlation)
 *
 * What:  `randomItem(array)` picks a random element — here applied to a
 *        list that came from a PREVIOUS response, not a static one.
 * Why:   real users don't always open item #1. Hitting one hard-coded id
 *        tests a cache; hitting random ids tests the system. This is
 *        correlation (http-requests/json.ts) plus randomization — the
 *        pattern behind realistic browse/search workloads.
 * Watch: the composed pizza name in the log — a random adjective + a
 *        random name, recombined every iteration (this is literally what
 *        QuickPizza's homepage does).
 */
import { check } from "k6";
import http from "k6/http";

import { BASE_URL } from "../lib/config.ts";
import { randomItem } from "../lib/jslib.ts";

export const options = {
  vus: 2,
  duration: "8s",
};

export default function (): void {
  // fetch two live arrays…
  const names = http.get(`${BASE_URL}/api/names`).json("names") as string[];
  const adjectives = http.get(`${BASE_URL}/api/adjectives`).json("adjectives") as string[];

  // …and pick a random element from each
  const pizzaName = `${randomItem(adjectives)} ${randomItem(names)}`;
  console.info(`today's pizza: ${pizzaName}`);

  check(null, {
    "composed a name from two random picks": () => pizzaName.trim().length > 0,
  });
}
