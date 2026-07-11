---
name: Peaceful Call Quran reader
description: Data source, edition availability, and integrity rules for the /quran feature
---

# Quran reader (/quran tab)

Live-fetched from **api.alquran.cloud** (Tanzil project), not stored in the DB. CORS is `*`, so
the frontend fetches directly (react-query cached). Multi-edition endpoint returns Arabic +
translation in one call: `/v1/surah/{n}/editions/quran-uthmani,{editionId}`. Surah name metadata
(114 chapters, RU/EN/AR names) is baked into `src/data/surahs.ts` (generated from quran.com API).

**Edition availability (verified against alquran.cloud AND quran.com):**
- Шидфар and Гафуров Russian translations do NOT exist in any reliable complete digital source.
  User approved replacing them with the verified **Саблуков (ru.sablukov)** and
  **Аль-Мунтахаб (ru.muntahab)**.
- Final RU set: ru.kuliev, ru.porokhova, ru.osmanov, ru.krachkovsky, ru.abuadel, ru.sablukov, ru.muntahab.
- EN: en.sahih, en.yusufali, en.hilali (= Muhsin Khan / Hilali & Khan), en.pickthall.
- Arabic original = `quran-uthmani` (special id `ar.original` in code = Arabic-only mode, no translation line).
- Translation options shown depend on the page UI language (RU/EN/AR); list lives in `src/lib/quranEditions.ts`.

**Integrity rule (do not regress):** map translation ayahs to Arabic by `numberInSurah`, NEVER by
array index, and throw if ayah counts diverge or any ayah is missing.
**Why:** user demanded the Quran be shown "без искажений" (no distortions); index-based pairing can
silently shift/drop translation lines if an upstream payload differs in count/ordering.
**How to apply:** any change to `fetchSurah` in `quranEditions.ts` must preserve the by-number map
and the count/coverage guards.

Bismillah is rendered as a standalone header for every surah EXCEPT 1 (Al-Fatiha, where it is ayah 1)
and 9 (At-Tawbah, which has none by consensus).
