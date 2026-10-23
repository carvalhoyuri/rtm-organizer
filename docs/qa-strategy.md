# QA Strategy: Agenda RTM
## Version 1.5 | Last Updated: 2026-09-19 | Owner: Yuri Carvalho (solo dev / Curador)

### 1. Executive Summary

Agenda RTM is a solo-maintained Next.js 15 app that lets people build a shared personal schedule (`Agenda`) for a music festival, based on a lineup PDF processed by a `Curador`. As of v1.5, the app's entire access model changed again: a `Grupo` (see CONTEXT.md, ADR 0003) is now the sharing/multi-tenancy boundary — any Usuário can create one, invite friends via a per-Grupo shareable link (`/j/[codigo]`), and everything downstream (`Edição`, `Show`, `Favorito`) lives inside a Grupo instead of being global. `Curador` changed *again*: it's no longer the `CURADOR_EMAIL` env var from v1.3 — it's now whoever created that specific Grupo (`Grupo.criadoPorId`), checked per-request in `src/lib/grupos.ts`'s `exigirMembro`/`exigirCuradorDoGrupo`. **This is the third distinct authorization model this app has had in three days (invite-code → global email → per-Grupo membership)** — the flagged risk is not any one of them, it's the churn: every rewrite is a chance to leave a stale check somewhere. The whole `/edicoes` route tree was deleted and rebuilt as `/grupos/[grupoId]/edicoes/[edicaoId]`; every action that touches an `Edição` or `Show` now explicitly re-verifies it belongs to the `Grupo` in the URL (not just that the caller is *a* member of *some* Grupo) — this is the new highest-value thing to test, see Section 5's new CRIT row. Verification so far: `test/integration/database.test.ts` grew from 6 to 10 tests (added `Grupo`/`MembroGrupo` schema, cascade, and uniqueness checks) and passes against the live project; the full create-Grupo → invite-link → join → cross-group-denial flow was driven with a real Playwright browser during this session (informally, see Section 12 — not yet a committed test). **The Playwright smoke suite in `e2e/` is more broken than before** — it's not just the login form now, the entire route tree it drives no longer exists. The highest-risk *untested* code is still `revisao.ts` and `agenda.ts` — unaffected by this change, still zero tests. Objectives: (1) rewrite `e2e/` for the Grupo-scoped routes against a disposable test project; (2) unit-test the new `grupos.ts` authorization helpers; (3) `revisao.ts`/`agenda.ts` at ≥90% branch coverage; (4) a GitHub Actions PR gate live.

### 2. Scope & Objectives

