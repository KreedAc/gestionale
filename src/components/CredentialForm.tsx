"use client";

import { useState } from "react";

export type CredentialDraft = {
  id?: number;
  person_name: string;
  service: string;
  username: string;
  secret: string;
  notes: string;
  expires_at: string;
};

const empty: CredentialDraft = {
  person_name: "",
  service: "",
  username: "",
  secret: "",
  notes: "",
  expires_at: "",
};

export default function CredentialForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: CredentialDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<CredentialDraft>(initial ?? empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  function set<K extends keyof CredentialDraft>(key: K, value: CredentialDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = isEdit ? `/api/credentials/${initial!.id}` : "/api/credentials";
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
        <h2>{isEdit ? "Modifica credenziale" : "Nuova credenziale"}</h2>
        <div className="row">
          <div className="field">
            <label htmlFor="person">Persona *</label>
            <input
              id="person"
              value={draft.person_name}
              onChange={(e) => set("person_name", e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="service">Servizio *</label>
            <input
              id="service"
              value={draft.service}
              onChange={(e) => set("service", e.target.value)}
              required
            />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              value={draft.username}
              onChange={(e) => set("username", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="secret">Password / segreto</label>
            <input
              id="secret"
              value={draft.secret}
              onChange={(e) => set("secret", e.target.value)}
              placeholder={isEdit ? "(lascia vuoto per cancellarlo)" : ""}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="expires">Scadenza</label>
          <input
            id="expires"
            type="date"
            value={draft.expires_at}
            onChange={(e) => set("expires_at", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="notes">Note</label>
          <textarea
            id="notes"
            rows={3}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
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
