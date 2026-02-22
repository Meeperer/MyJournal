# Myjo — Improvement Ideas & Backlog

This document lists improvements identified from scans of the journaling system. Use it as a prioritized backlog. **Note:** Many items (Zod validation, rate limiting, unit tests, versions UI, streaks, tags, prompts, offline queue, FTS, streaming export, PDF export) are already in place; below reflects the current state.

**Stack:** Next.js 16, Prisma 7, PostgreSQL, next-auth, Vitest, Playwright, Tailwind v4.

---

## 1. Security (high priority)

| Location | Issue | Recommendation |
|----------|--------|-----------------|
| `src/app/api/register/route.ts` | ~~No rate limiting~~ | ✅ Rate limit by IP; 429 when exceeded. |
| `src/app/api/register/route.ts` | ~~No server-side validation~~ | ✅ Zod `registerBodySchema`; 400 on invalid. |
| `src/app/api/register/route.ts` | ~~Inconsistent API shape~~ | ✅ Uses `json400`/`json409`/`jsonError`. |
| `src/lib/env.ts` | ~~NEXTAUTH_SECRET/DATABASE_URL not checked~~ | ✅ `validateRequiredEnv()` in instrumentation. |
| `src/app/api/entries/export/route.ts` | ~~Full export no cap~~ | ✅ Full export now streams (no 413 cap); single entry unchanged. |
| `src/app/api/entries/versions/restore/route.ts` | ~~Body manual~~ | ✅ Zod `parseRestoreVersionBody`. |
| `src/app/api/entries/search/route.ts` | ~~q no max length~~ | ✅ 400 when q.length > 200. |
| Repo root | ~~No `.env.example`.~~ | ✅ Added `.env.example` with placeholders. |
| `next.config.ts` | No security headers. | Add `headers()` with `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and optionally `Content-Security-Policy` for production. |
| Client / API | No `dangerouslySetInnerHTML` or `eval` in app code. | ✅ No XSS vectors found in `src/`. |

---

## 2. Code quality & consistency

| Location | Issue | Recommendation |
|----------|--------|-----------------|
| All protected API routes | ~~Repeated session + findUnique~~ | ✅ `getAuthenticatedUser()` in `@/lib/auth`; all routes use it. |
| `src/app/api/entries/export/route.ts` | ~~Manual VALID_FORMATS/SCOPES~~ | ✅ Zod `parseGetExportQuery`. |
| `src/app/api/entries/route.ts` | ~~Date parsing duplicated~~ | ✅ `parseEntryDate()` in `date.ts`; used in GET/DELETE. |
| `src/app/api/entries/versions/route.ts` | ~~Manual date parsing~~ | ✅ Uses `parseEntryDate(searchParams.get("date"))` from `@/lib/date`. |
| `src/lib/validation.ts` | ~~No register schema~~ | ✅ `registerBodySchema`, `parseRegisterBody`; template schemas added. |
| `src/components/JournalEntryPanel.tsx` | Large component (700+ lines) | Partially split: `EntryVersionHistory`, `EntryEditorToolbar` extracted. Consider further extraction (e.g. form section, overview panel). |
| `scripts/create-test-user.ts` | ~~Hardcoded credentials~~ | ✅ Env `TEST_USER_EMAIL`/`TEST_USER_PASSWORD`; dev-only note. |

---

## 3. Performance

| Location | Issue | Recommendation |
|----------|--------|-----------------|
| `src/lib/rate-limit.ts` | In-memory Map; resets on deploy/restart. | For production with multiple instances, use a shared store (Redis/Upstash) or Vercel KV; keep in-memory as dev fallback. |
| `src/app/api/entries/route.ts` | Two sequential DB calls for upsert path. | If acceptable, combine in a transaction to reduce round-trips. |
| `src/lib/search-entries.ts` | ~~Two queries with same where~~ | ✅ FTS path uses parallel `$queryRaw`; fallback uses `Promise.all` (findMany + count). Postgres FTS with GIN index in place. |
| `src/components/Calendar.tsx` | Previews refetched on every `previewsVersion` change. | Optional: cache by `year-month` and invalidate only when an entry in that month is saved/deleted. |

---

## 4. UX & accessibility

| Location | Issue | Recommendation |
|----------|--------|-----------------|
| `src/components/Calendar.tsx` | ~~“Today” no aria-label~~ | ✅ `aria-label="Go to today"`. |
| `src/components/Calendar.tsx` | ~~No loading state for previews~~ | ✅ `aria-busy` and `aria-live` on grid; `previewsLoading` state. |
| `src/components/SearchEntries.tsx` | ~~“Searching…” not announced~~ | ✅ `role="status"` and `aria-live="polite"`. |
| `src/components/JournalEntryPanel.tsx` | Overview during save | ✅ Skeleton with `aria-busy` when saving. |
| `src/app/layout.tsx` | ~~No skip link~~ | ✅ Skip link to `#main`; `.skip-link` in globals. |
| `src/components/JournalEntryPanel.tsx` | Modal focus trap. | Ensure all focusable elements included in `useFocusTrap`; currently covers overview modal. |
| Mobile | ~~Calendar / entry layout~~ | ✅ Bottom sheet on small viewports; ~44px touch targets on calendar. |
| App root | No React error boundary. | Add `src/app/error.tsx` (and optionally `global-error.tsx`) for graceful error UI. |

---

## 5. Testing

