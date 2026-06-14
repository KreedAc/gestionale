"use client";

import { useState } from "react";

export type ClienteDraft = {
  id?: number;
  nome: string;
  username: string;
  password: string;
  scadenza: string;
  credito_mesi: string;
};

const empty: ClienteDraft = {
  nome: "",
  username: "",
  password: "",
  scadenza: "",
  credito_mesi: "0",
};

export default function ClienteForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: ClienteDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<ClienteDraft>(initial ?? empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  function set<K extends keyof ClienteDraft>(key: K, value: ClienteDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = isEdit ? `/api/clienti/${initial!.id}` : "/api/clienti";
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
        <h2>{isEdit ? "Modifica cliente" : "Nuovo cliente"}</h2>
        <div className="field">
          <label htmlFor="nome">Nome *</label>
          <input id="nome" value={draft.nome} onChange={(e) => set("nome", e.target.value)} required />
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" value={draft.username} onChange={(e) => set("username", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              value={draft.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder={isEdit ? "(lascia vuoto per cancellarla)" : ""}
            />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="scadenza">Scadenza</label>
            <input
              id="scadenza"
              type="date"
              value={draft.scadenza}
              onChange={(e) => set("scadenza", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="credito">Credito (mesi da erogare)</label>
            <input
              id="credito"
              type="number"
              min={0}
              value={draft.credito_mesi}
              onChange={(e) => set("credito_mesi", e.target.value)}
            />
          </div>
        </div>
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
