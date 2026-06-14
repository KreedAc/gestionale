"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ClienteForm, { type ClienteDraft } from "@/components/ClienteForm";
import PagamentoForm, { type PagamentoDraft } from "@/components/PagamentoForm";

type Cliente = {
  id: number;
  nome: string;
  username: string | null;
  scadenza: string | null;
  credito_mesi: number;
};

type Pagamento = {
  id: number;
  persona: string;
  importo: number;
  scadenza: string | null;
  pagato: number;
  note: string | null;
};

const WARN_DAYS = 30;

function expiryStatus(scadenza: string | null): { kind: string; label: string } {
  if (!scadenza) return { kind: "none", label: "—" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(scadenza);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  const dateLabel = due.toLocaleDateString("it-IT");
  if (days < 0) return { kind: "expired", label: `Scaduto (${dateLabel})` };
  if (days === 0) return { kind: "warn", label: "Scade oggi" };
  if (days <= WARN_DAYS) return { kind: "warn", label: `Tra ${days} gg (${dateLabel})` };
  return { kind: "ok", label: dateLabel };
}

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<"clienti" | "pagamenti">("clienti");
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [pagamenti, setPagamenti] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<number, string>>({});

  const [clienteForm, setClienteForm] = useState<{ open: boolean; initial?: ClienteDraft }>({ open: false });
  const [pagamentoForm, setPagamentoForm] = useState<{ open: boolean; initial?: PagamentoDraft }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    const [rc, rp] = await Promise.all([fetch("/api/clienti"), fetch("/api/pagamenti")]);
    if (rc.status === 401 || rp.status === 401) {
      router.replace("/login");
      return;
    }
    const dc = await rc.json();
    const dp = await rp.json();
    setClienti(dc.items ?? []);
    setPagamenti(dp.items ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const totaleMesi = useMemo(
    () => clienti.reduce((acc, c) => acc + (Number(c.credito_mesi) || 0), 0),
    [clienti]
  );
  const totaleDaIncassare = useMemo(
    () => pagamenti.filter((p) => !p.pagato).reduce((acc, p) => acc + (Number(p.importo) || 0), 0),
    [pagamenti]
  );

  // --- Clienti ---
  async function editCliente(id: number) {
    const res = await fetch(`/api/clienti/${id}`);
    if (!res.ok) return;
    const { item } = await res.json();
    setClienteForm({
      open: true,
      initial: {
        id: item.id,
        nome: item.nome ?? "",
        username: item.username ?? "",
        password: item.password ?? "",
        scadenza: item.scadenza ?? "",
        credito_mesi: String(item.credito_mesi ?? 0),
      },
    });
  }

  async function revealPassword(id: number) {
    if (revealed[id] !== undefined) {
      setRevealed((r) => {
        const next = { ...r };
        delete next[id];
        return next;
      });
      return;
    }
    const res = await fetch(`/api/clienti/${id}`);
    if (!res.ok) return;
    const { item } = await res.json();
    setRevealed((r) => ({ ...r, [id]: item.password || "(nessuna password)" }));
  }

  async function removeCliente(id: number) {
    if (!confirm("Eliminare questo cliente?")) return;
    const res = await fetch(`/api/clienti/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  // --- Pagamenti ---
  function editPagamento(p: Pagamento) {
    setPagamentoForm({
      open: true,
      initial: {
        id: p.id,
        persona: p.persona,
        importo: String(p.importo ?? ""),
        scadenza: p.scadenza ?? "",
        pagato: Boolean(p.pagato),
        note: p.note ?? "",
      },
    });
  }

  async function togglePagato(p: Pagamento) {
    const res = await fetch(`/api/pagamenti/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: p.persona,
        importo: p.importo,
        scadenza: p.scadenza ?? "",
        note: p.note ?? "",
        pagato: !p.pagato,
      }),
    });
    if (res.ok) load();
  }

  async function removePagamento(id: number) {
    if (!confirm("Eliminare questo pagamento?")) return;
    const res = await fetch(`/api/pagamenti/${id}`, { method: "DELETE" });
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
        <h1>Gestionale clienti</h1>
        <button onClick={logout}>Esci</button>
      </div>

      <div className="summary">
        <div className="stat">
          <span className="stat-label">Credito mesi da erogare</span>
          <span className="stat-value">{totaleMesi}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Ancora da incassare</span>
          <span className="stat-value">{euro.format(totaleDaIncassare)}</span>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === "clienti" ? "tab active" : "tab"} onClick={() => setTab("clienti")}>
          Clienti ({clienti.length})
        </button>
        <button className={tab === "pagamenti" ? "tab active" : "tab"} onClick={() => setTab("pagamenti")}>
          Pagamenti ({pagamenti.filter((p) => !p.pagato).length} da incassare)
        </button>
      </div>

      {tab === "clienti" && (
        <div className="card">
          <div className="card-head">
            <span className="muted">Anagrafica clienti e credenziali</span>
            <button className="primary" onClick={() => setClienteForm({ open: true })}>
              + Nuovo cliente
            </button>
          </div>
          {loading ? (
            <p className="empty">Caricamento…</p>
          ) : clienti.length === 0 ? (
            <p className="empty">Nessun cliente. Aggiungine uno con “+ Nuovo cliente”.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Username</th>
                  <th>Password</th>
                  <th>Scadenza</th>
                  <th>Credito</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clienti.map((c) => {
                  const status = expiryStatus(c.scadenza);
                  return (
                    <tr key={c.id}>
                      <td>{c.nome}</td>
                      <td>{c.username || <span className="muted">—</span>}</td>
                      <td className="secret">
                        {revealed[c.id] !== undefined ? revealed[c.id] : <span className="muted">••••••</span>}{" "}
                        <button onClick={() => revealPassword(c.id)} style={{ padding: "2px 8px", fontSize: "0.78rem" }}>
                          {revealed[c.id] !== undefined ? "Nascondi" : "Mostra"}
                        </button>
                      </td>
                      <td>
                        <span className={`badge ${status.kind}`}>{status.label}</span>
                      </td>
                      <td>{c.credito_mesi} {c.credito_mesi === 1 ? "mese" : "mesi"}</td>
                      <td>
                        <div className="actions">
                          <button onClick={() => editCliente(c.id)}>Modifica</button>
                          <button className="danger" onClick={() => removeCliente(c.id)}>
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
      )}

      {tab === "pagamenti" && (
        <div className="card">
          <div className="card-head">
            <span className="muted">Persone che devono ancora pagare</span>
            <button className="primary" onClick={() => setPagamentoForm({ open: true })}>
              + Nuovo pagamento
            </button>
          </div>
          {loading ? (
            <p className="empty">Caricamento…</p>
          ) : pagamenti.length === 0 ? (
            <p className="empty">Nessun pagamento registrato.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Importo</th>
                  <th>Scadenza</th>
                  <th>Stato</th>
                  <th>Note</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagamenti.map((p) => {
                  const status = expiryStatus(p.scadenza);
                  return (
                    <tr key={p.id} style={p.pagato ? { opacity: 0.55 } : undefined}>
                      <td>{p.persona}</td>
                      <td>{euro.format(Number(p.importo) || 0)}</td>
                      <td>{p.pagato ? <span className="muted">—</span> : <span className={`badge ${status.kind}`}>{status.label}</span>}</td>
                      <td>
                        <span className={`badge ${p.pagato ? "ok" : "expired"}`}>
                          {p.pagato ? "Pagato" : "Da pagare"}
                        </span>
                      </td>
                      <td>{p.note || <span className="muted">—</span>}</td>
                      <td>
                        <div className="actions">
                          <button onClick={() => togglePagato(p)}>
                            {p.pagato ? "Segna da pagare" : "Segna pagato"}
                          </button>
                          <button onClick={() => editPagamento(p)}>Modifica</button>
                          <button className="danger" onClick={() => removePagamento(p.id)}>
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
      )}

      {clienteForm.open && (
        <ClienteForm
          initial={clienteForm.initial}
          onClose={() => setClienteForm({ open: false })}
          onSaved={() => {
            setClienteForm({ open: false });
            setRevealed({});
            load();
          }}
        />
      )}

      {pagamentoForm.open && (
        <PagamentoForm
          initial={pagamentoForm.initial}
          onClose={() => setPagamentoForm({ open: false })}
          onSaved={() => {
            setPagamentoForm({ open: false });
            load();
          }}
        />
      )}
    </div>
  );
}
