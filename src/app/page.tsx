"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CredentialForm, { type CredentialDraft } from "@/components/CredentialForm";

type Item = {
  id: number;
  person_name: string;
  service: string;
  username: string | null;
  notes: string | null;
  expires_at: string | null;
};

const WARN_DAYS = 30;

function expiryStatus(expires_at: string | null): { kind: string; label: string } {
  if (!expires_at) return { kind: "none", label: "—" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(expires_at);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  const dateLabel = due.toLocaleDateString("it-IT");
  if (days < 0) return { kind: "expired", label: `Scaduto (${dateLabel})` };
  if (days === 0) return { kind: "warn", label: `Scade oggi` };
  if (days <= WARN_DAYS) return { kind: "warn", label: `Tra ${days} gg (${dateLabel})` };
  return { kind: "ok", label: dateLabel };
}

export default function Dashboard() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CredentialDraft | undefined>(undefined);
  const [revealed, setRevealed] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/credentials");
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  async function openEdit(id: number) {
    const res = await fetch(`/api/credentials/${id}`);
    if (!res.ok) return;
    const { item } = await res.json();
    setEditing({
      id: item.id,
      person_name: item.person_name ?? "",
      service: item.service ?? "",
      username: item.username ?? "",
      secret: item.secret ?? "",
      notes: item.notes ?? "",
      expires_at: item.expires_at ?? "",
    });
    setFormOpen(true);
  }

  async function reveal(id: number) {
    if (revealed[id] !== undefined) {
      setRevealed((r) => {
        const next = { ...r };
        delete next[id];
        return next;
      });
      return;
    }
    const res = await fetch(`/api/credentials/${id}`);
    if (!res.ok) return;
    const { item } = await res.json();
    setRevealed((r) => ({ ...r, [id]: item.secret || "(nessun segreto)" }));
  }

  async function remove(id: number) {
    if (!confirm("Eliminare questa credenziale?")) return;
    const res = await fetch(`/api/credentials/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Gestionale credenziali</h1>
          <span className="muted">Area privata · {items.length} voci</span>
        </div>
        <div className="actions">
          <button className="primary" onClick={openNew}>
            + Nuova
          </button>
          <button onClick={logout}>Esci</button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="empty">Caricamento…</p>
        ) : items.length === 0 ? (
          <p className="empty">Nessuna credenziale. Aggiungine una con “+ Nuova”.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Servizio</th>
                <th>Username</th>
                <th>Segreto</th>
                <th>Scadenza</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const status = expiryStatus(it.expires_at);
                return (
                  <tr key={it.id}>
                    <td>{it.person_name}</td>
                    <td>{it.service}</td>
                    <td>{it.username || <span className="muted">—</span>}</td>
                    <td className="secret">
                      {revealed[it.id] !== undefined ? (
                        revealed[it.id]
                      ) : (
                        <span className="muted">••••••</span>
                      )}{" "}
                      <button onClick={() => reveal(it.id)} style={{ padding: "2px 8px", fontSize: "0.78rem" }}>
                        {revealed[it.id] !== undefined ? "Nascondi" : "Mostra"}
                      </button>
                    </td>
                    <td>
                      <span className={`badge ${status.kind}`}>{status.label}</span>
                    </td>
                    <td>
                      <div className="actions">
                        <button onClick={() => openEdit(it.id)}>Modifica</button>
                        <button className="danger" onClick={() => remove(it.id)}>
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <CredentialForm
          initial={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            setRevealed({});
            load();
          }}
        />
      )}
    </div>
  );
}
