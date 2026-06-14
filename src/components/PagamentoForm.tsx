"use client";

import { useState } from "react";

export type PagamentoDraft = {
  id?: number;
  persona: string;
  importo: string;
  scadenza: string;
  pagato: boolean;
  note: string;
};

const empty: PagamentoDraft = {
  persona: "",
  importo: "",
  scadenza: "",
  pagato: false,
  note: "",
};

export default function PagamentoForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: PagamentoDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<PagamentoDraft>(initial ?? empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  function set<K extends keyof PagamentoDraft>(key: K, value: PagamentoDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = isEdit ? `/api/pagamenti/${initial!.id}` : "/api/pagamenti";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Salvataggio non riuscito");
        return;
      }
      onSaved();
    } catch {
      setError("Errore di rete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <form className="card modal" onSubmit={onSubmit} onMouseDown={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Modifica pagamento" : "Nuovo pagamento"}</h2>
        <div className="row">
          <div className="field">
            <label htmlFor="persona">Persona *</label>
            <input id="persona" value={draft.persona} onChange={(e) => set("persona", e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="importo">Importo (€)</label>
            <input
              id="importo"
              type="number"
              min={0}
              step="0.01"
              value={draft.importo}
              onChange={(e) => set("importo", e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="scadenza">Scadenza pagamento</label>
          <input
            id="scadenza"
            type="date"
            value={draft.scadenza}
            onChange={(e) => set("scadenza", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="note">Note</label>
          <textarea id="note" rows={2} value={draft.note} onChange={(e) => set("note", e.target.value)} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text)" }}>
          <input
            type="checkbox"
            checked={draft.pagato}
            onChange={(e) => set("pagato", e.target.checked)}
            style={{ width: "auto" }}
          />
          Già pagato
        </label>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Annulla
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </form>
    </div>
  );
}
