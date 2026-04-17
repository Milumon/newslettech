import { Resend } from "resend";

import { buildDigest } from "@/lib/digest/build-digest";
import { summarizeDigestWithGemini } from "@/lib/digest/gemini";
import { createScheduledDigestEmailHtml } from "@/lib/digest/scheduled-email";

type DeliveryFrequency = "daily" | "weekly";

export interface DeliveryInput {
  email: string;
  frequency: DeliveryFrequency;
  topics: string;
  githubLanguage: string;
  subreddits: string;
  maxItems: number;
}

export async function prepareDigestEmail(input: DeliveryInput) {
  const digest = await buildDigest({
    topics: input.topics,
    githubLanguage: input.githubLanguage,
    githubSince: input.frequency === "weekly" ? "weekly" : "daily",
    subreddits: input.subreddits,
    maxItems: input.maxItems,
  });

  const summary = await summarizeDigestWithGemini(digest);
  const html = createScheduledDigestEmailHtml(digest, summary);

  return {
    digest,
    summary,
    html,
  };
}

export async function deliverDigestNow(input: DeliveryInput) {
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;

  if (!resendKey || !resendFrom) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
  }

  const { digest, summary, html } = await prepareDigestEmail(input);

  const resend = new Resend(resendKey);
  const result = await resend.emails.send({
    from: resendFrom,
    to: input.email,
    subject: "Tu resumen de Newslettech",
    html,
  });

  if (result.error) {
    throw new Error(result.error.message || "Email send failed");
  }

  return {
    digest,
    summary,
  };
}
