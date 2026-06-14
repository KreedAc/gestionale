"use client";

import { useState } from "react";

export default function ImportExcel({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ imported: number; saltati: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setResult(null);
    setBusy(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: data });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Import non riuscito");
        return;
      }
      setResult({ imported: body.imported ?? 0, saltati: body.saltati ?? 0 });
    } catch {
      setError("Errore di rete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <form className="card modal" onSubmit={onSubmit} onMouseDown={(e) => e.stopPropagation()}>
        <h2>Importa clienti da Excel</h2>

        {result ? (
          <>
            <p style={{ color: "var(--ok)" }}>
              ✓ Importati {result.imported} clienti
              {result.saltati > 0 ? ` (${result.saltati} righe saltate perché senza nome)` : ""}.
            </p>
            <div className="modal-actions">
              <button type="button" className="primary" onClick={onImported}>
                Chiudi e aggiorna
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Carica un file <strong>.xlsx</strong>. Vengono lette le colonne con intestazione
              <em> Nome, scadenza, Credito, username, password</em> (date in formato GG/MM/AAAA).
              I clienti vengono aggiunti a quelli esistenti.
            </p>
            <div className="field">
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={onClose}>
                Annulla
              </button>
              <button type="submit" className="primary" disabled={busy || !file}>
                {busy ? "Importazione…" : "Importa"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
