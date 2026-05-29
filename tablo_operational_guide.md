# TABLO — Operational Understanding & Deployment Guide

> **Purpose**: Everything a person needs to know to understand, deploy, and operate TABLO in a real restaurant.
> **Audience**: Restaurant operators, deployment engineers, and the product owner.
> **Constraint**: Describes the system as it exists today. No proposed changes.

---

## 1. What TABLO Is

TABLO is a single web application with **three surfaces**:

| Surface | Who uses it | What device | What it does |
|---|---|---|---|
| **Admin Dashboard** | Restaurant owner or manager | Laptop or tablet | Manage the menu, manage tables, generate QR codes, generate the kitchen access code |
| **Kitchen Display** | Kitchen staff (and optionally the owner) | Dedicated kitchen screen or tablet | View and manage incoming orders in real time |
| **Public QR Menu** | Customers | Their own phone | Scan a QR code at the table, browse the menu, place orders, track order status |

### These Are Not Three Separate Apps

All three surfaces are served from the **same URL** (same domain, same deployment). They are different *pages within one website*. The URL path determines which surface you see:

- `yoursite.com/admin/...` → Admin Dashboard
- `yoursite.com/kitchen/...` → Kitchen Display
- `yoursite.com/menu/...` → Public QR Menu

There is no separate "kitchen app" or "customer app" to install. Everything is accessed through a web browser.

### Surface Relationship Diagram

```
┌─────────────────────────────────────────────────────┐
│                    TABLO (one website)               │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Admin       │  │   Kitchen    │  │  QR Menu   │ │
│  │   Dashboard   │  │   Display    │  │  (Public)  │ │
│  │              │  │              │  │            │ │
│  │  Owner only  │  │  All staff   │  │  Anyone    │ │
│  │  /admin/*    │  │  /kitchen/*  │  │  /menu/*   │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│         │                  │                │        │
│         └──────────┬───────┘                │        │
│                    │                        │        │
│              Same database              No login     │
│              Same orders table          required     │
│              Same menu data                          │
└─────────────────────────────────────────────────────┘
```

---

## 2. Route Map

### Routes That Require Login

| URL | What it is | Who can access | What happens if unauthorized |
|---|---|---|---|
| `/admin` | Admin home (redirects to `/admin/menu`) | Owner, Manager | Staff → redirected to `/kitchen`. No session → redirected to `/login`. |
| `/admin/menu` | Menu management (add/edit/delete items, categories) | Owner, Manager | Same as above |
| `/admin/tables` | Table & QR management + Kitchen code generation | Owner, Manager | Same as above |
| `/kitchen` | Kitchen home (redirects to `/kitchen/orders`) | Owner, Manager, Staff | No session → redirected to `/login` |
| `/kitchen/orders` | Live order board (Kanban view) | Owner, Manager, Staff | No session → redirected to `/login` |

### Routes That Do NOT Require Login

| URL | What it is | Who uses it |
|---|---|---|
| `/login` | Owner/manager email + password login | Restaurant owners |
| `/kitchen-login` | Kitchen device PIN login | Kitchen staff setting up a display |
| `/signup` | New account registration | New restaurant owners |
| `/onboarding` | First-time restaurant setup (name, URL slug) | Newly registered owners |
| `/menu/{slug}/{tableId}` | Customer-facing QR menu for a specific table | Customers who scanned a QR code |

### Automatic Redirects

| If you visit... | You get sent to... | Why |
|---|---|---|
| `/` or any unknown path | `/admin` (if owner/manager) or `/kitchen` (if staff) | Catch-all routing based on role |
| `/admin` (as staff) | `/kitchen` | Staff cannot access admin |
| Any protected route (no login) | `/login` | Must authenticate first |
| Any protected route (logged in, no restaurant) | `/onboarding` | Must create a restaurant first |
| `/dashboard/...` (old URLs) | `/admin/...` or `/kitchen/...` | Legacy bookmarks still work |

---

## 3. Kitchen Model

### The Core Answer

**The kitchen is one page.** Owner/admin and kitchen staff see the **exact same screen**. There are NOT two different kitchen pages.

The only difference is **one button**:

