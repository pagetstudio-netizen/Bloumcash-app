# Bloum Cash

Application web mobile (PWA) fintech ultra-professionnelle pour le Togo — transferts entre TMoney et Moov Money, paiements QR Code.

## Run & Operate

- `pnpm --filter @workspace/bloum-cash run dev` — run the frontend (port 18544)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + Framer Motion + wouter
- Charts: Recharts (line chart animated)
- QR Code: qrcode.react
- Icons: Lucide React
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/bloum-cash/` — React + Vite PWA frontend
- `artifacts/api-server/` — Express API backend
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react/src/generated/` — Generated React Query hooks
- `lib/api-zod/src/generated/` — Generated Zod schemas
- `lib/db/src/schema/` — Drizzle DB schema (users, transactions, qr_codes)
- `artifacts/bloum-cash/src/pages/` — All app pages
- `artifacts/bloum-cash/src/lib/utils.ts` — Shared utils (formatAmount, validateTogoPhone)

## Architecture decisions

- LocalStorage for auth session (demo mode) + real API endpoints
- Togo phone validation: TMoney (90-93), Moov Money (96-99 prefixes)
- Transfer fees: 1% same network, 2% cross-network
- Demo data seeded in DB with realistic FCFA amounts
- PWA: manifest.json + service worker for offline support

## Product

- Splash screen → Login/Register → Dashboard
- Dashboard: fixed blue header, 4 action buttons, recent transactions, animated stats chart
- Encaisser: QR code generation + share/copy/download
- Transfert: TMoney ↔ Moov Money with real-time fee calculation
- Historique: filterable transaction history with PDF export
- Menu Plus: full settings/support menu

## User preferences

- Language: French (Togo)
- Currency: FCFA (format: "150 000 FCFA")
- Design: Royal blue premium fintech (#1a3fc4 to #2b50e8 gradient)

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing openapi.yaml
- formatAmount and validateTogoPhone live in artifacts/bloum-cash/src/lib/utils.ts
- qrcode.react is installed in artifacts/bloum-cash

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
