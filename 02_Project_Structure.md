# Project Structure

## 1. Complete repository tree

```text
public/
  assets/
    tablo-cover.png
  vite.svg
src/
  App.tsx
  index.css
  main.tsx
  vite-env.d.ts
  components/
    auth/
      AdminRoute.tsx
      KitchenRoute.tsx
      ProtectedRoute.tsx
      RoleRedirect.tsx
    kitchen/
      CancelledOrdersDrawer.tsx
      KanbanColumn.tsx
      OrderCard.tsx
    layout/
      DashboardLayout.tsx
      KitchenLayout.tsx
    mode-toggle.tsx
    theme-provider.tsx
    ui/
      (various shadcn/ui primitives)
  hooks/
    use-mobile.ts
    useMenuItems.ts
    useOrders.ts
  lib/
    supabase/
      client.ts
    utils.ts
  pages/
    admin/
      MenuManagement.tsx
      TableManagement.tsx
    auth/
      AuthCallback.tsx
      KitchenLogin.tsx
      Login.tsx
      Onboarding.tsx
      SignUp.tsx
    kitchen/
      KitchenDashboard.tsx
    public/
      QRMenu.tsx
  store/
    useRestaurantStore.ts
  types/
    database.types.ts
    roles.ts
supabase/
  migrations/
    20260524202525_initial_schema.sql
    20260524205655_add_public_menu_read_policies.sql
    20260524210534_enable_realtime_orders.sql
    20260525202600_storage_buckets.sql
    20260526000000_public_order_inserts.sql
    20260526000001_create_order_rpc.sql
    20260526000002_fix_rpc_security.sql
    20260526180000_phase4_operational_metadata.sql
    20260527000000_kitchen_access.sql
    20260527000001_fix_kitchen_rpc.sql
    20260527000002_kitchen_rpc_debug.sql
    20260527000003_kitchen_signup_refactor.sql
    20260527200000_restaurant_branding.sql
```
*(Note: `docs/` and `scripts/` directories were requested for inspection but do not currently exist in the repository.)*

## 2. File ownership map

| Path | Purpose | Imports | Consumers | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `src/App.tsx` | App entry point & Router | Routes, Layouts, Auth Guards | `src/main.tsx` | Contains legacy redirects |
| `src/store/useRestaurantStore.ts` | Global state (Zustand) | `database.types.ts` | Pages, Layouts, Hooks | Holds active restaurant and role context |
| `src/lib/supabase/client.ts` | Supabase initialization | `@supabase/supabase-js` | Entire application | |
| `src/hooks/useOrders.ts` | Realtime kitchen orders logic | `useRestaurantStore.ts`, `supabase/client.ts` | `KitchenDashboard.tsx` | Subscribes to Postgres changes and handles sound alerts |

## 3. Route ownership map

| Route | Owner File | Layout | Guard |
| :--- | :--- | :--- | :--- |
| `/login` | `Login.tsx` | None | None |
| `/kitchen-login` | `KitchenLogin.tsx` | None | None |
| `/signup` | `SignUp.tsx` | None | None |
| `/onboarding` | `Onboarding.tsx` | None | None |
| `/auth/callback` | `AuthCallback.tsx` | None | None |
| `/menu/:slug/:tableId`| `QRMenu.tsx` | None | None |
| `/admin/*` | `App.tsx` | `DashboardLayout` | `AdminRoute` |
| `/admin/menu` | `MenuManagement.tsx` | `DashboardLayout` | `AdminRoute` |
| `/admin/tables` | `TableManagement.tsx` | `DashboardLayout` | `AdminRoute` |
| `/kitchen/*` | `App.tsx` | `KitchenLayout` | `KitchenRoute` |
| `/kitchen/orders` | `KitchenDashboard.tsx`| `KitchenLayout` | `KitchenRoute` |

## 4. Data ownership map

* **Authentication:** Supabase Auth (`Login.tsx`, `SignUp.tsx`, `KitchenLogin.tsx`, `AuthCallback.tsx`)
* **Restaurant Context:** `useRestaurantStore.ts` (queries `restaurant_members`, `restaurants`)
* **Menu Management:** `MenuManagement.tsx` (queries `menu_items`, `menu_categories`)
* **Table Management:** `TableManagement.tsx` (queries `restaurant_tables`)
* **Kitchen Orders:** `useOrders.ts` (queries & updates `orders`, queries `order_items`)
* **Realtime:** Supabase Channels in `useOrders.ts` (`kitchen-${restaurantId}`)
* **QR Ordering:** `QRMenu.tsx` (uses public RLS policies to read menu, inserts into `orders`)
* **Storage Uploads:** Initialized in Supabase migrations (`bucket: restaurant-assets`) but no UI implementation found yet.

## 5. Kitchen structure map

* **`KitchenLayout.tsx`** (Provides topbar, session reset logic, logout)
  * **`KitchenDashboard.tsx`** (Consumes `useOrders.ts` hook for state and realtime updates)
    * **`CancelledOrdersDrawer.tsx`** (Displays cancelled orders in a sheet)
      * **`OrderCard.tsx`** (Displays individual cancelled order)
    * **`KanbanColumn.tsx`** (Groups orders into Pending, Preparing, Completed)
      * **`OrderCard.tsx`** (Displays the active order details and provides action buttons)

* **Data Provider:** `useOrders.ts` (Hooks into Zustand `useRestaurantStore` for `restaurantId`, provides `orders` array, realtime connection status, and action functions).

## 6. Legacy / unused inventory

* **Orphan Components:**
  * `src/components/mode-toggle.tsx` (Verified unused; not imported anywhere).

* **Legacy Routes:**
  * `/dashboard/menu` -> redirects to `/admin/menu`
  * `/dashboard/kitchen` -> redirects to `/kitchen/orders`
  * `/dashboard/tables` -> redirects to `/admin/tables`
  * `/dashboard` -> redirects to `/admin`

* **Dead Code / Deprecated Files:**
  * The `/dashboard` prefix was clearly deprecated in favor of `/admin` and `/kitchen` prefixes, as evidenced by the explicit legacy redirects in `App.tsx`.
