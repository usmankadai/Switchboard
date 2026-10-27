import { parseFunnelEvent } from "@/lib/monitoring/funnel";

/** A funnel event is tiny; anything bigger is not one of ours. */
const MAX_BODY_BYTES = 512;

/**
 * Receives anonymous funnel events and writes each as one JSON line to the
 * server logs, where a log drain or query can build the funnel. Events are
 * checked against strict allow-lists, so nothing personal can be logged.
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

  console.log(JSON.stringify({ type: "funnel", ...event, at: new Date().toISOString() }));
  return new Response(null, { status: 204 });
}
