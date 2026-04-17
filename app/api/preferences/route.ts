import { NextResponse } from "next/server";

import { deliverDigestNow } from "@/lib/digest/delivery";
import { preferencesSchema } from "@/lib/preferences/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = preferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.rpc("upsert_subscriber_preferences", {
      p_email: parsed.data.email,
      p_frequency: parsed.data.frequency,
      p_topics: parsed.data.topics,
      p_github_language: parsed.data.githubLanguage,
      p_subreddits: parsed.data.subreddits,
      p_max_items: parsed.data.maxItems,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const subscriberId = String(data);

    const { summary } = await deliverDigestNow({
      email: parsed.data.email,
      frequency: parsed.data.frequency,
      topics: parsed.data.topics,
      githubLanguage: parsed.data.githubLanguage,
      subreddits: parsed.data.subreddits,
      maxItems: parsed.data.maxItems,
    });

    await supabase.from("digest_runs").insert({
      subscriber_id: subscriberId,
      status: "success",
      payload: {
        sectionSummaries: summary.sectionSummaries,
        quickScanSummary: summary.quickScanSummary,
        actionItems: summary.actionItems,
      },
    });

    await supabase
      .from("subscribers")
      .update({ last_sent_at: new Date().toISOString() })
      .eq("id", subscriberId);

    return NextResponse.json({
      data: {
        subscriberId,
        nextDelivery: parsed.data.frequency,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
