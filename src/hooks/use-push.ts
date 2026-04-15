"use client";

import { useState, useEffect } from "react";

type PushState = "unsupported" | "loading" | "denied" | "subscribed" | "unsubscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  const buf     = new ArrayBuffer(raw.length);
  const view    = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
}

export function usePush() {
  const [state,        setState]        = useState<PushState>("loading");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [publicKey,    setPublicKey]    = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    // Register SW
    navigator.serviceWorker.register("/sw.js").catch(() => {});

    // Fetch VAPID public key
    fetch("/api/push/subscribe")
      .then((r) => r.json())
      .then(({ publicKey: pk }) => {
        setPublicKey(pk ?? "");
        return navigator.serviceWorker.ready;
      })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) { setSubscription(sub); setState("subscribed"); }
        else if (Notification.permission === "denied") setState("denied");
        else setState("unsubscribed");
      })
      .catch(() => setState("unsubscribed"));
  }, []);

  const subscribe = async () => {
    if (!publicKey) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: sub.toJSON().keys?.p256dh, auth: sub.toJSON().keys?.auth } }),
      });
      setSubscription(sub);
      setState("subscribed");
    } catch (err: any) {
      if (Notification.permission === "denied") setState("denied");
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
    setSubscription(null);
    setState("unsubscribed");
  };

  return { state, subscribe, unsubscribe };
}
