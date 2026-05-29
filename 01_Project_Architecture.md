# 01 — Project Architecture

> **Status**: Verified against source code as of 2026-05-29.
> **Source of truth**: This document describes the system as it exists. No proposed changes.

---

## 1. Technology Stack

| Layer | Technology | Version | Source |
|---|---|---|---|
| Runtime | React | 19.2.4 | `package.json` |
| Build Tool | Vite | 7.3.1 | `package.json` |
| Language | TypeScript | 5.9.3 | `package.json` |
| Styling | Tailwind CSS | 4.2.1 (via `@tailwindcss/vite`) | `package.json`, `vite.config.ts` |
| Component Library | shadcn/ui | new-york style, neutral base | `components.json` |
| State Management | Zustand | 5.0.13 | `package.json` |
| Backend | Supabase | 2.106.1 (`@supabase/supabase-js`) | `package.json` |
| Routing | react-router-dom | 6.30.3 | `package.json` |
| Forms | react-hook-form + zod | 7.72.0 / 4.3.6 | `package.json` |
| Notifications | Sonner | 2.0.7 | `package.json` |
| QR Codes | qrcode.react | 4.2.0 | `package.json` |
| Charts | Recharts | 3.8.0 | `package.json` (installed, not yet used in UI) |
| Date Utilities | date-fns | 4.1.0 | `package.json` (installed, not yet used in UI) |
| Theming | next-themes (replaced) | 0.4.6 | `package.json` (installed, but custom `ThemeProvider` is used instead) |

### Verified Facts
- The project uses Tailwind CSS v4 via the Vite plugin (`@tailwindcss/vite`), not PostCSS.
- shadcn/ui is configured with `"rsc": false` (no React Server Components).
- The `@` path alias maps to `./src` via `vite.config.ts`.

### Assumptions
- None. All stack details verified from `package.json`, `vite.config.ts`, and `components.json`.

### Installed But Unused Dependencies
- `recharts` — imported by `src/components/ui/chart.tsx` (shadcn chart primitive) but no page consumes it.
- `date-fns` — not imported by any source file.
- `next-themes` — the package is installed, but the app uses a custom `src/components/theme-provider.tsx` instead. The `next-themes` package is dead weight.
- `react-hook-form` + `@hookform/resolvers` + `zod` — imported by `src/components/ui/form.tsx` (shadcn form primitive) but no page uses the `<Form>` component. All forms use uncontrolled native `<form>` elements.
- `embla-carousel-react` — imported by `src/components/ui/carousel.tsx` (shadcn primitive) but not used in any page.
- `react-resizable-panels` — imported by `src/components/ui/resizable.tsx` (shadcn primitive) but not used in any page.
- `react-day-picker` — imported by `src/components/ui/calendar.tsx` (shadcn primitive) but not used in any page.
- `input-otp` — imported by `src/components/ui/input-otp.tsx` (shadcn primitive) but not used in any page.
- `cmdk` — imported by `src/components/ui/command.tsx` (shadcn primitive) but not used in any page.
- `vaul` — imported by `src/components/ui/drawer.tsx` (shadcn primitive). Used by `QRMenu.tsx`.

---

## 2. Build System

### Entry Point
```
index.html → src/main.tsx → ThemeProvider → App → BrowserRouter
```

