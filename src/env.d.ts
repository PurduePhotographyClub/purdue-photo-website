/// <reference path="../.astro/types.d.ts" />
/// <reference path="../worker-configuration.d.ts" />

// Public website runtime configuration.
declare namespace Cloudflare {
  interface Env {
    API_WORKER: Fetcher;
    INTERNAL_TOKEN?: string;
    TURNSTILE_SITE_KEY?: string;
  }
}

declare namespace App {
  interface Locals {
    user: (import("better-auth").User & {
      role: "user" | "officer" | "admin";
      emailVerified: boolean;
      tier: "member" | "facilities" | null;
      membershipExpiresAt: string | null;
      activatedAt: string | null;
      discordId: string | null;
      twoFactorEnabled: boolean | null;
      suspendedUntil: string | null;
    }) | null;
    session: import("better-auth").Session | null;
    managerScopes: import("./lib/service-manager-access").ServiceManagerScope[];
  }
}

declare module "canvas-confetti" {
  interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: string[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  type Confetti = (options?: ConfettiOptions) => Promise<null> | null;

  const confetti: Confetti;
  export default confetti;
}