**In scope:**
- Core domain logic in `src/lib/`: `revisao.ts`, `agenda.ts`, `grupos.ts` (membership/curator authorization — the highest-value new surface), `session.ts` (now just wraps Supabase's `getUser()` + the `Usuario` lookup, no authorization logic left in it), `extraction-texto.ts`.
- Server actions across `src/app/grupos/**/actions.ts` and `favoritos-actions.ts`, `login/`, `register/`, `logout/` (authorization: Grupo membership/curator gating, Supabase session checks, and — new in v1.5 — explicit "does this Edição/Show actually belong to this Grupo" checks; see Section 5).
- The `auth/callback` Route Handler and the `handle_new_user` Postgres trigger (`supabase/sql/handle_new_user.sql`).
- The `/j/[codigo]` join-link route and `entrarNoGrupoPorCodigo` (idempotent membership creation).
- A Playwright smoke suite through the App Router UI — currently **not just broken but obsolete**, needs a full rewrite for the new route tree, top item in Section 11.
- CI enforcement (GitHub Actions) so tests actually gate merges, not just exist.

**Out of scope (for now, with reason):**
- Visual regression — UI is small, low-traffic, single maintainer; not worth the tooling cost yet.
- Load/performance testing — user base is expected to stay small; revisit if signups grow materially.
- Formal accessibility audit — revisit once the UI stabilizes past MVP.
- Contract testing (Pact) — no consumers of this app as an API; N/A.
- AI/LLM-based extraction testing — the app only accepts a structured, text-selectable PDF in the exact expected format (see `extraction-texto.ts`), so there is no model-output-quality surface to test.
- Testing Supabase Auth's own internals — that's Supabase's responsibility; our tests cover *our* integration with it.
- Automated E2E for the Google OAuth path specifically — no practical way to script a real Google consent screen in CI; Google sign-in stays a manual smoke check.
- A "transfer curadoria" or "remove membro" flow — not implemented yet (see ADR 0003's accepted trade-offs), nothing to test.

**Objectives (measurable, 2-quarter horizon):**
1. Rewrite `e2e/` for the `/grupos/[grupoId]/...` route tree against a disposable test Supabase project; cover the golden path (create Grupo → invite link → second account joins → favorites a show) and the cross-group-denial path (a Membro of Group A cannot read/mutate Group B's data by crafting an id).
2. `revisao.ts` and `agenda.ts` reach ≥90% branch coverage; `grupos.ts`'s `exigirMembro`/`exigirCuradorDoGrupo`/`entrarNoGrupoPorCodigo` have unit/integration coverage.
3. Every PR blocked on lint + typecheck + unit tests passing.
4. Zero known data-corruption bugs in `aplicarRevisao`, zero known "authenticated but no `Usuario` row" incidents, and zero known cross-Grupo data leaks, reach production.

### 3. Test Levels & Types

| Level | What It Validates | Owner | Framework | Priority Target | Run Frequency |
|-------|-------------------|-------|-----------|------------------|----------------|
| **Unit** | `revisao.ts` reconciliation rules, `agenda.ts` conflict/free-time math, `session.ts`'s `ehCurador()` email comparison | Dev (solo) | Vitest | 80%+ of all tests | Every commit |
| **Integration** | Server actions + the `handle_new_user` trigger against a real Postgres test DB via Prisma (authz gating, cascade deletes, upsert races, trigger-provisions-`Usuario`-row) | Dev | Vitest + Prisma (disposable Supabase test project or local Postgres) | ~15% of all tests | Every PR |
| **Golden-file / extraction** | `ShowExtraidoSchema` parsing + the text-parser output against fixed sample PDFs | Dev | Vitest | 1+ | Every PR |
| **E2E (smoke)** | Critical journeys: curador uploads a Revisão → favorita a `Show` → vê na `Agenda`; non-curador denied curador actions — email/password auth only, Google OAuth is a manual check | Dev | Playwright | 2 flows (broken since v1.3's auth rewrite — Section 11 rework needed) | Pre-merge to `main` |
| **Security (lightweight)** | `ehCurador()` bypass attempts, `handle_new_user` trigger failure handling (authenticated user with no `Usuario` row), RLS posture review on Supabase tables | Dev | Vitest (unit-level attack cases) | Ad hoc, high-value only | Per PR touching auth |

Not included yet: visual, dedicated performance, and accessibility tooling (see Scope). Add them only when a concrete pain point justifies the setup cost — see Anti-Patterns in the parent skill ("tool-first thinking").

### 4. Test Pyramid Analysis

**Current state:**
```
Unit tests:        0  →   0%
Integration tests: 6  → 100%  (test/integration/database.test.ts — DB/trigger only,
                                revisao.ts/agenda.ts/session.ts still untested)
E2E tests:         0  →   0%  (the v1.1 Playwright suite is broken, see Section 12)
Current Shape: [x] No Shape (too little of the pyramid exists yet to have a shape)
CI Pipeline Duration: N/A (no CI configured — `npm test` runs locally against the live Supabase project)
Flaky Test Rate:      0% observed so far (6/6 passing across reruns)
Test Suite Pass Rate: 100% (6/6)
```

**Target state (end of Phase 2, ~8 weeks):**
```
Unit:        ~75%  → target count: ~35-45 (revisao.ts, agenda.ts, session.ts, extraction schema/error paths)
Integration: ~15%  → target count: ~8-10 (server actions + Prisma against test DB)
E2E:         ~10%  → target count: 2-3 (golden path + one authz-denial path)
Target CI Duration: < 5 minutes (small codebase; no reason to be slower)
Target Flaky Rate:  < 2% (E2E is the only realistic flake source at this scale)
```

Because there is no legacy suite to rebalance, there's no ice-cream-cone risk to fix — the goal is simply to build the pyramid in the right shape from the start: write unit tests for `revisao.ts`/`agenda.ts` logic *before* reaching for Playwright to check the same thing through the browser.

### 5. Risk Assessment Matrix

| Feature / Module | Impact | Likelihood | Score | Testing Approach |
|---|---|---|---|---|
| Cross-Grupo authorization (v1.5, ADR 0003) — a Membro of Grupo A reaching Grupo B's `Edição`/`Show`/`Favorito` by crafting an id in a form or URL | 5 - Catastrophic (breaks the entire premise of Grupos as an isolation boundary — one group reading or corrupting another's data) | 3 - Possible (every action/page under `/grupos/[grupoId]/...` has to remember to re-check `{id, grupoId}` together, not just id — easy to regress on the next new action) | **15 - CRIT** | Integration test per surface: Edição page 404s for a valid `edicaoId` from a different `grupoId` in the URL; `uploadRevisaoAction` rejects a foreign `edicaoId`; `alternarFavoritoAction` no-ops on a foreign `showId`; `exigirMembro`/`exigirCuradorDoGrupo` redirect non-members. Manually verified once with a live 2-browser Playwright run (Section 12) — not yet a committed test |
| `aplicarRevisao` (revisao.ts) — reconciles PDF re-upload, cascades `CANCELADO`/`ALTERADO` to every user's `Favorito` | 5 - Catastrophic (silently corrupts every user's agenda, no undo) | 3 - Possible (complex branching: create/update/cancel/no-op, cache keys, transaction) | **15 - CRIT** | Full unit coverage of every branch (new show, changed time, reappeared-after-cancel, disappeared show) + integration test against real Prisma/Postgres transaction |
| PDF extraction (text parser only, since v1.1) — no manual verification step before publish (per `CONTEXT.md`); malformed lines are dropped and reported, not guessed | 4 - Major (wrong/missing shows shown to the Grupo if the format is subtly off — but deterministic and Curador-controlled, not model output) | 2 - Unlikely (single regex-based parser, fixed input contract; failure mode is "ignores the line" not "hallucinates a show") | **8 - MED** | Golden-file tests with fixture PDFs (well-formed + malformed lines) + explicit test for the "zero shows recognized" `ExtracaoInvalidaError` path |
| `handle_new_user` Postgres trigger — provisions the `Usuario` row for every new Supabase Auth account (email/password or Google); if it fails or lags, `getCurrentUsuario()` sees an authenticated user with no profile row and returns `null` | 4 - Major (person can authenticate with Supabase but the app treats them as logged out) | 1 - Rare (single trigger, `on conflict (id) do nothing` defensive; **covered by 3 passing tests**, `test/integration/database.test.ts` — full_name path, email-prefix fallback, and cascade-delete) | **4 - LOW** | Done: `test/integration/database.test.ts`. Runs against the real project, not a disposable test one (see Section 12) — re-run after any change to `supabase/sql/handle_new_user.sql` |
| Curador-only actions (`criarEdicaoAction`, `uploadRevisaoAction`) — authz gate via `exigirCuradorDoGrupo(grupoId)`, per-Grupo since v1.5 (was the global `exigirCurador()`) | 4 - Major (non-Curador of that Grupo triggers an upload/creates a fake Edição in it) | 2 - Unlikely (single `exigirCuradorDoGrupo()` choke point, but easy to forget on a new action — see the cross-Grupo row above, same failure family) | **8 - MED** | Integration test per server action: non-Curador-of-this-Grupo call is rejected/redirected, no DB write occurs |
| Open registration (v1.3, per ADR 0002) — anyone with an email or Google account can sign up, no app-wide invite gate (Grupo-level invite links, v1.5, are separate — see the cross-Grupo row) | 2 - Minor (spam accounts, not data corruption — accounts can't touch a Grupo's data without also joining that Grupo) | 3 - Possible (public signup form, no CAPTCHA/rate limiting configured yet) | **6 - MED** | Accepted risk per ADR 0002, not actively tested; revisit if spam signups become an actual problem |
| Grupo invite links (v1.5, ADR 0003) — permanent per-Grupo token, no expiry/revocation beyond manually regenerating `codigoConvite`; any Membro can read and reshare it | 3 - Moderate (unwanted people end up in the Grupo — annoying, not a data-corruption or cross-tenant leak, since they still only get access to *that* Grupo) | 2 - Unlikely (requires the link itself to leak; accepted trade-off per ADR 0003) | **6 - MED** | Accepted risk, not actively tested; the mitigation (regenerate `codigoConvite`) has no UI yet — todo if this becomes a real problem |
| `agenda.ts` conflict + free-time detection | 3 - Moderate (wrong "you have a conflict" badge — annoying, not destructive) | 3 - Possible (interval-overlap and midnight-rollover math is easy to get subtly wrong) | **9 - MED** | Unit tests: overlapping/adjacent/non-overlapping shows, default 45-min duration fallback, cross-midnight edge case |
| `favoritos-actions.ts` (toggle/confirm/remove) | 3 - Moderate (a user affects another user's favorito if id checks are missing) | 2 - Unlikely (already scoped by `usuarioId` in queries, plus the v1.5 Grupo-membership check) | **6 - MED** | Integration test: user A cannot confirm/remove user B's `Favorito` via a crafted `favoritoId` |
| UI components (`AgendaView`, `Programacao`, `RevisoesPanel`) | 2 - Minor (visual/UX bug) | 3 - Possible | **6 - MED** | Covered indirectly by the E2E smoke path; no dedicated component tests at this scale |
| `format.ts`, static pages | 1 - Negligible | 2 - Unlikely | **2 - LOW** | Manual check only |

Two CRIT items now: `aplicarRevisao` (no undo, corrupts every Membro's agenda) and the new cross-Grupo authorization surface (breaks the core premise of Grupos existing at all). Both get disproportionate attention next. Extraction stays MED (v1.1: a deterministic parser fails closed rather than hallucinating). `ehCurador()`/`CURADOR_EMAIL` (the v1.3-v1.4 Curador model) no longer exists — removed wholesale in v1.5, replaced by the per-Grupo check above; there is no migration/backfill risk to track since it was a pure code change, not a data model one.

### 6. Environment Strategy

| Environment | Purpose | Test Types | Data | Deploy Trigger |
|---|---|---|---|---|
| **Local** | Dev feedback loop | Unit, integration | The developer's own Supabase project (free tier) via `DATABASE_URL`/`DIRECT_URL` | On save (`npm run dev`) |
| **CI (GitHub Actions)** | Automated gate on every PR | Lint, typecheck, unit, integration | A dedicated, disposable Supabase test project (or local Postgres via Docker) — reset per run via `prisma db push --accept-data-loss` + re-running `handle_new_user.sql` | On push/PR |
| **Pre-merge / local Playwright** | Golden-path sanity before merging UI changes | E2E (1-3 flows) | Same test Supabase project; users created via the Admin API (`SUPABASE_SERVICE_ROLE_KEY`) instead of a Prisma seed script, since accounts now live in `auth.users` | Manual / pre-merge, not yet in CI |
| **Production** (Docker/docker-compose, per existing `Dockerfile`) | Live app | Manual smoke check after deploy (no automated synthetic monitoring at this scale) | The real Supabase project | On manual deploy |

No dedicated "staging" environment yet. This got more important in v1.3 than it was on SQLite: a schema mistake pushed with `--accept-data-loss` now hits a shared hosted Postgres instance, not a disposable local file — worth a second, cheap Supabase project as a staging target before this app has more than a handful of users.

**Supabase-specific note:** `DATABASE_URL` (pooled, port 6543) is used at runtime; `DIRECT_URL` (unpooled, port 5432) is required for `prisma db push`/`migrate`, which don't work through the pgbouncer pooler. Both point at the same underlying database — see `.env.example`.

### 7. Tool Selection Rationale

| Criteria (weight) | Vitest | Jest | Playwright | Cypress |
|---|---|---|---|---|
| Fits stack (Next.js 15, ESM, TS) (30%) | 5 | 3 (ESM/Next15 friction) | 5 | 4 |
| Setup/maintenance cost for a solo dev (25%) | 5 | 3 | 4 | 3 |
| Speed (20%) | 5 | 3 | 4 | 3 |
| Community/docs (15%) | 4 | 5 | 5 | 4 |
| License cost (10%) | 5 | 5 | 5 | 5 |
| **Weighted total** | **4.85** | **3.5** | **4.6** | **3.75** |

**Decisions:**
- **Vitest** for unit + integration — native ESM/TS, fast, no config friction with Next.js 15. Chosen over Jest specifically to avoid the transform/ESM configuration overhead Jest needs under Next 15's module setup.
- **Playwright** for the one E2E smoke path — better Next.js App Router support and trace/debugging tooling than Cypress; only one browser (Chromium) configured initially, no cross-browser matrix (not justified at this scale).
- **Prisma against a real Postgres test database** for integration tests instead of mocking the ORM — the whole point of testing `revisao.ts` and the server actions is the transaction/upsert/cascade behavior, which a mocked Prisma client can't verify. This got more expensive in v1.3 (SQLite → Postgres): no more "throwaway file per test run" trick. Two viable options, not yet decided: (a) a second, free-tier Supabase project dedicated to CI/local test runs, reset via `db push --accept-data-loss` + re-applying `handle_new_user.sql`; or (b) `testcontainers` spinning up ephemeral Postgres in CI (closer to prod Postgres semantics, but doesn't exercise the real `auth.users` trigger without also installing Supabase's auth schema locally, which is nontrivial). Leaning toward (a) for now — it actually exercises the trigger, which is the part most worth an integration test.
- **Zod** (already a dependency) doubles as the extraction contract check — `ShowExtraidoSchema` already rejects malformed parser output; tests should assert this, not reimplement it.
- No API-mocking library needed anymore — since v1.1 there is no external LLM API in the extraction path (`extraction-texto.ts` is pure local parsing), which also simplifies the Playwright E2E setup: the upload flow can run in CI with zero network dependency and zero API cost.

**Language convention (test code):** all test code — file names, `test()`/`describe()` titles, variable/function names, and comments — is written in English, regardless of the app's own language (Portuguese; see `CONTEXT.md`'s domain glossary). The one exception is unavoidable: locators/assertions that match actual rendered UI copy (button labels, placeholders, field names like `edicaoId`) must quote that copy verbatim in Portuguese, since that's what the app really renders. This keeps test code readable by an English-speaking contributor or tool while still correctly exercising the Portuguese-language product.

### 8. Entry/Exit Criteria

**Unit** — Entry: function has a clear input/output contract (all target modules already do). Exit: every branch in `aplicarRevisao`'s decision tree (create / update-with-cascade / no-op / cancel) and every case in `agenda.ts`'s overlap detection is covered; no skipped tests.

**Integration** — Entry: unit tests for the underlying logic pass; test DB schema is pushed fresh. Exit: every server action with an authz check (`exigirCurador`, `usuarioId` ownership) has a positive and a negative test; DB state asserted after, not just return value.

**E2E** — Entry: app buildable and startable against a seeded test DB, with a disposable Supabase test project's URL/keys available (`SUPABASE_SERVICE_ROLE_KEY` needed to create test accounts via the Admin API, since signup now goes through real Auth). Exit: the golden path (curador uploads a Revisão via a fixture PDF → favorita → sees it in Agenda) and the authz-denial path pass headless, using email/password auth; Google OAuth is explicitly out of scope for automation (see Section 2) and stays a manual check.

**Release (manual deploy)** — Entry: CI green on `main`. Exit: a 5-minute manual smoke check in production (login, view an existing `Edição`, favoritar something) — automate this once deploy frequency increases enough to justify it.

### 9. Quality Gates & Definition of Done

**PR gate** (every PR, GitHub Actions): `npm run lint` passes; `tsc --noEmit` passes; `vitest run` (unit + integration) passes; no decrease in coverage on `revisao.ts`/`agenda.ts`/`session.ts` specifically (not a blanket repo-wide number yet).

**Merge gate** (merge to `main`): same as PR gate — no separate preview-deploy infrastructure exists yet, so there's no additional environment to gate against. Add a Playwright run here once Phase 2 lands.

**Deploy gate** (manual, pre-Docker-deploy): CI green on `main` + the 5-minute manual smoke check above. No automated deploy gate yet — solo dev, low deploy frequency; formalize only if that changes.

A gate that isn't enforced in GitHub Actions branch protection is a checklist, not a gate — set branch protection to require the CI job once it exists.

### 10. Metrics & KPIs

| Metric | Definition | Target | Cadence |
|---|---|---|---|
| Coverage — `revisao.ts` | Branch coverage on the reconciliation module | ≥90% | Per PR |
| Coverage — `agenda.ts` | Branch coverage on conflict/free-time logic | ≥90% | Per PR |
| Coverage — `session.ts` | Branch coverage on auth sign/verify | 100% (small, security-critical) | Per PR |
| CI Pipeline Duration | Push to green/red signal | < 5 min | Weekly informal check |
| Extraction regressions | Golden-file test failures caught before merge vs. after (i.e., in production) | 0 escaped to prod | Per release |
| Known data-corruption incidents in `aplicarRevisao` | Manually logged whenever a `Revisao` produces a wrong create/update/cancel decision | 0 | Ongoing |

Deliberately excluded for now: defect escape rate, MTTR, automation rate, false-positive rate — these need a volume of releases/incidents that a solo hobby project doesn't generate yet. Revisit once CI has run for a quarter and there's real trend data (see `qa-metrics` skill when that point is reached).

### 11. Timeline & Milestones

**Phase 0 — Un-break the app (do first, before resuming Phase 1):**
- [x] ~~Create a second, disposable Supabase project dedicated to tests~~ — **still not done**; the real project (`ljfmrcubthrdmfnhkwbc`) is used directly for everything so far. Blocks `revisao.ts`/`agenda.ts` integration tests and safe e2e runs (see Section 12).
- [x] Schema pushed for Grupo/MembroGrupo/Edicao.grupoId (v1.5 — via hand-written DDL in `supabase/sql/002_grupos.sql` + `prisma db execute`, not `db push`, since `db push` can't introspect past the `Usuario → auth.users` FK; see that file's header comment for why).
- [ ] Rewrite `e2e/` entirely for the `/grupos/[grupoId]/...` route tree (v1.5 deleted `/edicoes/*`) — the v1.3-era plan to just fix the login form is no longer enough; the whole navigation flow changed. Create test accounts via the Supabase Admin API in `e2e/global-setup.ts`, and add a Grupo-creation + invite-link-join step before the old golden path. Still open.
- *Exit: `npm run test:e2e` passes again against a Supabase project, covering Grupo creation and the join-link flow.*

**Phase 1 — Foundation (Weeks 1-4):**
- [x] Install Vitest (v1.4 — `vitest.config.mts`, `test/setup.ts` loading `.env` via `dotenv/config`).
- [ ] Unit tests for `agenda.ts` (overlap detection, free-time windows, midnight rollover, default-duration fallback). Still open. (`ehCurador()`/`CURADOR_EMAIL` — the thing this line used to also cover — no longer exists, removed in v1.5.)
- [ ] Unit/integration tests for `grupos.ts`'s `exigirMembro`/`exigirCuradorDoGrupo`/`entrarNoGrupoPorCodigo` — new in v1.5, and per Section 5's new CRIT row, the single most valuable thing to test right now. Still open.
- [ ] Unit + integration tests for `aplicarRevisao`: new show created, time change cascades `ALTERADO` to favoritos, disappeared show cascades `CANCELADO`, reappearing show flips back to `ATIVO`. Blocked on the disposable test project (don't want these mutating the real one). Still open.
- [x] Integration tests for the `handle_new_user` trigger and the `Grupo`/`MembroGrupo` schema (v1.4 + v1.5 — `test/integration/database.test.ts`, 10 tests total: schema/FK/trigger existence, 3 trigger behavior cases, and 4 Grupo/MembroGrupo cases — creation, unique `codigoConvite`, unique-membership constraint, cascade delete).
- [ ] Minimal GitHub Actions workflow: lint + typecheck + `vitest run` on every PR, required via branch protection. Still open — blocked on the same test-project question.
- *Exit: CI blocks merges on unit/integration failures; `revisao.ts`/`agenda.ts`/`grupos.ts`/the trigger are covered.* Trigger and schema are covered; the rest isn't yet.

**Phase 2 — Extraction & Golden Path (Weeks 5-8):**
- Golden-file tests for `extraction-texto.ts`: well-formed fixture, fixture with unrecognized lines (asserts `linhasIgnoradas`), fixture that recognizes zero shows (asserts `ExtracaoInvalidaError`).
- Integration tests for authz: non-Curador hitting `criarEdicaoAction`/`uploadRevisaoAction`; user A touching user B's `Favorito`.
- Playwright was installed and a smoke suite (`e2e/smoke.spec.ts`) delivered ahead of schedule in v1.1 (2026-09-18), against the old invite-code login. The v1.3 auth rewrite broke it (Section 12); getting it running again against the new email/password form is Phase 0, not this phase — by Phase 2 it should just need the second authz-denial-style flow extended, not rebuilding from scratch.
- *Exit: extraction regressions caught before merge; Playwright smoke suite running locally against the test Supabase project.*

**Phase 3 — CI Hardening (Weeks 9-12):**
- Stand up the GitHub Actions workflow from Phase 1 (still outstanding) and add the Playwright smoke suite to it.
- Add the manual production smoke checklist to a `RELEASING.md` (or similar) so it's not tribal knowledge.
- Revisit coverage targets and this document itself.
- *Exit: lint + typecheck + unit + Playwright all run in CI; a documented (even if manual) release checklist exists.*

**Deferred / not scheduled:** visual regression, load testing, accessibility audit, contract testing, synthetic production monitoring — revisit only when a concrete trigger (more users, more deploy frequency, an actual incident) makes the investment pay for itself.

### 12. Risks to the Strategy Itself

- **Solo-dev bandwidth.** This is a side project; if testing setup competes with feature work, it will lose. Mitigation: Phase 1 is intentionally small (3 files, one CI workflow) so it's achievable in short sessions rather than requiring a dedicated block of time.
- **The text parser's format is rigid.** Removing the AI extraction modes (v1.1) means any lineup PDF that doesn't follow the exact expected format (`Palco: <nome>` / date line / `HH:mm - HH:mm Artista`) produces zero or partial results instead of a best-effort guess. This is an accepted, deliberate trade — predictability over flexibility — but it puts the burden on the Curador to source or reformat the PDF correctly; still no manual-review step before publish (per `CONTEXT.md`), so a malformed-but-not-empty upload (e.g., wrong year inferred) still reaches the whole group silently.
- **No staging environment** means the E2E suite is the closest thing to a pre-prod check; if it's skipped or flaky, bad changes reach the shared group directly. This is a bigger deal since v1.3 than it was on SQLite — a bad `db push --accept-data-loss` now hits a real shared Postgres instance, not a disposable local file (see Section 6). Mitigation: keep the E2E suite to 1-3 flows so it stays fast and reliable rather than expansive and ignored; get a second cheap Supabase project as staging before this matters more.
- **The Playwright smoke suite is obsolete, not just broken.** v1.3 changed the login form; v1.5 deleted the entire route tree it navigated (`/edicoes/*` → `/grupos/[grupoId]/edicoes/[edicaoId]`). Phase 0 now means a real rewrite, not a patch. What *is* verified: the whole Grupo lifecycle (create → invite link → second account joins via `/j/[codigo]` → cross-Grupo authz denial) was driven end-to-end with a real Playwright browser during this session against the live project — informally, output inspected manually, not a committed test. Treat that as "confirmed working once," not as regression protection; the next code change gets no safety net here until Phase 0 lands.
- **The Vitest integration suite runs against the real production Supabase project, not a disposable one.** Still no second, dedicated test project (Section 6/7's open question) — now overdue given the Grupo/MembroGrupo tests (v1.5) already create and delete real rows, not just read-only schema checks like before. Safe so far (everything self-cleans in a `finally`), but the blast radius of a test that *doesn't* clean up correctly has grown. Get the second Supabase project before writing `revisao.ts`/`agenda.ts` integration tests, which mutate `Show`/`Favorito` more heavily.
- **Open registration (ADR 0002) plus Grupos (ADR 0003) together changed who-sees-what twice.** ADR 0001's "everyone sees everything" assumption is gone — replaced first by "anyone can sign up" (0002) and now by "but each Grupo is its own isolated space" (0003). Net effect: the app is *more* isolated than the v1.0-v1.4 window was, not less — a Favorito is visible to a Grupo's members (per the CONTEXT.md glossary), not to every registered Usuário anymore. Worth double-checking `amigosPorShow`/`getAgenda` (`src/lib/agenda.ts`) don't need changes here — they already filter by `edicaoId`, which is now transitively Grupo-scoped, so this fell out for free rather than needing new code, but it's exactly the kind of assumption worth a direct test (Section 11, Phase 1).
- **This document goes stale if untouched.** Revisit at minimum when: a new extraction mode is added, a Grupo/membership-related incident occurs, a data-corruption incident occurs in `aplicarRevisao`, or Phase 0 closes and the "informally verified" caveats above need removing.

### 13. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-09-18 | Yuri Carvalho (with Claude Code) | Initial QA strategy — no prior test infrastructure existed. Scoped to startup team maturity: Vitest unit/integration on core `lib/` modules + one Playwright smoke path, minimal GitHub Actions gate. Deferred visual/perf/a11y/contract testing until a concrete trigger justifies them. |
| 1.1 | 2026-09-18 | Yuri Carvalho (with Claude Code) | Removed the Claude-vision and DeepSeek AI extraction modes (`extraction.ts`, `extraction-deepseek.ts`) in favor of requiring a correctly structured PDF and using only the deterministic text parser (`extraction-texto.ts`); dropped the `@anthropic-ai/sdk` dependency and the two API-key configs. Extraction risk score dropped from 20-CRIT to 8-MED. Implemented the first Playwright smoke tests (`e2e/`, golden path + authz-denial path) ahead of the Phase 2 schedule; CI wiring still outstanding. |
| 1.2 | 2026-09-18 | Yuri Carvalho (with Claude Code) | Adopted English as the standing language for all test code (titles, identifiers, comments), independent of the app's Portuguese UI/domain language — see the Language Convention note in Section 7. Renamed the existing `e2e/` suite accordingly. |
| 1.3 | 2026-09-18 | Yuri Carvalho (with Claude Code) | Database moved from SQLite to Supabase-hosted Postgres; auth moved from a custom invite-code cookie to Supabase Auth (email/password + Google OAuth), with open registration and `Curador` now computed from `CURADOR_EMAIL` (see ADR 0002). Updated the risk matrix (new `handle_new_user` trigger and `ehCurador()` rows; open-registration accepted-risk row), environment/tool sections (Postgres test DB strategy, no more free SQLite-file trick), and flagged the existing Playwright suite as broken and unverified pending a real Supabase test project — added as Phase 0 ahead of the existing timeline. |
| 1.4 | 2026-09-19 | Yuri Carvalho (with Claude Code) | Product renamed from "RTM Organizer" to "Agenda RTM" across the UI, manifest, and docs. Supabase project created and verified live (`ljfmrcubthrdmfnhkwbc`, `ACTIVE_HEALTHY`): schema pushed, `handle_new_user.sql` applied, Google OAuth provider enabled and confirmed via a real 302 to accounts.google.com. Vitest installed; `test/integration/database.test.ts` (6 tests) covers DB connectivity, schema, the `Usuario → auth.users` FK, and the trigger's actual behavior — dropped that risk row from 8-MED to 4-LOW. Playwright suite is still broken (unrelated, unchanged from v1.3). Flagged that the integration suite currently runs against the real project, not a disposable test one — safe for now (throwaway accounts only) but blocks writing `revisao.ts`/`agenda.ts` integration tests until that's resolved. |
| 1.5 | 2026-09-19 | Yuri Carvalho (with Claude Code) | Added `Grupo` as the sharing/multi-tenancy boundary (ADR 0003): any Usuário can create one and invite others via a per-Grupo link (`/j/[codigo]`); `Edição`/`Show`/`Favorito` now live inside a Grupo instead of globally. `Curador` changed again — no longer `CURADOR_EMAIL` (v1.3/1.4), now computed per-Grupo from `Grupo.criadoPorId`; `ehCurador()`/`CURADOR_EMAIL` removed entirely. Deleted and rebuilt the whole `/edicoes` route tree as `/grupos/[grupoId]/edicoes/[edicaoId]`, with every action re-verifying an Edição/Show actually belongs to the Grupo in the URL — added as the new top CRIT risk row (cross-Grupo authorization), the first CRIT item in this document that isn't `aplicarRevisao`. Schema pushed via hand-written DDL (`supabase/sql/002_grupos.sql`) instead of `db push`, which can't introspect past the `auth.users` FK; caught and fixed a real bug in that DDL during testing (`Grupo.criadoPorId` was `ON DELETE RESTRICT`, inconsistent with the rest of the schema and would've blocked account deletion — changed to `CASCADE`). `test/integration/database.test.ts` grew from 6 to 10 tests. Full Grupo/invite-link/cross-Grupo-denial flow verified live with a real 2-browser Playwright run (informal, not committed). Playwright `e2e/` suite is now obsolete (not just broken) — full rewrite needed, still the top Phase 0 item. |