### Build Commands
| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` — TypeScript check + production build |
| `npm run typecheck` | `tsc --noEmit` — type checking only |
| `npm run preview` | Serve production build locally |

### Output
- Production build outputs to `dist/` directory.
- The `dist/` directory is present in the repository (not gitignored based on `.gitignore` inspection needed).

### Verified Facts
- No custom Vite plugins beyond `react()` and `tailwindcss()`.
- No environment-specific build configurations.
- No code splitting or lazy loading — all routes are eagerly imported in `App.tsx`.

---

## 3. Module Architecture

### High-Level Module Map

```
src/
├── main.tsx                    ← Application entry point
├── App.tsx                     ← Router definition (all routes)
├── index.css                   ← Global styles + theme tokens
│
├── components/
│   ├── auth/                   ← Route guards (4 files)
│   ├── kitchen/                ← Kitchen-specific components (3 files)
│   ├── layout/                 ← Layout shells (2 files)
│   ├── ui/                     ← shadcn/ui primitives (55 files)
│   ├── theme-provider.tsx      ← Custom theme provider
│   └── mode-toggle.tsx         ← ORPHAN: never imported
│
├── pages/
│   ├── auth/                   ← Auth pages (5 files)
│   ├── admin/                  ← Admin pages (2 files)
│   ├── kitchen/                ← Kitchen pages (1 file)
│   └── public/                 ← Public pages (1 file)
│
├── hooks/                      ← Custom hooks (3 files)
├── store/                      ← Zustand store (1 file)
├── lib/
│   ├── supabase/client.ts      ← Supabase client singleton
│   └── utils.ts                ← cn() utility
│
└── types/
    ├── database.types.ts       ← Supabase-generated type definitions
    └── roles.ts                ← Role constants and helpers
```

### Dependency Direction (Verified)

```
Pages → Hooks → Supabase Client
Pages → Store
Pages → Components (ui, kitchen, layout)
Components/auth → Store → Supabase Client
Components/kitchen → Hooks (types only)
Components/layout → Store, Supabase Client, types/roles
```

No circular dependencies detected.

---

## 4. Three Application Surfaces

TABLO is a single-page application (SPA) serving three distinct user surfaces from the same domain and build:

### Surface Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TABLO SPA (one build, one domain)         │
│                                                              │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────┐ │
│  │  Admin Surface    │  │ Kitchen Surface  │  │ QR Menu    │ │
│  │                   │  │                  │  │ Surface    │ │
│  │  /admin/*         │  │  /kitchen/*      │  │ /menu/*    │ │
│  │                   │  │                  │  │            │ │
│  │  DashboardLayout  │  │  KitchenLayout   │  │  (none)    │ │
│  │  (sidebar + nav)  │  │  (topbar only)   │  │  self-     │ │
│  │                   │  │                  │  │  contained │ │
│  │  AdminRoute       │  │  KitchenRoute    │  │  No auth   │ │
│  │  (owner/manager)  │  │  (any member)    │  │            │ │
│  │                   │  │                  │  │            │ │
│  │  Light theme      │  │  .kitchen-theme  │  │ .premium-  │ │
│  │  (:root defaults) │  │  (dark)          │  │  qr-theme  │ │
│  └──────────────────┘  └─────────────────┘  └────────────┘ │
│           │                     │                  │         │
│           └─────────┬───────────┘                  │         │
│                     │                              │         │
│              Supabase (shared)                No login       │
│              Auth + Postgres + Realtime       required       │
│              + Storage                                       │
└─────────────────────────────────────────────────────────────┘
```

### Surface Details

| Property | Admin | Kitchen | QR Menu |
|---|---|---|---|
| **Layout** | `DashboardLayout` (collapsible sidebar) | `KitchenLayout` (minimal topbar) | None (self-contained page) |
| **Route guard** | `AdminRoute` → `ProtectedRoute` | `KitchenRoute` → `ProtectedRoute` | None |
| **Roles allowed** | `owner`, `manager` | `owner`, `manager`, `staff` | Anonymous |
| **Theme** | Light (`:root` CSS variables) | Dark (`.kitchen-theme` CSS class) | Dark (`.premium-qr-theme` CSS class) |
| **Pages** | MenuManagement, TableManagement | KitchenDashboard | QRMenu |
| **Realtime** | No | Yes (orders channel) | Yes (per-order status tracking) |
| **Supabase Auth** | Email+password, Google OAuth | PIN-based (deterministic email) | None (anon) |

---

## 5. Authentication Architecture

### Auth Flow Diagram

