import { NextResponse } from "next/server";
import { Resend } from "resend";

import { createDigestEmailHtml } from "@/lib/digest/email-template";
import { sendDigestSchema } from "@/lib/digest/preferences";

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = sendDigestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !from) {
      return NextResponse.json(
        { error: "Missing RESEND_API_KEY or RESEND_FROM_EMAIL" },
        { status: 500 },
      );
    }

    const resend = new Resend(apiKey);
    const emailHtml = createDigestEmailHtml(parsed.data.digest);

    const result = await resend.emails.send({
      from,
      to: parsed.data.email,
      subject: "Your Newslettech digest",
      html: emailHtml,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