| Control | Owner / Manager | Staff |
|---|---|---|
| See all orders (Pending, Preparing, Completed) | ✅ Yes | ✅ Yes |
| Accept orders (move Pending → Preparing) | ✅ Yes | ✅ Yes |
| Complete orders (move Preparing → Completed) | ✅ Yes | ✅ Yes |
| Cancel orders | ✅ Yes | ✅ Yes |
| Toggle sound alerts for new orders | ✅ Yes | ✅ Yes |
| Manually refresh the order list | ✅ Yes | ✅ Yes |
| View cancelled orders drawer | ✅ Yes | ✅ Yes |
| Logout | ✅ Yes | ✅ Yes |
| **"Start Fresh Session" button** | ✅ **Yes** | ❌ **Not visible** |

### What "Start Fresh Session" Does

This button clears the visible order board. It does NOT delete orders from the database. It sets a time filter so the kitchen display only shows orders placed *after* the reset. Think of it as "starting a new shift."

### Kitchen Login Flow

Kitchen devices do NOT use email + password. They use a **6-digit PIN code**:

```
1. Owner generates a Kitchen Access Code in Admin → Tables & QR page
2. Kitchen staff opens /kitchen-login on the kitchen device
3. Staff enters the 6-digit code
4. The system looks up which restaurant this code belongs to
5. The system logs the device in as a "staff" user for that restaurant
6. The kitchen display opens automatically
```

### Kitchen Display Behavior

Once logged in, the kitchen display:

- Shows a **three-column Kanban board**: Pending → Preparing → Completed
- **Receives new orders in real time** (no manual refresh needed) via live database connection
- Plays an **optional audio chime** when a new order arrives (must be enabled by clicking the sound button)
- Shows a **live connection indicator** (green "Live" dot = connected, red "Offline" = disconnected)
- Shows the **restaurant name** and **user role** in the header

### What Happens When the Kitchen Code Is Regenerated

When the owner generates a new kitchen code:

1. The old code stops working immediately
2. **Connected** kitchen devices are signed out automatically and redirected to the login screen
3. **Disconnected** kitchen devices (WiFi issues, browser backgrounded) will continue working temporarily until their session expires naturally (up to ~1 hour)
4. All kitchen devices must re-enter the new code to reconnect

---

## 4. Auth + Session Model

### How Login Works (In Plain Terms)

When someone logs in (either owner or kitchen staff), the system stores a **session token** in the browser's local storage. This token is like a digital key card — it proves who you are without needing to re-enter your password.

| What it means | How it works |
|---|---|
| Closing a tab does NOT log you out | The token stays in the browser's storage |
| Refreshing the page does NOT log you out | The token is read from storage on load |
| Closing and reopening the browser does NOT log you out | The token persists across browser restarts |
| Using incognito DOES start fresh | Incognito has its own empty storage |
| A different browser IS a different session | Chrome and Safari have separate storage |

### Why Tabs Affect Each Other

All tabs in the same browser (same profile, not incognito) **share the same session**. This means:

- If you log out in one tab, **all tabs in that browser** are logged out
- If someone logs in as the kitchen user in a tab, the owner session in another tab **is replaced**

> **Operational rule**: Never log into the kitchen in the same browser where the owner is using the admin dashboard. Use a **separate device** or a **separate browser** for the kitchen display.

### Why a Route May Open Directly

If you type `yoursite.com/kitchen/orders` into a browser that was previously logged in, the kitchen display opens immediately — no login screen. This is because:

1. The session token is still stored in the browser from the last login
2. The system reads this token, verifies it's still valid, and shows the page

This is **not** a security issue. If the session has expired or been invalidated, the system will redirect to the login page.

### What Actually Controls Access

Access to TABLO is determined by **three things**, checked in order:

```
1. Do you have a valid session token?     → No → Go to /login
2. Do you belong to a restaurant?         → No → Go to /onboarding  
3. What is your role in the restaurant?   → Determines which pages you can see
```

Knowing a URL is not enough. You cannot access any protected page without a valid session.

### Incognito Behavior

Opening TABLO in an incognito/private window is equivalent to using a brand new device:
- No session exists → you must log in
- Closing the incognito window destroys the session completely
- There is no way to "accidentally" gain access via incognito

---

## 5. Deployment Reality

### Device Setup: Owner Laptop

**What**: The owner's personal laptop or desktop computer.
**Surface**: Admin Dashboard (`/admin/*`)
**Setup**:
1. Open browser (Chrome, Safari, etc.)
2. Navigate to `yoursite.com/login`
3. Log in with email + password
4. You're in the admin dashboard
5. The session persists — you won't need to log in again unless you explicitly log out