```
                    ┌──────────────┐
                    │   /login     │
                    │   /signup    │
                    │   /kitchen-  │
                    │    login     │
                    └──────┬───────┘
                           │
                    Supabase Auth
                    (email+password,
                     Google OAuth,
                     or PIN→email)
                           │
                    ┌──────▼───────┐
                    │ Session Token │
                    │ (localStorage)│
                    └──────┬───────┘
                           │
              ┌────────────▼────────────┐
              │     ProtectedRoute       │
              │                          │
              │ 1. Check session exists  │
              │ 2. Check membership      │
              │    (restaurant_members)  │
              │ 3. Load currentRestaurant│
              │    into Zustand store    │
              └────────────┬─────────────┘
                           │
              ┌────────────▼────────────┐
              │   AdminRoute (extra)     │
              │                          │
              │ Checks: canAccessAdmin() │
              │ (role = owner | manager) │
              │                          │
              │ Staff → /kitchen         │
              └──────────────────────────┘
```

### Two Authentication Paths

| Path | Who | How | Result |
|---|---|---|---|
| **Owner/Manager Login** | Restaurant owner or manager | Email + password at `/login`, or Google OAuth | Session with role from `restaurant_members` |
| **Kitchen Device Login** | Kitchen display device | 6-digit PIN at `/kitchen-login` | PIN → `get_kitchen_device_email` RPC → deterministic email `kitchen-{restaurantId}@tablo.app` → `signInWithPassword` → Session as `staff` |

### Session Management

| Behavior | Implementation |
|---|---|
| Session persistence | `persistSession: true` in Supabase client config |
| Auto-refresh | `autoRefreshToken: true` |
| URL detection | `detectSessionInUrl: true` (for OAuth callback) |
| Logout | `supabase.auth.signOut()` + `resetStore()` + navigate to `/login` |

### Verified Facts
- Sessions survive tab close, browser restart, and page refresh.
- All tabs in the same browser share the same session (Supabase uses localStorage).
- Kitchen devices and owner accounts MUST use different browsers or different devices.
- The `ProtectedRoute` component checks membership once and caches the result in Zustand.

---

## 6. State Management

### Zustand Store: `useRestaurantStore`

**File**: `src/store/useRestaurantStore.ts`

```typescript
interface RestaurantState {
  currentRestaurant: Restaurant | null;   // The active tenant
  activeMemberRole: MemberRole | null;    // owner | manager | staff
  isLoading: boolean;
  error: string | null;
}
```

**Actions**: `setRestaurant`, `setMemberRole`, `setIsLoading`, `setError`, `resetStore`

### Tenant Scoping Rule

> **`currentRestaurant` is the tenant boundary.**

Every data-fetching hook and every Supabase query extracts `restaurantId` from `currentRestaurant.id` in the Zustand store. This is the client-side tenant scope. The server-side tenant scope is enforced by RLS policies that check `restaurant_id` against the authenticated user's membership.

### Where Tenant ID Is Used (Verified)

| Consumer | How it gets `restaurantId` |
|---|---|
| `useMenuItems` hook | `useRestaurantStore().currentRestaurant?.id` |
| `useOrders` hook | `useRestaurantStore().currentRestaurant?.id` |
| `MenuManagementPage` | `useRestaurantStore().currentRestaurant?.id` |
| `TableManagementPage` | `useRestaurantStore().currentRestaurant?.id` |
| `KitchenDashboardPage` | via `useOrders` hook |
| `KitchenLayout` | `useRestaurantStore().currentRestaurant` (for reset broadcast) |
| `DashboardLayout` | `useRestaurantStore()` (for display only) |
| `QRMenuPage` | Does NOT use the store — resolves restaurant via URL `slug` parameter |

---

## 7. Theming System

### Three Theme Scopes

The application uses CSS custom properties for theming. Three scopes exist:

| Scope | CSS Selector | Applied To | Color Palette |
|---|---|---|---|
| Default (Admin) | `:root` / `.dark` | All pages unless overridden | Light: `#F8F9FA` background, teal primary (`oklch(0.52 0.09 192)`) |
| Kitchen | `.kitchen-theme` | `KitchenLayout` wrapper div | Dark: `#0f1117` background, teal `#3ecfb4` primary |
| QR Menu | `.premium-qr-theme` | `QRMenuPage` wrapper div | Dark: `#0a0a0b` background, soft teal `#5fd4c3` primary |

### Theme Application

