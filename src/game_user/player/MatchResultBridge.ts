import type { PlayerMatchResult } from "@/game_common/network/Interfaces";

// The game runs in an iframe on another origin, so postMessage is the only way to reach the frontend.
export function sendMatchResultToParent(result: PlayerMatchResult) {
  if (window.parent === window || !document.referrer) return;
  window.parent.postMessage(
    { type: "match-result", result },
    new URL(document.referrer).origin,
  );
}
