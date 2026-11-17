# What I would improve

Honest backlog of security gaps, product limits, test gaps, and hardening ideas for this vacation-management demo. Use it in interviews (“what would you do next?”) and when prioritizing real follow-up work.

This is **not** a claim that the app is production-ready. Short bullets also live under **Known limitations** in the root `README.md`; this doc goes deeper.

## How to read an entry

| Field | Meaning |
| --- | --- |
| **Severity** | Impact if exploited or hit in production (`critical` / `high` / `medium` / `low` / `product` / `quality`) |
| **Today** | What the code does now (with pointers) |
| **Risk** | What goes wrong |
| **I’d do** | Concrete next step, not a slogan |
| **Effort** | Rough size |

Add new entries at the top of each section as you find them.

## If asked “what would you fix first?”

1. **S1** — session theft / no revocation (bearer in `localStorage`, 8h, logout is local-only)  
2. **S3** — login rate limiting  
3. **T1** — real Postgres integration test for overlap races  
4. **P3** — paginate team / own lists  

Everything else is important but secondary for a demo → production conversation.

---

## Security

### S1 — Stolen JWT = full impersonation until expiry

| | |
| --- | --- |
| **Severity** | High |
| **Today** | Access token is an HS256 JWT (`sub`, `role`, `email`, `name`), **8h** expiry, stored in **`localStorage`** (`vm_token`). Axios attaches `Authorization: Bearer …` on every request. Logout only clears this browser’s storage. There is **no refresh token** and **no server-side revocation**. |
| **Pointers** | `apps/web/src/auth/token.ts`, `apps/web/src/api/client.ts`, `apps/web/src/store/auth.ts`, `apps/api/src/security/jwt.ts`, README known limitations |
| **Risk** | Anyone who obtains a valid token can call the API as that user (including their role) until `exp`. Theft paths include XSS on the app origin, malware, shared machine, or a user pasting the token. This is inherent to bearer tokens; `localStorage` makes **XSS → token theft** especially easy because any script on the origin can read it. |
| **I’d do** | (1) Treat XSS as a P0: strict CSP, careful HTML/URL handling, dependency hygiene. (2) Prefer **httpOnly + Secure + SameSite** cookies for the session (accept CSRF design) *or* keep Bearer but shorten TTL (e.g. 5–15 min) + refresh tokens with rotation. (3) Add **revocation** (denylist/`jti`, or version sessions in DB) so logout and role changes take effect immediately. (4) Shrink JWT claims — `sub` (+ maybe `role` if you accept staleness) is enough; load profile from DB. |
| **Effort** | Medium–large (cookie/CSRF or refresh+revocation is a real auth redesign) |

### S2 — Shared / weak demo credentials and predictable seed

| | |
| --- | --- |
| **Severity** | Medium (demo); Critical if the same pattern shipped |
| **Today** | Seeded users share one well-known password; seed logs credentials to the console. `.env.example` ships a fixed `JWT_SECRET` for local use. |
| **Pointers** | `apps/api/src/persistence/seed.ts`, `.env.example`, README demo users |
| **Risk** | Fine for a local recruitment demo. Dangerous if someone deploys with demo passwords or the example JWT secret. |
| **I’d do** | Gate seed behind `NODE_ENV`/explicit flag; never log passwords; require a strong unique `JWT_SECRET` in non-local envs; force password change or disable demo users outside local. |
| **Effort** | Small |

### S3 — No login rate limiting / lockout

| | |
| --- | --- |
| **Severity** | Medium |
| **Today** | `POST /auth/login` accepts unlimited attempts; same generic 401 message (good against email enumeration), but nothing slows a password spray. |
| **Pointers** | `apps/api/src/application/authService.ts`, `handlers/auth.ts` |
| **Risk** | Online brute force against weak or reused passwords. |
| **I’d do** | Rate-limit by IP + email (gateway or middleware), optional exponential backoff / lockout, monitoring on repeated 401s. |
| **Effort** | Small–medium |

### S4 — Symmetric JWT secret, no key rotation story

| | |
| --- | --- |
| **Severity** | Medium (ops / multi-service) |
| **Today** | Single `JWT_SECRET`, HS256 only. Fine for one local API process. |
| **Pointers** | `apps/api/src/security/jwt.ts` |
| **Risk** | Secret leak forges any user/role. Rotation means downtime or dual-verify unless you plan for `kid`. |
| **I’d do** | For production multi-service: asymmetric keys (RS256/ES256), `kid`, rotation runbook; keep HS256 only if one service and secret stays in a proper secret store. |
| **Effort** | Medium |

### S5 — No Content-Security-Policy (amplifies S1)

| | |
| --- | --- |
| **Severity** | Medium (paired with S1) |
| **Today** | Vite/Vue SPA with no documented CSP headers. Nuxt UI / third-party scripts increase the XSS blast radius if a script injection ever appears. |
| **Pointers** | `apps/web` (Vite app); token in `localStorage` |
| **Risk** | XSS is not “just defacement” — it can exfiltrate `vm_token` and become full account takeover for up to 8 hours. |
| **I’d do** | CSP (start report-only), harden HTML sinks, keep dependencies updated; ideally move session out of JS-readable storage (**S1**). |
| **Effort** | Small–medium for CSP; larger if fixing storage |

### S6 — Frontend route guards are UX only (by design — don’t over-trust them)

