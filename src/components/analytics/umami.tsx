/**
 * Umami Cloud — analytics sin cookies, GDPR-friendly.
 * Se carga sólo si hay website ID configurado y se omite en localhost.
 *
 * Excluimos las rutas sensibles (cambio de password) por data-exclude-search.
 */
import Script from "next/script";

export function UmamiAnalytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const src       = process.env.NEXT_PUBLIC_UMAMI_SRC ?? "https://cloud.umami.is/script.js";

  if (!websiteId) return null;

  return (
    <Script
      src={src}
      data-website-id={websiteId}
      // Respeta Do-Not-Track del browser.
      data-do-not-track="true"
      // No tracking en desarrollo.
      data-domains={process.env.NEXT_PUBLIC_UMAMI_DOMAINS ?? undefined}
      // Omite el querystring (evita capturar tokens en URL).
      data-exclude-search="true"
      strategy="afterInteractive"
    />
  );
}
