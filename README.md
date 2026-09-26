# Pianly

Interactive piano practice in the browser: follow along with songs on a virtual keyboard, optional MIDI input, and microphone pitch detection. Accounts unlock the full catalog; **Pianly Pro** (Stripe subscription) adds every difficulty tier.

**Live:** [pianly.net](https://www.pianly.net)

---

## Architecture

Pianly is a **React SPA** backed by a **Spring Boot API** and **PostgreSQL**. Auth is **JWT** (stateless). Subscriptions run through **Stripe Embedded Checkout** and webhooks; Pro status is stored on the user record.

```mermaid
flowchart TB
  subgraph client["Browser (Vite + React)"]
    UI[Pages & components]
    Audio[Tone.js / Web MIDI / mic pitch]
    AuthCtx[AuthContext]
    SubCtx[SubscriptionContext]
    API[api/client.js]
    UI --> Audio
    UI --> AuthCtx
    UI --> SubCtx
    AuthCtx --> API
    SubCtx --> API
  end

  subgraph backend["Spring Boot API"]
    Sec[Security + JWT filter]
    Auth[/api/v1/auth/*]
    Pay[/api/v1/payments/*]
    Demo[/api/v1/demo-controller]
    Sec --> Auth
    Sec --> Pay
    Sec --> Demo
    JPA[(JPA / Hibernate)]
    Auth --> JPA
    Pay --> JPA
  end

  subgraph data["Data & external"]
    PG[(PostgreSQL)]
    Stripe[Stripe Checkout / Billing Portal / Webhooks]
    JPA --> PG
    Pay --> Stripe
  end

  API -->|HTTPS + Bearer JWT| Sec
  UI -->|Stripe.js publishable key| Stripe
```

### Request flow (authenticated)

1. User logs in → `POST /api/v1/auth/authenticate` → JWT stored in `localStorage`.
2. `api()` attaches `Authorization: Bearer <token>` on each request.
3. `JwtAuthenticationFilter` validates the token and loads the user for protected routes.
4. Pro gating: frontend reads `/api/v1/payments/status`; song catalog logic respects `pro` in `SubscriptionContext`.

### Repository layout

| Path | Role |
|------|------|
| `frontend/` | React 19, Vite, React Router, Framer Motion, Lenis |
| `frontend/src/pages/Playground/` | Main practice UI (piano, MIDI viz, mic, song flow) |
| `frontend/src/data/songCatalog.js` | Song metadata and free vs Pro access rules |
| `frontend/src/audio/` | Piano sample playback (Tone.js) |
| `backend/` | Spring Boot 3.5, Java 21, Spring Security, JJWT, Stripe Java SDK |
| `backend/src/main/java/.../auth/` | Register, login, JWT issuance |
| `backend/src/main/java/.../payment/` | Checkout, portal, webhooks, Pro sync |
| `backend/src/main/java/.../config/` | Security, CORS, JWT filter |
| `dev/run.sh`, `dev/down.sh` | Local dev orchestration |

### Deployment (typical)

| Layer | Host | Notes |
|-------|------|--------|
| Frontend | Vercel (or static host) | `VITE_*` env at build time; SPA `_redirects` |
| Backend | Railway (or any JVM host) | `PORT`, Postgres `PG*`, secrets via env |
| Database | Managed Postgres | Linked to backend service |
| Payments | Stripe | Webhook URL → `POST /api/v1/payments/webhook` |

---

## Tech stack

**Frontend:** React, Vite, React Router, Tone.js, Web MIDI (`webmidi`), pitch detection (`pitchy`), Stripe Embedded Checkout, `@tonejs/midi` for visualization.

**Backend:** Spring Web, Spring Security, Spring Data JPA, PostgreSQL, BCrypt passwords, JWT (HS256), Stripe subscriptions.

---

## Local development

### Prerequisites

- **Node.js** 20+ and npm
- **Java** 21
- **PostgreSQL** running locally (default DB name `pianly`, user/password `postgres` — override via env)

### Quick start

```bash
# From repo root — starts backend (8080) and frontend (5173)
./dev/run.sh

# Stop
./dev/down.sh
```

Or run services separately:

```bash
# Backend
cd backend
cp .env.example .env   # fill in secrets (see below)
./mvnw spring-boot:run

# Frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API defaults to same-origin in dev unless `VITE_API_BASE_URL` is set (use `http://localhost:8080` if the frontend proxies are not configured).

### Environment variables

**Backend** (`backend/.env` or platform env — see `backend/.env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET_KEY` | Yes | Base64-encoded HMAC key for JWT signing (`openssl rand -base64 64`) |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key (`sk_test_...` in dev) |
| `STRIPE_WEBHOOK_SECRET` | Production | `whsec_...` from Stripe webhook endpoint |
| `FRONTEND_URL` | Production | e.g. `https://www.pianly.net` (CORS + Stripe return URLs) |
| `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` | If not using JDBC URL | Postgres connection |
| `SPRING_DATASOURCE_URL` | Optional | Full JDBC URL instead of `PG*` vars |
| `CORS_ALLOWED_ORIGINS` | Optional | Extra comma-separated origins |

**Frontend** (`frontend/.env.local` — see `frontend/.env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Production builds | Backend origin (empty for local dev if API is same host/proxy) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | For checkout UI | Stripe publishable key (`pk_test_...` in dev) |

Never commit real `.env` files. Only `*.env.example` belong in git.

### Stripe webhooks (local)

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward events to `http://localhost:8080/api/v1/payments/webhook` and set `STRIPE_WEBHOOK_SECRET` from the CLI output.

---

## API overview

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/auth/register` | No | Create account |
| POST | `/api/v1/auth/authenticate` | No | Login → JWT |
| GET | `/api/v1/demo-controller` | Yes | Session smoke test |
| GET | `/api/v1/payments/status` | Yes | `{ pro: boolean }` |
| POST | `/api/v1/payments/create-checkout-session` | Yes | Embedded Checkout client secret |
| POST | `/api/v1/payments/create-portal-session` | Yes | Billing portal URL |
| GET | `/api/v1/payments/session-status?session_id=` | Yes | Sync Pro after checkout return |
| POST | `/api/v1/payments/webhook` | Stripe signature | Subscription lifecycle |

---

## Security & open-sourcing

This project is intended to be **public**. Keep secrets in environment variables only.

If this repository ever contained real keys (JWT defaults, Stripe keys, production URLs in tracked env files):

1. **Rotate** `JWT_SECRET_KEY` in production (logs everyone out).
2. **Roll** Stripe secret and webhook signing secrets in the Stripe Dashboard.
3. Consider **git history cleanup** (`git filter-repo` / BFG) if live secrets were committed — rotating keys is mandatory either way.

Do not add `.env`, `.env.production`, IDE metadata (`.idea/`), or backup files (`*~`) to version control.

---

## License

Add a license file before publishing if you have not already (e.g. MIT). Until then, all rights reserved by the repository owner.
