/**
 * GET /api/sse?userId=<userId>&role=<role>
 *
 * Server-Sent Events endpoint.
 * Citizens receive events for their own FIRs.
 * Police/admin receive all FIR creation and status-change events.
 *
 * Event format (SSE):
 *   data: {"type":"fir-update","payload":{...}}\n\n
 *   data: {"type":"new-fir","payload":{...}}\n\n
 *   data: {"type":"ping"}\n\n   (keepalive every 20s)
 */
import emitter, { type FIRUpdateEvent, type NewFIREvent } from "@/lib/sse-emitter";
import { initContractEventListener } from "@/lib/blockchain";

export const dynamic = "force-dynamic"; // never cache this route

// Bridge on-chain contract events → SSE emitter (once per process)
try { initContractEventListener(); } catch { /* blockchain node may be offline */ }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const role = searchParams.get("role") || "citizen";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Connection already closed
        }
      };

      // ── FIR status changed ──────────────────────────────────────────────────
      const onFIRUpdate = (payload: FIRUpdateEvent) => {
        // Citizens only see updates for their own FIRs
        if (role === "citizen" && payload.citizenId !== userId) return;
        send({ type: "fir-update", payload });
      };

      // ── New FIR submitted ──────────────────────────────────────────────────
      const onNewFIR = (payload: NewFIREvent) => {
        // Only police and admin need to be notified of new submissions
        if (role !== "police" && role !== "admin") return;
        send({ type: "new-fir", payload });
      };

      emitter.on("fir-update", onFIRUpdate);
      emitter.on("new-fir", onNewFIR);

      // ── Keepalive ping every 20 seconds ────────────────────────────────────
      const ping = setInterval(() => send({ type: "ping" }), 20_000);

      // ── Send initial connection confirmation ────────────────────────────────
      send({ type: "connected", userId, role });

      // ── Cleanup on disconnect ───────────────────────────────────────────────
      req.signal.addEventListener("abort", () => {
        emitter.off("fir-update", onFIRUpdate);
        emitter.off("new-fir", onNewFIR);
        clearInterval(ping);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}
