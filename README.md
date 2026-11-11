# Vacation Management

Web app for employees to submit vacation requests and for managers (validators) to approve or reject them.

## Stack

| Layer | Choices |
| --- | --- |
| Frontend | Vue 3, Vue Router, Vuex 4, Axios, Tailwind CSS v4, Nuxt UI |
| Backend | Node.js, TypeScript, CommonEventFramework |
| Database | PostgreSQL 18 + TypeORM migrations |
| Tooling | pnpm workspaces, mise (Node 26 / pnpm 12), Docker Compose |

## Prerequisites

- [mise](https://mise.jdx.dev/) (installs Node 26 and pnpm 12 from `.mise.toml`)
- Docker Engine + Compose (daemon running)

## Setup

```bash
git clone https://github.com/yanai-sh/vacation-management.git vacation-management
cd vacation-management
mise install && pnpm install && pnpm setup
pnpm dev
```

`pnpm setup` creates `.env` from `.env.example` if needed, starts Docker Postgres, runs migrations, and seeds demo users. `pnpm setup` also fails early if Docker is missing or the daemon is down.

- Frontend: http://localhost:5173
- API: http://localhost:8888

Optional: `pnpm db:up`, `pnpm db:down`, `pnpm db:migrate`, `pnpm db:seed`.

Run tests with `pnpm test`.

## Demo users

| Email | Password | Role |
| --- | --- | --- |
| `alice@example.com` | `Password123!` | requester |
| `bob@example.com` | `Password123!` | requester |
| `validator@example.com` | `Password123!` | validator |

## How to try it

1. Sign in as Alice and submit a vacation request.
2. Open **Team** to see pending/approved time off across the team.
3. Sign out and sign in as the validator.
4. Filter by status or user, then approve or reject (rejection requires a comment).
5. Sign in as Alice again to see the updated status (and cancel still-pending requests if needed).

## Technical decisions

- One submit path: `VacationRequestForm.vue` emits the dates, `RequesterView.vue` dispatches `vacations/create` (`apps/web/src/store/vacations.ts`), and that action calls `createRequest` in the Axios client (`apps/web/src/api/vacations.ts`). `POST /vacation-requests` in `apps/api/src/root.yaml` uses `x-inputParser` `handlers/vacations#parseCreateVacationInput`, handler `postVacationRequest`, and `createVacationRequest` in `apps/api/src/application/vacationService.ts`. A `CommonEvent` is the request, the parser is the boundary, the handler is the command, and the service owns the rule. Create returns 201.
- `GET /validator/vacation-requests` uses `parseValidatorVacationRequestsInput`.
- CEF OpenAPI routes (`apps/api/src/root.yaml`) call thin handlers; business rules live in application services.
- JWT HS256 auth; role comes from the signed token, never from the client body.
- Vacation rules enforced on the server (date order, no past starts, no overlap, approved immutable, reject comment required). Past dates use the local calendar day (browser zone in the UI; API host/`TZ` zone server-side).
- Approve and reject stay POST actions (`/validator/vacation-requests/:id/approve` and `.../reject`) because approval re-checks overlap and rejection requires a comment.
- Schema changes use TypeORM migrations (`synchronize` is off). The password column is `password_hash`. Migration `AddValidatorListIndexes1762850000000` adds indexes for the validator list sort (`status, created_at DESC`, `user_id, created_at DESC`, and `created_at DESC`). On an 18-row table, `EXPLAIN` still sequential-scans.
- The requests table scrolls inside its card (`RequestTable.vue`: card body `overflow-x-auto`, table root `overflow-visible`).
- UI uses Tailwind with Nuxt UI (MIT) for form/table/dialog primitives.

## Known limitations

- No refresh tokens (8-hour access token).
- “No past requests” uses the local calendar date (browser zone in the UI; API host/`TZ` zone server-side).
- CEF local server listens on port 8888 by default.
