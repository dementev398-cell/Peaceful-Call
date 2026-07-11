---
name: Peaceful Call FAQ per-language content
description: How home-page FAQ stores/displays RU/EN/AR text; why it's manual, not auto-translated
---

# FAQ per-language (i18n) content

Home-page FAQ items store manual translations, not machine-translated text.

- DB (`faq_items`): `question_i18n` / `answer_i18n` jsonb maps `{ru,en,ar}` (non-null default `{}`), plus legacy `question`/`answer` text columns kept as a fallback and always synced to the map's primary value (ru→en→ar) on write.
- API contract (`lib/api-spec/openapi.yaml`): `FaqTranslations` schema; `FaqInput`/`FaqUpdate` take `questionI18n`/`answerI18n`; `FaqItem` returns both maps + legacy fields. Client regenerated via orval.
- Route (`artifacts/api-server/src/routes/faq.ts`): trims/drops empty langs; **RU is required** on both create and update (when a map is provided). Reorder updates send only `order`, so they skip the RU check.
- Public display (`FAQ.tsx`): picks current UI language, falls back ru→en→ar→legacy.
- Admin UI (`AdminPage.tsx` `FaqLangEditor`): RU/EN/AR pill tabs, one Q + one A field per language.

**Why manual, not AI auto-translate:** the user declined both the Replit AI integration (needs phone verification) and providing their own OpenAI key, then chose manual per-language entry for reliability. If an AI key is added later, auto-translation could be layered on top at save-time.

**How to apply:** to add another language, extend `FaqTranslations` (schema + DB `$type`), the `FAQ_LANGS` list, and the fallback chains. Keep RU as the required source language unless the user changes it.
