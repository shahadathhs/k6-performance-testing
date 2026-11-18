import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

import { BASE_URL } from "../lib/config.ts";

export const options: Options = {
  vus: 10,
  duration: "10s",
};

export default function (): void {
  http.get(`${BASE_URL}/`);
  sleep(1);
}
