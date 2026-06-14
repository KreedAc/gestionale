# Gestionale clienti

Pagina web privata per gestire clienti, le loro credenziali e scadenze, il credito di mesi
ancora da erogare e i pagamenti da incassare.
Accesso a utente singolo (solo tu) e password dei clienti **cifrate a riposo** (AES-256-GCM).

**Cosa gestisce:**

- **Clienti** — nome, username, password (cifrata), scadenza, credito in mesi ancora da erogare.
- **Pagamenti** — lista delle persone che devono ancora pagare, con importo in € e scadenza.
- **Riepilogo** — totale dei mesi di credito da erogare e totale € ancora da incassare.

- **Stack:** Next.js (App Router) + TypeScript
- **Database:** Turso (SQLite nel cloud)
- **Auth:** login a utente singolo, sessione via cookie firmato (JWT)
- **Sicurezza:** le password/segreti sono cifrate prima di finire nel database;
  nel DB non c'è mai testo in chiaro. La chiave sta solo nelle variabili d'ambiente.

## 1. Prerequisiti

- Node.js 18+
- Un account gratuito su [Turso](https://turso.tech) e la sua CLI

## 2. Crea il database Turso

```bash
turso db create gestionale
turso db show gestionale --url      # -> TURSO_DATABASE_URL
turso db tokens create gestionale   # -> TURSO_AUTH_TOKEN
```

La tabella viene creata automaticamente al primo avvio dell'app.

## 3. Configura le variabili d'ambiente

```bash
cp .env.example .env
npm install
npm run secrets -- "la-tua-password"
```

L'ultimo comando stampa `APP_PASSWORD_HASH`, `SESSION_SECRET` e `ENCRYPTION_KEY`:
incollali nel file `.env` insieme a URL e token di Turso.

> ⚠️ Conserva `ENCRYPTION_KEY` in un posto sicuro. Se la perdi o la cambi,
> i segreti già salvati non sono più decifrabili.

## 4. Avvia in locale

```bash
npm run dev
```

Apri http://localhost:3000 — verrai rimandato al login. Entra con `APP_USERNAME`
(default `admin`) e la password scelta al punto 3.

## 5. Deploy (gratis)

Consigliato **Vercel**:

1. Importa il repo su Vercel.
2. In *Settings → Environment Variables* inserisci **tutte** le variabili del `.env`
   (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_USERNAME`, `APP_PASSWORD_HASH`,
   `SESSION_SECRET`, `ENCRYPTION_KEY`).
3. Deploy. Fatto.

## Note di sicurezza

- Il file `.env` **non** viene committato (è in `.gitignore`). Le chiavi vivono solo
  nelle variabili d'ambiente dell'hosting.
- I segreti sono cifrati con AES-256-GCM: chi accede al solo database vede testo illeggibile.
- Per cambiare la password rigenera l'hash con `npm run secrets` e aggiorna `APP_PASSWORD_HASH`.
- Essendo a utente singolo, tutto è visibile solo dopo il login con le tue credenziali.

## Struttura

```
src/
  app/
    api/login         POST  login
    api/logout        POST  logout
    api/clienti       GET lista · POST crea
    api/clienti/[id]  GET dettaglio · PUT modifica · DELETE elimina
    api/pagamenti     GET lista · POST crea
    api/pagamenti/[id]  PUT modifica · DELETE elimina
    login/            pagina di accesso
    page.tsx          dashboard (protetta): riepilogo + tab Clienti/Pagamenti
  components/
    ClienteForm.tsx
    PagamentoForm.tsx
  lib/
    db.ts             client Turso + schema
    crypto.ts         cifratura AES-256-GCM
    auth.ts           verifica password (bcrypt)
    session.ts        cookie di sessione (JWT)
  middleware.ts       protegge pagine e API
```
