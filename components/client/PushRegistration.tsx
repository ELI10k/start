"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { pushReason, resolvePushProvider, safeDeepLink } from "@/lib/push/providers";
import { track } from "@/lib/analytics/client";
import type { PushPermissionState, PushRegistration as Registration } from "@/lib/push/types";

// Registers the device, keeps the token current, and routes a tapped
// notification. Rendered once inside the client shell; it draws nothing unless
// there is something to say.
export default function PushRegistration({ showPrompt = false }: { showPrompt?: boolean }) {
  const provider = useMemo(() => resolvePushProvider(), []);
  const router = useRouter();
  const [permission, setPermission] = useState<PushPermissionState>("unknown");
  const [busy, setBusy] = useState(false);

  const register = useCallback(async (registration: Registration | undefined) => {
    if (!registration) return;
    const supabase = createSupabaseBrowserClient();
    // A failure here is not worth interrupting anyone: the in-app bell still
    // works, and the next app start tries again.
    await supabase.rpc("register_push_device", {
      p_token: registration.token,
      p_platform: registration.platform,
      p_provider: registration.provider,
    });
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const available = await provider.isAvailable();
      const state = available ? await provider.getPermission() : "unavailable";
      if (!active) return;
      setPermission(state);
      if (state === "granted") await register(await provider.getRegistration());
    })();
    return () => { active = false; };
  }, [provider, register]);

  // The OS rotates tokens on its own schedule. Missing a rotation means silently
  // sending to a handset that no longer answers.
  useEffect(() => provider.onTokenChange((registration) => { void register(registration); }), [provider, register]);

  // Foreground, background or closed, the tap lands on the same screen the bell
  // would have opened.
  useEffect(() => provider.onNotificationOpened((href) => {
    const target = safeDeepLink(href);
    // The destination is an in-app path from a closed list of screens, so it is
    // a category rather than anything about the client.
    track("notification_opened", { target });
    router.push(target);
  }), [provider, router]);

  const ask = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const state = await provider.requestPermission();
      setPermission(state);
      if (state === "granted") await register(await provider.getRegistration());
    } finally {
      setBusy(false);
    }
  };

  if (!showPrompt) return null;
  const reason = pushReason(permission);
  if (permission === "granted") return <p className="text-sm text-[#16A34A]">התראות מאושרות במכשיר הזה.</p>;
  return (
    <div className="rounded-2xl border border-dashed border-[#E5E7E5] p-3">
      <p className="flex items-start gap-2 text-xs text-[#5B5F5B]"><BellRing aria-hidden="true" size={15} className="mt-0.5 shrink-0" />{reason}</p>
      {permission === "prompt" && (
        <button type="button" onClick={ask} disabled={busy} className="premium-secondary-button mt-3">{busy ? "מבקשים אישור…" : "אישור התראות"}</button>
      )}
    </div>
  );
}
