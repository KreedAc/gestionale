/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Pagine e risposte API: niente cache lato browser, cosi' dopo ogni
        // deploy si vede subito l'ultima versione (niente "svuota cache" a mano).
        // Gli asset con hash in /_next/static restano cacheabili: sono immutabili,
        // cambiano nome a ogni build, quindi non danno mai versioni vecchie.
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
