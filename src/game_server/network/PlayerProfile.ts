import { PlayerProfile } from "@/game_common/network/Interfaces";
import { DF_USERNAME } from "@/game_common/utility/SharedConfig";

const MAX_USERNAME_LENGTH = 24;
const MAX_USER_ID_LENGTH = 64;

// The handshake comes from the client, so this is display data only: userId is not verified by this server.
export function parsePlayerProfile(auth: unknown): PlayerProfile {
  const raw = auth as { userId?: unknown; username?: unknown } | undefined;
  const username =
    typeof raw?.username === "string"
      ? raw.username
          .replace(/[\u0000-\u001f\u007f]/g, "")
          .trim()
          .slice(0, MAX_USERNAME_LENGTH)
      : "";
  const hasUserId =
    typeof raw?.userId === "string" || typeof raw?.userId === "number";

  return {
    userId: hasUserId ? String(raw!.userId).slice(0, MAX_USER_ID_LENGTH) : null,
    username: username || DF_USERNAME,
  };
}