- The `ThemeProvider` in `main.tsx` handles the system-level light/dark toggle (via `localStorage` key `"theme"`).
- Kitchen and QR Menu surfaces override this by applying their own CSS class (`.kitchen-theme` / `.premium-qr-theme`) to their root container element. This overrides all `--background`, `--foreground`, `--card`, `--primary`, etc. custom properties within that subtree.
- The keyboard shortcut `D` toggles light/dark mode globally (implemented in `theme-provider.tsx`).

### Typography

| Font | Usage | Loaded From |
|---|---|---|
| Inter (400, 500, 600) | All UI text across all surfaces | Google Fonts (CDN) |
| Fraunces (400, 600) | Display font class `.font-display` (available but minimally used) | Google Fonts (CDN) |
| Noto Sans Arabic (400–700) | Arabic locale in QR Menu | Google Fonts (CDN) |

---

## 8. Supabase Integration Architecture

### Services Used

| Supabase Service | How TABLO Uses It |
|---|---|
| **Auth** | Email+password login, Google OAuth, kitchen device provisioning (programmatic signUp) |
| **Database (Postgres)** | 7 tables, 6 RPC functions, row-level security |
| **Realtime** | Postgres Changes on `orders` table (INSERT, UPDATE), Broadcast channels for kitchen reset/invalidation |
| **Storage** | `menu-images` bucket for menu item images and restaurant logos |

### Client Configuration

**File**: `src/lib/supabase/client.ts`

- Single global `supabase` client created with `createClient<Database>()`.
- Typed with the full `Database` interface from `database.types.ts`.
- Two environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### Realtime Channels

| Channel | Table/Event | Subscriber | Purpose |
|---|---|---|---|
| `kitchen-{restaurantId}` | `orders` INSERT | `useOrders` hook | New order notification + optional audio chime |
| `kitchen-{restaurantId}` | `orders` UPDATE | `useOrders` hook | Status change sync |
| `kitchen-{restaurantId}` | Broadcast: `kitchen_reset` | `useOrders` hook | Clear kitchen board, set new `kitchen_reset_at` |
| `kitchen-{restaurantId}` | Broadcast: `kitchen_invalidate` | `useOrders` hook | Force sign-out when kitchen code is regenerated |
| `public-order-{orderId}` | `orders` UPDATE (per order) | `QRMenuPage` | Live order status tracking for customer |

### Storage

| Bucket | Access | Purpose |
|---|---|---|
| `menu-images` | Public read, authenticated write | Menu item images and restaurant logos. Files stored under `{restaurantId}/{uuid}.{ext}` path pattern. |

---

## 9. Data Flow Summary

### Order Lifecycle

```
Customer (QR Menu)                Kitchen Display               Admin
─────────────────                ─────────────────             ──────
1. Scan QR code
2. Browse menu
3. Add items to cart
4. Place order ───────────────►  5. Order appears (Realtime)
   (create_order_atomic RPC)         Sound chime plays
                                 6. Staff taps "Start"
                                    status → preparing ──────►  Customer sees "Preparing"
                                 7. Staff taps "Complete"
                                    status → completed ─────►  Customer sees "Ready"
```

### Menu Management Flow

```
Admin Dashboard                  Supabase                     QR Menu
───────────────                  ────────                     ───────
1. Add category ──────────────►  categories table
2. Add menu item ─────────────►  menu_items table
3. Upload image ──────────────►  menu-images bucket
4. Toggle availability ───────►  menu_items.is_available
                                                              5. Customer loads menu
                                                                 (fetches available items)
```

---

## 10. Missing Information

| Item | Status |
|---|---|
| CI/CD pipeline | None detected. No GitHub Actions, no Vercel config, no Netlify config. |
| Error monitoring | None. No Sentry, LogRocket, or similar. |
| Analytics | None. No Google Analytics, Mixpanel, or similar. |
| Testing | None. No test files, no test framework configured. |
| API rate limiting | Relies entirely on Supabase defaults. |
| Email verification flow | Supabase handles this, but no custom confirmation page exists. |
| Password reset flow | Not implemented. No "Forgot Password" link or page. |
