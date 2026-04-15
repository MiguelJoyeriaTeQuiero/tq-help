// TQ-HELP Service Worker — Push Notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "TQ-HELP", {
      body:  payload.body  ?? "",
      icon:  payload.icon  ?? "/icon-192.png",
      badge: "/icon-192.png",
      data:  { url: payload.url ?? "/" },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
