---
trigger: always_on
---

TABLO is an existing production-grade multi-tenant SaaS restaurant platform.

Tech stack:

* React 19
* Vite
* TypeScript
* Supabase
* Zustand
* Tailwind CSS
* shadcn/ui

Architecture rules:

* Do NOT rewrite architecture
* Do NOT refactor unrelated files
* Preserve existing routing and dashboard structure
* Preserve Supabase integration and RLS assumptions
* Respect currentRestaurant tenant scoping
* Use existing Zustand store patterns
* Use only shadcn/ui primitives
* Avoid introducing new dependencies unless explicitly requested
* Keep implementations incremental and isolated
* Stop after each milestone for review
* Never modify more files than necessary
* Prefer extending existing components over creating parallel systems

Workflow rules:

* Analyze before coding
* Create implementation plans before execution
* Explain risks before large changes
* Implement features in small reviewable steps
* Preserve production stability at all times

UI rules:

* Follow Odoo-style clean dashboard UI
* Background: #F8F9FA
* Containers: white
* Primary teal: #017E84
* Use consistent spacing and typography

Current project phase:
This is NOT a greenfield project.
This is a feature-completion and stabilization phase.

Missing features:

* Tables & QR management
* QR generation
* Supabase Storage uploads
* Kitchen audio alerts

The agent must behave like a senior systems engineer maintaining a live SaaS platform.
