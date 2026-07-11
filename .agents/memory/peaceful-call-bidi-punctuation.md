---
name: Peaceful Call bidi punctuation bug
description: Why trailing punctuation visually jumped in RTL/Arabic mode, and the fix
---

# Trailing punctuation jumping in RTL contexts

Symptom: when the site language was set to Arabic (global `document.documentElement.dir = 'rtl'`), trailing punctuation (e.g. `?`) in *any* user-generated or stored text — including Russian chat messages and FAQ text unrelated to Arabic — visually displaced to the wrong side.

**Root cause:** `LanguageContext.tsx` sets `document.documentElement.dir` globally based on UI language. Text nodes rendered inside that RTL ancestor without their own bidi isolation inherit the paragraph embedding level, so the Unicode Bidi Algorithm can reorder trailing neutral characters (punctuation) at the run boundary — even for a pure-LTR string like Russian text.

**Fix:** add `dir="auto"` directly on the elements that render raw user/content text (chat message `<p>`, FAQ question/answer spans, admin FAQ editor inputs/textareas) — never rely on the ancestor's `dir`. `dir="auto"` makes the browser detect direction from the string's own first strong character, isolating it from the surrounding layout direction and eliminating the reordering.

**How to apply:** any new component that renders free-form stored/typed text (not fixed UI copy) should get `dir="auto"` on its text container. Fixed UI chrome (buttons, labels from `t()`) can keep `dir={isRtl ? 'rtl' : 'ltr'}` for layout alignment — the bug only affects raw content text.
