import { parseFunnelEvent } from "@/lib/monitoring/funnel";
import { getFunnelStore, ukDay } from "@/lib/monitoring/funnelStore";

/** A funnel event is tiny; anything bigger is not one of ours. */
const MAX_BODY_BYTES = 512;

/**
 * Receives anonymous funnel events. Each is counted in the funnel store (for
 * the /funnel dashboard) and written as one JSON line to the server logs.
 * Events are checked against strict allow-lists, so nothing personal can be
 * stored or logged.
 */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }

  const event = parseFunnelEvent(body);
  if (!event) return new Response(null, { status: 400 });

  const now = new Date();
  console.log(JSON.stringify({ type: "funnel", ...event, at: now.toISOString() }));

  try {
    await getFunnelStore().record(event, ukDay(now));
  } catch (error) {
    // Analytics must never break the journey: the beacon still succeeds.
    console.error(JSON.stringify({ type: "funnel-store-error", message: String(error) }));
  }
  return new Response(null, { status: 204 });
}