| | |
| --- | --- |
| **Severity** | Low if server stays strict; High if someone “secures” only the UI |
| **Today** | Vue Router `meta.roles` / `beforeEach` hide screens. API enforces `requireAuth` / `requireRole` and ownership in services. |
| **Pointers** | `apps/web/src/router/index.ts`; `apps/api/src/security/auth.ts`; `vacationAccess.test.ts`, `handlers/access.test.ts` |
| **Risk** | Interview / maintenance trap: treating the SPA as the security boundary. A crafted HTTP client bypasses the UI entirely. |
| **I’d do** | Keep saying it out loud; never add sensitive operations that only check the client. Optionally add automated checks that every mutating OpenAPI route has a server authz test. |
| **Effort** | Process / tests (small) |

### S7 — Team calendar leaks coworker names and dates to every authenticated role

| | |
| --- | --- |
| **Severity** | Low–medium (privacy / product policy) |
| **Today** | `GET /team/vacation-requests` allows any logged-in user (`requireAuth`). Returns pending/approved stays with employee **name**, status, dates. |
| **Pointers** | `getTeamVacationRequests`, `listTeamVacationRequests` |
| **Risk** | Acceptable for a small-team planner; wrong for orgs that treat PTO as confidential between employee and manager. |
| **I’d do** | Product decision: same-team only, managers only, or anonymized “busy” blocks; document the privacy model in the README. |
| **Effort** | Small–medium depending on policy |

---

## Product / correctness

### P1 — Role changes wait for token expiry

Already in README: role is baked into the JWT at login; no revocation → up to 8h lag. `/auth/me` reloads the user from DB for the profile, but **route authz still uses the JWT `role` claim** via `requireRole`. Fix bundled with **S1** (session version, revoke, or load role from DB on each request).

### P2 — Timezone “today” can disagree between browser and API

README: past-date rule uses local calendar on UI vs host/`TZ` on API (`localToday()` / Temporal). I’d pick one source of truth (company TZ or explicit UTC date policy) and align UI + API.

### P3 — Unbounded requester / team lists

Only the validator list is paginated (and `pageSize` clamped to 50). Own list and team calendar return every matching row. Paginate or hard-cap those endpoints; indexes already favor validator filtering.

### P4 — Cancel deletes the row (no cancelled status)

README: pending cancel is a delete. History and analytics lose the event; “cancelled” can’t appear in filters. Prefer soft status or an audit row if compliance matters.

### P5 — Same-day stays are invalid

Product rule + DB CHECK: `end_date > start_date` (migration history briefly allowed `>=`, then reverted). Fine if intentional; confusing for users who expect a one-day PTO. Document clearly or switch policy with a migration + UI copy.

### P6 — No notifications or audit trail

Approve/reject is silent (no email/Slack). No append-only decision log beyond the row’s `comments` / timestamps. Add outboxes or at least structured audit events before calling it production HR software.

---

## Testing / confidence gaps

### T1 — No automated live race against the GiST exclusion

| | |
| --- | --- |
| **Severity** | Quality (concurrency story) |
| **Today** | App overlap check runs in a transaction; DB has `vacation_requests_no_overlap`. Unit tests map Postgres exclusion/deadlock codes to 409 (`overlapError.test.ts`). Access/service tests cover authz and date asserts. There is no CI test that fires two concurrent inserts against real Postgres and asserts one 409. |
| **Pointers** | `AddOverlapExclusion` migration; `assertNoOverlap`; `overlapError.ts` |
| **Risk** | Interview answer is strong on design; evidence for the race is weaker than for RBAC. |
| **I’d do** | One integration test with a real DB (or testcontainers): parallel creates with overlapping ranges → exactly one success, one 409. |
| **Effort** | Medium (harness) |

### T2 — No full browser E2E of the demo path

| | |
| --- | --- |
| **Severity** | Quality |
| **Today** | Solid unit/component coverage (API authz, parsers, Vuex, router guards, form utils). No Playwright (or similar) script for login → create → team → approve/reject. |
| **Risk** | Regressions in wiring between Vuex and handlers slip past unit tests. |
| **I’d do** | One smoke E2E against `pnpm dev` + seeded DB covering the README demo path. |
| **Effort** | Medium |

### T3 — Document limitations with tests where possible

Examples: “role change does not affect existing JWT until re-login”; “rejected ranges do not block overlap.” Some are implied today; making them explicit tests turns limitations into deliberate, defended behavior.

---

## What is already in good shape (don’t “fix” these in an interview)

- Server-side business rules in `application/` + DB CHECKs / GiST exclusion (defense in depth)  
- Role from DB at login; client-supplied role ignored (covered by tests)  
- Passwords hashed (`password_hash` / bcrypt); never returned from `toPublicUser`  
- TypeORM `synchronize: false` + migrations  
- Thin CEF handlers; OpenAPI `root.yaml` as router  
- Validator list filters + pagination + useful indexes  

---

## Intentionally out of scope (for now)

- Email / Slack notifications on approve/reject  
- Full admin user-management UI  
- i18n  
- Multi-tenant / multi-company  

Call these out as deferred product work, not as “we forgot security.”

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-11-17 | Initial doc; S1–S4 auth hardening |
| 2026-11-17 | Post-walkthrough: S5–S7, P4–P6, T1–T3, “fix first” order, “already good” section |
