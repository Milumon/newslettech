import { NextResponse } from "next/server";

import { prepareDigestEmail } from "@/lib/digest/delivery";
import { preferencesSchema } from "@/lib/preferences/schema";

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = preferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const prepared = await prepareDigestEmail({
      email: parsed.data.email,
      frequency: parsed.data.frequency,
      topics: parsed.data.topics,
      githubLanguage: parsed.data.githubLanguage,
      subreddits: parsed.data.subreddits,
      maxItems: parsed.data.maxItems,
    });

    return NextResponse.json({
      data: {
        html: prepared.html,
        overallSummary: prepared.summary.quickScanSummary,
        sectionCount: prepared.summary.sectionSummaries.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
