"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const pixelId = "1481652139058891";

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

const pixelBootstrap = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
`;

export default function MetaPixel() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const syncConsent = (event?: Event) => {
      const choice = event instanceof CustomEvent
        ? event.detail
        : window.localStorage.getItem("start-life-fit-cookie-consent");
      setEnabled(choice === "accepted");
    };
    syncConsent();
    window.addEventListener("start-cookie-consent", syncConsent);
    return () => window.removeEventListener("start-cookie-consent", syncConsent);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onCheckout = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLElement>("[data-meta-checkout]");
      if (!link || !window.fbq) return;
      window.fbq("track", "InitiateCheckout", {
        content_name: link.dataset.plan ?? "LIFE FIT",
        value: Number(link.dataset.price ?? 0),
        currency: "ILS",
      });
    };

    document.addEventListener("click", onCheckout);
    return () => document.removeEventListener("click", onCheckout);
  }, [enabled]);

  if (!enabled) return null;
  return <Script id="meta-pixel" strategy="afterInteractive">{pixelBootstrap}</Script>;
}
