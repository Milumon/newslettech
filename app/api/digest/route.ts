import { NextResponse } from "next/server";

import { buildDigest } from "@/lib/digest/build-digest";
import { digestPreferencesSchema } from "@/lib/digest/preferences";

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = digestPreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const digest = await buildDigest(parsed.data);
    return NextResponse.json({ data: digest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
