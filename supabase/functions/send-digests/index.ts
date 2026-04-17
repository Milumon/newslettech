// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const appUrl = Deno.env.get("NEXT_APP_URL");

  if (!cronSecret || !appUrl) {
    return new Response(
      JSON.stringify({ error: "Missing CRON_SECRET or NEXT_APP_URL" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const target = `${appUrl.replace(/\/$/, "")}/api/cron/send-digests`;

  const upstream = await fetch(target, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
});
