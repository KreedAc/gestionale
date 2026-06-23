"use client";

import { useEffect } from "react";

// Controlla se e' uscito un nuovo deploy e in tal caso ricarica la pagina, cosi'
// l'utente vede sempre l'ultima versione senza svuotare la cache. Il controllo
// avviene quando l'app torna in primo piano (apertura dalla home, cambio app)
// e periodicamente, per non interrompere l'uso attivo.
export default function VersionWatcher() {
  useEffect(() => {
    const current = process.env.NEXT_PUBLIC_BUILD_ID;
    let reloading = false;

    async function check() {
      if (reloading) return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (current && data.build && data.build !== current) {
          reloading = true;
          window.location.reload();
        }
      } catch {
        /* offline o errore: riprova alla prossima occasione */
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") check();
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    const interval = window.setInterval(check, 60_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