**Day-to-day use**:
- Manage menu items and categories
- Add/remove tables
- Generate and print QR codes for tables
- Generate/regenerate the kitchen access code
- Click "Kitchen Display" in the top bar to preview the kitchen view

### Device Setup: Kitchen Screen (iPad / Android Tablet / Dedicated Monitor)

**What**: A dedicated screen mounted in the kitchen area.
**Surface**: Kitchen Display (`/kitchen/*`)
**Setup**:
1. The owner must first generate a Kitchen Access Code in Admin → Tables & QR
2. On the kitchen device, open browser
3. Navigate to `yoursite.com/kitchen-login`
4. Enter the 6-digit code
5. The kitchen display opens
6. **Optional**: Set the browser to full-screen / kiosk mode
7. **Optional**: Enable sound alerts by clicking the speaker icon

**Day-to-day use**:
- Leave the kitchen display running all day
- Orders appear automatically as customers place them
- Tap "Start" to move an order to Preparing
- Tap "Complete" to mark an order as done
- Tap "Cancel" to cancel an order
- Owner/manager can tap "Start Fresh Session" to clear the board for a new shift

**Important operational notes**:
- The kitchen screen must have **WiFi** for live order updates
- If WiFi drops, the screen shows "Offline" and stops receiving new orders
- When WiFi reconnects, orders resume automatically
- If the kitchen code is regenerated by the owner, the kitchen screen will be logged out and must re-enter the new code

### Device Setup: Customer Phone

**What**: The customer's personal smartphone.
**Surface**: Public QR Menu (`/menu/*`)
**Setup**: None. Customers do not need to install anything or create an account.

**Customer flow**:
1. Customer sits down at a table
2. Customer scans the QR code on the table with their phone camera
3. The menu opens in their phone's browser
4. Customer browses categories, adds items to cart
5. Customer can add special instructions (e.g., "no onions")
6. Customer taps "Place Order"
7. The order tracking screen shows the order status (Pending → Preparing → Completed)
8. The order appears on the kitchen display simultaneously

**What the customer sees**:
- Restaurant name and table number
- Menu organized by categories with prices
- A floating cart button at the bottom
- Order tracking with live status updates
- Language toggle (English/Arabic)

### Intended Operational Workflow

Here is how a real restaurant uses TABLO in a typical day:

```
BEFORE OPENING
──────────────
1. Owner logs into Admin on their laptop
2. Owner checks menu items are up-to-date (mark items unavailable if needed)
3. Kitchen staff turns on the kitchen display (iPad in kitchen)
4. Kitchen staff enters the access code at /kitchen-login
5. Kitchen display is now live and waiting for orders

DURING SERVICE
──────────────
6. Customers arrive and sit at tables
7. Customers scan the QR code on their table
8. Customers browse the menu and place orders on their phone
9. Orders appear on the kitchen display with a chime
10. Kitchen staff taps "Start" to begin preparing an order
11. Kitchen staff taps "Complete" when the order is ready to serve
12. The customer's phone shows "Order Ready"

SHIFT CHANGE (optional)
───────────────────────
13. Owner/manager taps "Start Fresh Session" on the kitchen display
14. The board clears, ready for the next shift
15. Previous orders are preserved in the database

END OF DAY
──────────
16. Kitchen staff can simply close the browser tab
17. The kitchen session remains active for the next day
18. OR: Kitchen staff taps Logout to end the session
```

### Multi-Device Setup

| Device | Browser | Surface | Login type | Notes |
|---|---|---|---|---|
| Owner's laptop | Chrome | Admin | Email + password | Persistent session |
| Kitchen iPad #1 | Safari | Kitchen | 6-digit PIN | Leave running all day |
| Kitchen iPad #2 | Safari | Kitchen | Same 6-digit PIN | Same code works on multiple devices |
| Customer phone A | Any | QR Menu | None | Each table has its own QR code |
| Customer phone B | Any | QR Menu | None | Multiple customers can order from the same table |

> [!IMPORTANT]
> All kitchen devices for the same restaurant share the **same access code** and the **same underlying user account**. There is no way to give different codes to different kitchen devices. Regenerating the code affects ALL kitchen devices.

---

## 6. Final Canonical Model

### TABLO in Three Sentences

TABLO is a website where restaurant owners set up their menu and tables, kitchen staff see and manage incoming orders on a live screen, and customers scan QR codes to order from their phones. The owner controls everything through the admin dashboard, including generating a PIN code that kitchen devices use to connect. All three surfaces — admin, kitchen, and customer menu — are pages within the same website, sharing the same database.

