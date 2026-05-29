# Open Gaps and Risks Assessment

This document provides a verified risk and gap assessment of the TABLO project based on a comprehensive repository inspection. 

## Current Project Maturity

* **Production ready:** 
  * Table & QR Management (`TableManagement.tsx`, dynamic QR generation via `qrcode.react`).
  * Menu Management (`MenuManagement.tsx` including Supabase Storage integration for images).
  * Authentication workflows (Login, Signup, Role-based redirects).
  * Basic Kitchen Dashboard layout and Kanban status updates.
* **Partially complete:** 
  * Kitchen audio alerts (Implemented as a synthetic 2-tone Web Audio API beep in `KitchenDashboard.tsx`, but lacks audio sprite fallback or reliable playback across aggressive browser auto-play policies).
  * Supabase Storage uploads (Implemented in UI, but relies on brittle client-side "best-effort" deletions when replacing images).
* **Still missing:**
  * Automated testing (No Jest, Vitest, or Playwright configurations).
  * CI/CD pipelines.
  * Server-side garbage collection for orphaned storage assets.
  * Offline fallback and sync queues.

## Architectural Risks

* **routing:** The `App.tsx` file contains legacy redirects (`/dashboard/*` to `/admin/*` and `/kitchen/*`). While functional, they increase router complexity and should be gracefully deprecated.
* **tenant isolation:** Relies heavily on implicit state binding (`useRestaurantStore`) and Postgres RLS `public.get_member_role()`. Any flaw in the custom RLS function could theoretically lead to cross-tenant data leakage.
* **auth:** The Kitchen login flow is a non-standard workaround. It spoofs standard email/password Auth by binding a PIN code as a password for a generated email address (`kitchen-[id]@tablo.app`).
* **realtime:** Supabase `useOrders` relies entirely on `postgres_changes`. If the websocket connection drops and reconnects, missed `INSERT` or `UPDATE` events are not automatically synchronized without a manual refresh.
* **kitchen workflows:** Order status updates use optimistic UI updates that rollback on failure. While UX is responsive, frequent network drops will cause jarring "rubber-banding" for kitchen staff.

## Database Risks

* **migrations:** Heavy reliance on complex Pl/pgSQL functions for security.
* **legacy RPCs:** Migration `20260527000001_fix_kitchen_rpc.sql` creates a legacy RPC function `provision_kitchen_device` that attempts to write directly to `auth.users` (an anti-pattern). This was bypassed/abandoned in `20260527000003_kitchen_signup_refactor.sql` but the legacy RPC still exists in the database.
* **RLS assumptions:** The `menu-images` storage bucket relies on complex string parsing `(storage.foldername(name))[1]::uuid` inside the RLS policy to enforce tenant isolation. If a client constructs a malformed path, it may circumvent the checks.
* **deployment discipline:** No automated CI/CD for verifying or running migrations against a staging environment before production.

## Frontend Risks

* **orphan components:** `src/components/mode-toggle.tsx` is completely unused in the codebase.
* **unused dependencies:** The project is built from a `shadcn-ui-template` and retains several dependencies in `package.json` that may not be fully utilized, risking bundle bloat.
* **dead code:** Legacy `provision_kitchen_device` RPC (Database) and legacy route components (Frontend).
* **legacy routes:** The `/dashboard` namespace is still maintained in the React Router solely for backwards compatibility.
* **missing UI integrations:** The Kitchen Dashboard has an offline indicator, but there is no queueing mechanism to sync actions taken while offline.

## Kitchen Risks

* **optimistic updates:** As noted, failed updates immediately rollback the local state. There is no automated retry logic for dropped requests.
* **realtime edge cases:** If `useOrders` receives an `UPDATE` payload for an order that hasn't been fetched yet (race condition), it silently ignores the update rather than requesting the missing order.
* **device provisioning risks:** The table management UI creates the kitchen `auth.users` row using a temporary, unpersisted Supabase client (`tempAuthClient.auth.signUp`). If the browser closes mid-execution (between signUp and the subsequent `bind_kitchen_device` RPC), the auth user is orphaned and the kitchen device cannot log in.
* **reset workflow risks:** The `kitchen_reset` event broadcasts via Realtime to clear the board. If a kitchen device is offline during the broadcast, it will remain out of sync until a hard page reload.

## Storage Risks

* **orphan uploads:** The UI uses a "best-effort" client-side deletion when a user replaces a menu image or restaurant logo. If the network drops *after* the new image is uploaded but *before* the database row is updated, the newly uploaded image is permanently orphaned. 
* **missing cleanup flows:** There are no cron jobs, edge functions, or database triggers designed to clean up `storage.objects` that are no longer referenced by `menu_items.image_url` or `restaurants.logo_url`.

## Operational Risks

* **no monitoring:** Missing error tracking (e.g., Sentry) and performance monitoring (e.g., Datadog).
* **no analytics:** No user telemetry or usage metrics (e.g., PostHog).
* **no testing:** `package.json` contains no test scripts. The application relies entirely on manual verification.
* **no CI/CD:** No GitHub Actions or deployment pipelines are defined in the repository.

## Technical Debt Inventory

* **HIGH:** 
  * Kitchen provisioning logic: Client-side orchestrated Auth spoofing using `tempAuthClient` is highly brittle.
  * Realtime state sync: Lack of missed-event reconciliation upon websocket reconnection.
* **MEDIUM:** 
  * Storage orphans: Lack of automated cleanup for unreferenced `menu-images`.
  * Optimistic updates: Lack of automatic retries on network failures.
* **LOW:** 
  * Orphan components (`mode-toggle.tsx`).
  * Legacy `/dashboard` router redirects.
  * Legacy `provision_kitchen_device` database RPC.

## Recommended Next Actions

* **Immediate:** 
  * Implement connection-recovery sync in `useOrders.ts` to refetch active orders whenever the Supabase realtime channel transitions from offline back to `SUBSCRIBED`.
  * Add a basic testing framework (Vitest/Playwright) to prevent regressions on core flows.
* **Short Term:** 
  * Implement a Supabase Edge Function or pg_cron job to periodically sweep and delete `storage.objects` not referenced by any database row.
  * Deprecate and remove the legacy `/dashboard` routes and the `provision_kitchen_device` RPC.
* **Long Term:** 
  * Re-architect the Kitchen device authentication. Instead of spoofing email/password accounts with PINs, implement a proper device-token flow or secure hardware provisioning protocol.

---

### Verification Note
* **Verified Facts:** File paths, RPC names, component behaviors, storage upload mechanisms, and routing rules are based on direct source code inspection.
* **Assumptions:** Assuming standard deployment platforms (Vercel/Netlify) and default Supabase edge behavior since deployment config files are missing.
* **Unknown Information:** Production database scale, actual user traffic patterns, and whether an external CI/CD tool (outside of this repository) is being used.
