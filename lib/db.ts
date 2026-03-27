/**
 * lib/db.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton MongoDB connection via Mongoose.
 *
 * WHY A SINGLETON?
 * Next.js runs each API route in the same Node.js process but across multiple
 * hot-reload cycles in development. Without caching, each reload would open a
 * new TCP connection to MongoDB, eventually exhausting the connection pool.
 * The global cache (`global._mongooseCache`) persists across HMR reloads.
 *
 * HOW TO USE:
 *   import { connectDB } from "@/lib/db"
 *   await connectDB()  // idempotent — returns cached connection if alive
 *
 * REQUIRED ENV:
 *   MONGODB_URI=mongodb://localhost:27017/verifir
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define MONGODB_URI in your .env.local file.\n" +
      "Example: MONGODB_URI=mongodb://localhost:27017/verifir"
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  /** In-flight connection promise — prevents race conditions on first connect */
  promise: Promise<typeof mongoose> | null;
}

// Attach cache to globalThis so it survives Next.js HMR reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? {
  conn: null,
  promise: null,
};
global._mongooseCache = cached;

/**
 * Return the active Mongoose connection, creating one if needed.
 * Safe to call on every API request — returns immediately if already connected.
 */
export async function connectDB(): Promise<typeof mongoose> {
  // Fast path: already connected
  if (cached.conn) return cached.conn;

  // Slow path: initiate connection (only once — other callers await the same promise)
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI!, {
        // Don't buffer operations while disconnected — fail fast instead
        bufferCommands: false,
      })
      .then((m) => {
        console.log("[MongoDB] Connected");
        return m;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
