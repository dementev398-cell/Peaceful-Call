---
name: Peaceful Call i18n
description: Where localization actually lives and a Clerk-specific gotcha, for the Peaceful Call chat-hub artifact.
---

- `artifacts/chat-hub/src/contexts/LanguageContext.tsx` is the real, actively-used dictionary (RU/EN/AR, dotted keys, `t()` with EN/key fallback, RTL support). `src/lib/i18n.ts` is legacy/dead code — do not add keys there.
- `@clerk/localizations`'s `ru-RU` and `ar-SA` locales leave several `formFieldInputPlaceholder__*` keys (email, password, signUpPassword, firstName, lastName, username) as `undefined`, so Clerk silently falls back to English placeholders regardless of the app's locale. Fix: merge explicit `placeholderOverrides` into `clerkLocalization` for those fields in `ClerkProviderWithRoutes` (see `App.tsx`).
- **Why:** this caused a real reported bug (Arabic/Russian sign-in/sign-up forms showing English placeholder text) that isn't visible just from reading Clerk's docs — only from inspecting the shipped locale JSON.
- Editing `LanguageContext.tsx` while the dev server is running triggers benign Vite Fast-Refresh "invalidate" warnings and one-time `useLanguage must be used inside LanguageProvider` runtime errors in the console (because the file exports both a Context component and a plain hook). This is dev-only HMR noise, not a real bug — resolves on the next full reload/workflow restart.