| Location | Issue | Recommendation |
|----------|--------|-----------------|
| `src/app/api/register/route.ts` | ~~No tests~~ | ✅ `route.test.ts`: 400, 409, 201, 429. |
| `src/app/api/entries/export/route.ts` | ~~No tests~~ | ✅ Tests for 401, 400, 404, 413, 200. |
| `src/app/api/entries/search/route.ts` | ~~No tests~~ | ✅ Tests for 401, 400 (q length, page), 200. |
| `src/app/api/entries/versions/route.ts`, `restore/route.ts` | ~~No tests~~ | ✅ Route tests for auth, validation, success. |
| E2E | ~~Single E2E~~ | ✅ E2E register → login; README documents `E2E_USER_*`. |
| `vitest.config.ts` | ~~No coverage~~ | ✅ `test:coverage` and v8 coverage config. |
| `src/lib/validation.ts` | ~~Edge cases~~ | ✅ parseRegisterBody, parseGetExportQuery, parseRestoreVersionBody covered. |
| New routes | Stats, tags, prompts, on-this-day, templates, export PDF. | Add route tests for auth and validation where valuable. |

---

## 6. DevOps & DX

| Location | Issue | Recommendation |
|----------|--------|-----------------|
| `README.md` | ~~Default template~~ | ✅ Project intro (Myjo), scripts table, E2E/CI subsection. |
| Repo root | ~~No `.env.example`.~~ | ✅ Done. |
| `package.json` | ~~No script to run DB migrations.~~ | ✅ `db:migrate`, `db:push`; documented in README. |
| API routes | Errors logged with `console.error` only. | For production, consider a small logger (e.g. Pino) with levels and optional request ID. |
| Prompts | Daily prompt feature. | Seed prompts via `npx tsx scripts/seed-prompts.ts`; document in README if needed. |

---

## 7. Dependencies

| Location | Issue | Recommendation |
|----------|--------|-----------------|
| `package.json` | No `npm audit` or overrides mentioned. | Run `npm audit` regularly; fix high/critical; add `overrides` only if necessary and document. |
| `npm audit` | Vulnerabilities in dev deps. | Run `npm audit fix` for non-breaking fixes; track Prisma/ESLint upstream; avoid `--force` unless upgrading intentionally. |
| Next.js 16 / React 19 | Stack is current; Prisma 7 and next-auth 4 in use. | When next-auth v5 is adopted, plan for session/jwt callback and env changes. |

---

## 8. Summary — suggested priority order

1. **Security:** Add security headers in `next.config.ts` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, optional CSP).
2. **Code quality:** Consider further splitting `JournalEntryPanel` (form block, overview block).
3. **Testing:** Add route tests for `/api/entries/stats`, `/api/entries/tags`, `/api/prompts/daily`, `/api/entries/on-this-day`, `/api/templates`, `/api/entries/export/pdf` where useful.
4. **DevOps/DX:** Structured logging / request ID; add `error.tsx` (and optionally `global-error.tsx`) for error boundaries.
5. **Performance:** Rate limit store for multi-instance; optional calendar preview cache.
6. **Dependencies:** Run `npm audit fix` (non-breaking); track upstream for dev-dependency vulns.

---

## 9. Implemented features (current state)

- **Entry CRUD:** Create, read, update, soft-delete; one entry per user per day.
- **Edit history / versions:** `EntryVersion` model; GET versions by date/entryId; POST restore; **UI:** History modal in entry panel with diff view (old vs current) and “Restore this version”.
- **Streaks and stats:** `GET /api/entries/stats` (streak current/longest, thisWeek, thisMonth); dashboard block above calendar.
- **Tags as filters:** `parseTags` / `tagFilterForPrisma` in `@/lib/tags`; `GET /api/entries/tags`; optional `tag` on previews and search; TagsCloud on dashboard; calendar and search filter by tag; tag suggestions in entry panel.
- **Mood and tags in calendar:** Previews API returns `mood` and `firstTag`; calendar cells and tooltips show mood hint and first tag.
- **Daily prompt:** `Prompt` model; `GET /api/prompts/daily` (rotation by day of year); seed script; prompt shown in panel when viewing today.
- **Mobile:** Bottom sheet for entry panel on small viewports; calendar remains in view.
- **On this day:** `GET /api/entries/on-this-day?month=&day=`; modal listing past years’ entries; click to open that date.
- **Rich text / focus:** Toolbar (Bold, Italic, Heading, List) inserting Markdown; Focus mode (one paragraph at a time with prev/next).
- **Entry templates:** `UserTemplate` model; GET/POST `/api/templates`, PATCH/DELETE `/api/templates/[id]`; TemplatesList modal (list, Use, Delete, Create); “Start from template” in panel when body empty.
- **Offline / PWA:** Service worker caches previews and GET entry by date; client offline queue for failed save/delete; drain on online; `manifest.json`; OfflineIndicator shows queue count and “Syncing…”.
- **Full-text search:** Postgres `search_vector` (tsvector) + GIN index; `searchEntries` uses FTS when query non-empty, fallback to ILIKE.
- **Export:** JSON/Markdown single entry; **full export streams** (cursor-based batches); **PDF export** `GET /api/entries/export/pdf?date=...` or `?from=&to=` (max 31 days) via jspdf.

---

## 10. Scan metadata

- **Last full scan:** 2026-02-21 (post–12-feature implementation).
- **Scope:** Security; code quality (auth, validation, date parsing); performance (rate limit, search FTS, export streaming); UX/a11y; testing; DevOps; dependencies; implemented features.
- **Notes:** Versions GET uses `parseEntryDate`. Export full scope no longer capped (streaming). No `dangerouslySetInnerHTML`/`eval` in `src`. Auth enforced server-side on all protected routes.

*Prioritize items by impact and effort.*
