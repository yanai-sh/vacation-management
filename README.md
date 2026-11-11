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

- A CommonEvent is the request, the parser is the boundary, the handler is the command, and the service owns the rule.
- The role is copied from the database into an HS256 token at login. The client never sends a role.
- Approve and reject stay POST because approval re-checks overlap and rejection carries a comment.
- Overlap is a GiST exclusion constraint. Approve, reject, and cancel lock the row.
- Schema changes are TypeORM migrations (`synchronize` is off). Passwords are stored in `password_hash`.
- Team is a shared calendar of pending and approved dates (employee name, status, and dates), not another copy of the request record.

## Known limitations

- Access tokens last 8 hours. There is no refresh token and no revocation, so a role change waits until the token expires.
- “No past requests” uses the local calendar date (browser zone in the UI; API host/`TZ` zone server-side).
- A stay must end after it starts, so a single calendar day is not a valid request.
- Cancel deletes the pending row. There is no cancelled status.
- Only the validator list is paginated. The requester’s own list and the team calendar return every matching row.
- The local API listens on port 8888.
