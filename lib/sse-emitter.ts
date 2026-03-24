/**
 * lib/sse-emitter.ts
 * Global in-process event emitter for Server-Sent Events.
 *
 * Uses a module-level singleton (cached in globalThis during dev HMR).
 * Events are emitted from API route handlers and consumed by the SSE endpoint.
 *
 * Limitation: works only in single-instance deployments.
 * For multi-instance (cluster/serverless), replace with Redis pub/sub.
 */
import { EventEmitter } from "events";

// Persist the emitter across Next.js HMR reloads in development
declare global {
  // eslint-disable-next-line no-var
  var _sseEmitter: EventEmitter | undefined;
}

const emitter: EventEmitter = globalThis._sseEmitter ?? new EventEmitter();
emitter.setMaxListeners(200); // support up to 200 concurrent SSE connections

if (process.env.NODE_ENV !== "production") {
  globalThis._sseEmitter = emitter;
}

export default emitter;

// ── Typed event helpers ────────────────────────────────────────────────────────

export interface FIRUpdateEvent {
  firId: string;
  status: string;
  citizenId: string;
  title: string;
  updatedBy?: string;
}

export interface NewFIREvent {
  firId: string;
  citizenId: string;
  citizenName: string;
  title: string;
}

export function emitFIRUpdate(payload: FIRUpdateEvent) {
  emitter.emit("fir-update", payload);
}

export function emitNewFIR(payload: NewFIREvent) {
  emitter.emit("new-fir", payload);
}
