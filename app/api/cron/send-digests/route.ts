import { NextResponse } from "next/server";

import { deliverDigestNow } from "@/lib/digest/delivery";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface SubscriberRow {
  id: string;
  email: string;
  frequency: "daily" | "weekly";
  last_sent_at: string | null;
}

interface PreferenceRow {
  topics: string;
  github_language: string;
  subreddits: string;
  max_items: number;
}

function shouldSendNow(subscriber: SubscriberRow): boolean {
  if (!subscriber.last_sent_at) return true;

  const last = new Date(subscriber.last_sent_at).getTime();
  const now = Date.now();
  const diff = now - last;
  const oneDay = 1000 * 60 * 60 * 24;

  if (subscriber.frequency === "weekly") {
    return diff >= oneDay * 7;
  }

  return diff >= oneDay;
}

export async function POST(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseServerClient();

    const { data: subscribers, error: subscribersError } = await supabase
      .from("subscribers")
      .select("id, email, frequency, last_sent_at")
      .eq("status", "active");

    if (subscribersError) {
      return NextResponse.json({ error: subscribersError.message }, { status: 500 });
    }

    const rows = (subscribers ?? []) as SubscriberRow[];
    const dueSubscribers = rows.filter(shouldSendNow);

    let sent = 0;
    let failed = 0;

    for (const subscriber of dueSubscribers) {
      try {
        const { data: preference, error: preferenceError } = await supabase
          .from("preferences")
          .select("topics, github_language, subreddits, max_items")
          .eq("subscriber_id", subscriber.id)
          .maybeSingle();

        if (preferenceError) {
          throw new Error(preferenceError.message);
        }

        const pref = (preference ?? {
          topics: "",
          github_language: "",
          subreddits: "programming, webdev, startups",
          max_items: 5,
        }) as PreferenceRow;

        const { summary } = await deliverDigestNow({
          email: subscriber.email,
          frequency: subscriber.frequency,
          topics: pref.topics,
          githubLanguage: pref.github_language,
          subreddits: pref.subreddits,
          maxItems: pref.max_items,
        });

        await supabase.from("digest_runs").insert({
          subscriber_id: subscriber.id,
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
          .eq("id", subscriber.id);

        sent += 1;
      } catch (error) {
        failed += 1;
        await supabase.from("digest_runs").insert({
          subscriber_id: subscriber.id,
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unexpected error",
        });
      }
    }

    return NextResponse.json({
      data: {
        processed: dueSubscribers.length,
        sent,
        failed,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
