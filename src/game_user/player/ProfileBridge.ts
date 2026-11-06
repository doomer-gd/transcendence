export interface ParentProfile {
  id: string;
  username: string;
}

function parseProfile(data: unknown): ParentProfile | null {
  const profile = data as { id?: unknown; username?: unknown } | null;
  if (
    !profile ||
    typeof profile.username !== "string" ||
    !profile.username.trim()
  )
    return null;
  if (typeof profile.id !== "string" && typeof profile.id !== "number")
    return null;
  return { id: String(profile.id), username: profile.username };
}

// The page embedding the game owns the logged-in session, so the game asks it instead of calling the API.
export function requestProfileFromParent(
  timeoutMs = 1500,
): Promise<ParentProfile | null> {
  if (window.parent === window || !document.referrer)
    return Promise.resolve(null);
  const parentOrigin = new URL(document.referrer).origin;

  return new Promise((resolve) => {
    function finish(profile: ParentProfile | null)
    {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(profile);
    }
    function onMessage(event: MessageEvent)
    {
      if (event.origin !== parentOrigin || event.data?.type !== "profile")
        return ;
      finish(parseProfile(event.data.profile));
    }
    const timer = setTimeout(() => finish(null), timeoutMs);
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "profile-request" }, parentOrigin);
  });
}
