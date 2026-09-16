import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import type { AppEnv } from "../_lib/env";
import { PUBLICATION_CACHE, machineHeaders } from "../_lib/http";
import { allPublishedRecords, toNdjson } from "../_lib/records";

/** BCP-03 static endpoint: /dumps/gna-115.ndjson */
const app = new Hono<AppEnv>().basePath("/dumps");

app.get("/gna-115.ndjson", async (c) => {
  machineHeaders(c, PUBLICATION_CACHE);
  c.header("Content-Type", "application/x-ndjson; charset=utf-8");
  return c.body(toNdjson(await allPublishedRecords(c.env.DB)));
});

app.notFound((c) => c.json({ error: "Unknown dump." }, 404));

export const onRequest = handle(app);
