import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

export type TrevoRuntimeEnv = {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  ADMIN_API_KEY?: string;
};

declare global {
  // The Worker entry point attaches the per-deployment bindings before routing.
  // This avoids importing Cloudflare's virtual module in code that is also
  // statically inspected by Node during the Sites artifact validation phase.
  var __TREVO_RUNTIME_ENV__: TrevoRuntimeEnv | undefined;
}

export function getRuntimeEnv(): TrevoRuntimeEnv {
  return globalThis.__TREVO_RUNTIME_ENV__ ?? {};
}
