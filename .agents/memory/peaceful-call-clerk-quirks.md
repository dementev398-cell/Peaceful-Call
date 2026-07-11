---
name: Peaceful Call — Clerk integration quirks
description: Non-obvious Clerk behaviors hit while building the admin panel and profile page for Peaceful Call.
---

## Logout leaves a blank page until reload

`signOut()` called with no options navigates to Clerk's own configured `signInUrl`
instead of the app's intended post-logout route. If the app also wraps its router
in `AnimatePresence mode="wait"` (as chat-hub's `App.tsx` does), the old protected
route stays mounted through the exit animation while Clerk silently redirects
underneath it — producing a blank flash, and only a manual reload shows the
correct page.

**Why:** `AnimatePresence` + Clerk's own redirect target fighting over navigation.

**How to apply:** Always pass an explicit `redirectUrl` to `signOut({ redirectUrl: '/' })`
(or the intended destination) for any logout button in this app.

## Overriding Clerk's built-in component styles

Clerk's `<UserProfile />` (and other prebuilt components) ship their own CSS layer.
Normal `@layer` Tailwind overrides lose to it. To restyle a specific Clerk element
(e.g. the "Primary"/"ОСНОВНОЙ" badge, which was low-contrast gray-on-gray by default),
write an **unlayered** CSS rule targeting Clerk's stable classnames (e.g. `.cl-badge`)
in a global stylesheet — that wins over Clerk's own layered styles.

**Why:** Clerk's CSS layer has higher precedence than `@layer` rules from the app.

**How to apply:** For any future Clerk visual tweak, check `.cl-*` classnames in
devtools and write a plain (non-`@layer`) override rule.