### How the Three Surfaces Relate

```
    OWNER sets up                    CUSTOMER orders
    ┌─────────┐                      ┌──────────┐
    │  Admin   │──creates menu──────▶│ QR Menu  │
    │Dashboard │──creates tables────▶│(customer │
    │          │──generates QR──────▶│  phone)  │
    │          │──generates code─┐   └────┬─────┘
    └─────────┘                 │        │
                                │    places order
                                │        │
                                │        ▼
                                │   ┌──────────┐
                                └──▶│ Kitchen  │◀── staff logs in with code
                                    │ Display  │
                                    │          │──▶ order appears live
                                    │          │──▶ staff manages order
                                    └──────────┘
```

### How Kitchen Actually Behaves

The kitchen display is a **single shared screen** where all order management happens. It is the same page regardless of whether the person logged in is an owner or a staff member. The owner sees one extra button ("Start Fresh Session") that the staff does not see. Everything else — viewing orders, starting preparation, completing orders, cancelling orders, sound alerts — is available to all users.

Kitchen devices authenticate with a 6-digit PIN code. This code maps to a shared account for the restaurant. All kitchen devices for one restaurant use the same code and the same account. When the owner generates a new code, all kitchen devices using the old code are disconnected.

### The Correct Mental Model for Operators

> **Think of TABLO as three windows into the same restaurant:**
>
> - **The admin window** is where the owner sets up the restaurant (menu, tables, kitchen access). Only the owner can look through this window.
> - **The kitchen window** is where the team sees and manages live orders. Anyone with the kitchen code can look through this window.
> - **The customer window** is the QR code menu. Anyone with a phone can look through this window — no login needed.
>
> All three windows see the same data. When a customer places an order, it instantly appears in the kitchen window. When the kitchen marks an order as complete, the customer's phone updates.

---

## 7. Known Operational Edge Cases

These are behaviors that work correctly but may surprise operators:

| Situation | What happens | What to do |
|---|---|---|
| Owner opens kitchen display in the same browser as admin | Owner's admin session is replaced by the kitchen session. Admin stops working in that browser. | Use a separate device or separate browser for the kitchen display. |
| Kitchen WiFi drops | Kitchen display shows "Offline." New orders stop appearing. Orders placed during the outage will appear when WiFi reconnects. | Ensure reliable WiFi in the kitchen area. |
| Kitchen code is regenerated while a device is offline | The offline device continues working until its session naturally expires (~1 hour). It will then be forced to log in with the new code. | After regenerating a code, verify all kitchen devices have reconnected. |
| Owner taps "Start Fresh Session" | Only the current device and devices connected at that moment clear their board. A device that was offline will NOT see the reset and may show old orders. | Ensure all kitchen devices are online when resetting. |
| Customer closes phone before order completes | The order is already in the database and appears on the kitchen display. The customer can re-scan the QR code to see the menu again, but they will not see their previous order tracking (it was in-memory only). | Orders are never lost — they exist in the kitchen display regardless. |
| Multiple customers scan the same table's QR code | Each customer sees the menu independently. Each can place separate orders. All orders are tagged with the same table number. | This is normal and expected behavior. |

---

## 8. Deployment Checklist

### Pre-Deployment

- [ ] Supabase project is provisioned and migrations are applied
- [ ] Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are set
- [ ] Production build is created and deployed to hosting
- [ ] Owner account is created via `/signup`
- [ ] Restaurant is created via `/onboarding`
- [ ] Menu items and categories are added via Admin → Menu Management
- [ ] Tables are added via Admin → Tables & QR
- [ ] QR codes are generated and printed for each table
- [ ] Kitchen access code is generated via Admin → Tables & QR

### Day-of Setup

- [ ] Kitchen device(s) are connected to WiFi
- [ ] Kitchen device(s) navigate to `/kitchen-login` and enter the code
- [ ] Sound alerts are enabled on kitchen device(s) if desired
- [ ] QR codes are placed on each table
- [ ] Test order is placed by scanning a QR code and completing the full flow
- [ ] Test order appears on kitchen display
- [ ] Test order status updates are visible on customer phone

### Ongoing Operations

- [ ] Kitchen access code should be regenerated if a staff member leaves
- [ ] Menu availability should be updated when items run out (mark as unavailable in Admin)
- [ ] QR codes should be reprinted if tables are renumbered or QR links are regenerated
- [ ] "Start Fresh Session" can be used at shift changes to clear the kitchen board
