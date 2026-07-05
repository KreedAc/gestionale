"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ClienteForm, { type ClienteDraft } from "@/components/ClienteForm";
import PagamentoForm, { type PagamentoDraft } from "@/components/PagamentoForm";
import ImportExcel from "@/components/ImportExcel";

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

const WARN_DAYS = 7;
const VALORE_MESE = 5; // euro per ogni mese di credito da erogare

function expiryStatus(scadenza: string | null): { kind: string; label: string } {
  if (!scadenza) return { kind: "none", label: "—" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(scadenza);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  const dd = String(due.getDate()).padStart(2, "0");
  const mm = String(due.getMonth() + 1).padStart(2, "0");
  const dateLabel = `${dd}/${mm}/${due.getFullYear()}`;
  // Etichetta compatta: solo la data, il colore indica lo stato.
  if (days < 0) return { kind: "expired", label: dateLabel };
  if (days === 0) return { kind: "warn", label: "Oggi" };
  if (days <= WARN_DAYS) return { kind: "warn", label: dateLabel };
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
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");

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

  // Quante persone hanno credito (mesi > 0).
  const personeConCredito = useMemo(
    () => clienti.filter((c) => Number(c.credito_mesi) > 0).length,
    [clienti]
  );

  // Quante persone hanno credito e scadenza nel mese corrente.
  const personeCreditoMese = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return clienti.filter((c) => {
      if (Number(c.credito_mesi) <= 0 || !c.scadenza) return false;
      const d = new Date(c.scadenza);
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;
  }, [clienti]);
  const totaleDaIncassare = useMemo(
    () => pagamenti.reduce((acc, p) => acc + (Number(p.importo) || 0), 0),
    [pagamenti]
  );

  // Ordine: attive (scadenza più vicina prima), poi senza scadenza, scadute in fondo.
  const clientiSorted = useMemo(() => {
    const rank = (c: Cliente) => {
      if (!c.scadenza) return 1;
      return expiryStatus(c.scadenza).kind === "expired" ? 2 : 0;
    };
    return [...clienti].sort((a, b) => {
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      const da = a.scadenza ?? "";
      const db = b.scadenza ?? "";
      if (da !== db) return da < db ? -1 : 1;
      return a.nome.localeCompare(b.nome);
    });
  }, [clienti]);

  // Filtro di ricerca per nome o username.
  const clientiFiltrati = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientiSorted;
    return clientiSorted.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.username ?? "").toLowerCase().includes(q)
    );
  }, [clientiSorted, search]);

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
          <span className="stat-value">
            {totaleMesi} / {euro.format(totaleMesi * VALORE_MESE)}
          </span>
          <div className="stat-sub">
            <span>{personeConCredito} persone con credito</span>
            <span>{personeCreditoMese} da erogare questo mese</span>
          </div>
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
          Pagamenti ({pagamenti.length} da incassare)
        </button>
      </div>

      {tab === "clienti" && (
        <div className="card">
          <div className="card-head">
            <span className="muted">Anagrafica clienti e credenziali</span>
            <div className="actions">
              <button onClick={() => setImportOpen(true)}>Importa Excel</button>
              <button className="primary" onClick={() => setClienteForm({ open: true })}>
                + Nuovo cliente
              </button>
            </div>
          </div>
          {loading ? (
            <p className="empty">Caricamento…</p>
          ) : clienti.length === 0 ? (
            <p className="empty">Nessun cliente. Aggiungine uno con “+ Nuovo cliente”.</p>
          ) : (
            <>
              <div className="search">
                <span className="search-icon" aria-hidden>
                  🔎
                </span>
                <input
                  type="search"
                  placeholder="Cerca per nome o username…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {clientiFiltrati.length === 0 ? (
                <p className="empty">Nessun risultato per “{search}”.</p>
              ) : (
                <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Scadenza</th>
                  <th>Credito</th>
                  <th>Username</th>
                  <th>Password</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clientiFiltrati.map((c) => {
                  const status = expiryStatus(c.scadenza);
                  return (
                    <tr key={c.id} className={Number(c.credito_mesi) > 0 ? "has-credit" : undefined}>
                      <td data-label="Nome">{c.nome}</td>
                      <td data-label="Scadenza">
                        <span className={`badge ${status.kind}`}>{status.label}</span>
                      </td>
                      <td data-label="Credito">{c.credito_mesi} {c.credito_mesi === 1 ? "mese" : "mesi"}</td>
                      <td data-label="Username">{c.username || <span className="muted">—</span>}</td>
                      <td data-label="Password" className="secret">
                        {revealed[c.id] !== undefined ? revealed[c.id] : <span className="muted">••••••</span>}{" "}
                        <button onClick={() => revealPassword(c.id)} style={{ padding: "2px 8px", fontSize: "0.78rem" }}>
                          {revealed[c.id] !== undefined ? "Nascondi" : "Mostra"}
                        </button>
                      </td>
                      <td className="cell-actions">
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
            </div>
              )}
            </>
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
            <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Importo</th>
                  <th>Note</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagamenti.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Persona">{p.persona}</td>
                      <td data-label="Importo">{euro.format(Number(p.importo) || 0)}</td>
                      <td data-label="Note">{p.note || <span className="muted">—</span>}</td>
                      <td className="cell-actions">
                        <div className="actions">
                          <button onClick={() => editPagamento(p)}>Modifica</button>
                          <button className="danger" onClick={() => removePagamento(p.id)}>
                            Elimina
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
            </div>
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

      {importOpen && (
        <ImportExcel
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
