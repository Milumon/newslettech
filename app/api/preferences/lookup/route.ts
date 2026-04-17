import { NextResponse } from "next/server";

import { preferencesEmailSchema } from "@/lib/preferences/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email") ?? "";
    const parsed = preferencesEmailSchema.safeParse({ email });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    const { data: subscriber, error: subscriberError } = await supabase
      .from("subscribers")
      .select("id, email, frequency")
      .eq("email", parsed.data.email.toLowerCase())
      .maybeSingle();

    if (subscriberError) {
      return NextResponse.json({ error: subscriberError.message }, { status: 500 });
    }

    if (!subscriber) {
      return NextResponse.json({ data: null });
    }

    const { data: preferences, error: preferencesError } = await supabase
      .from("preferences")
      .select("topics, github_language, subreddits, max_items")
      .eq("subscriber_id", subscriber.id)
      .maybeSingle();

    if (preferencesError) {
      return NextResponse.json({ error: preferencesError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        email: subscriber.email,
        frequency: subscriber.frequency,
        topics: preferences?.topics ?? "",
        githubLanguage: preferences?.github_language ?? "",
        subreddits: preferences?.subreddits ?? "",
        maxItems: preferences?.max_items ?? 5,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
