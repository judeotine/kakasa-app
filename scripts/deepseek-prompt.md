# Generating translation JSON with DeepSeek

Use this to translate the app's UI strings with an LLM (DeepSeek) instead of the
Sunbird API. Do **one language per request** — it keeps the output from being
truncated.

- Source strings: [`scripts/source-strings.json`](./source-strings.json) (454 keys, English)
- Output goes to: `lib/translations/<code>.json`

## Languages

| Paste this language name | Save the result to        |
| ------------------------ | ------------------------- |
| Luganda                  | `lib/translations/lug.json`  |
| Runyankole               | `lib/translations/nyn.json`  |
| Acholi                   | `lib/translations/ach.json`  |
| Ateso                    | `lib/translations/teo.json`  |
| Lugbara                  | `lib/translations/lgg.json`  |
| Swahili                  | `lib/translations/sw.json`   |

## The prompt

Copy everything below, replace `__LANGUAGE__` with one language name from the
table, then paste the **entire contents of `scripts/source-strings.json`** where
indicated.

---

You are a professional localizer for a Ugandan mobile loan app called Kakasa.

Translate the JSON object below from English into **__LANGUAGE__**.

Rules:
- Return **only** a single valid JSON object — no markdown fences, no comments, no explanation.
- Keep **every key exactly the same**. Output all 454 keys, none added or removed.
- Translate only the string **values**, into natural, everyday __LANGUAGE__ as used in Uganda. Keep them short — these are mobile UI labels and buttons.
- Preserve any `\n` line breaks in the same positions.
- Do **not** translate: the app name "Kakasa", and the tokens "UGX", "OTP", "PIN", "NIN", "FAQ", "AI", "SMS", "ID". Leave those exactly as written.
- Keep numbers, punctuation, and capitalization style natural for the target language.
- If a term has no common local word, use the widely understood English/loanword form rather than inventing one.

Here is the JSON to translate:

<PASTE THE CONTENTS OF scripts/source-strings.json HERE>

---

## After you get each result

1. Save the model's JSON output to the matching file, e.g. `lib/translations/lug.json`.
2. Validate + normalize it (this also catches any stray markdown fences):

   ```bash
   node -e "const fs=require('fs');const f=process.argv[1];const o=JSON.parse(fs.readFileSync(f,'utf8'));fs.writeFileSync(f, JSON.stringify(Object.fromEntries(Object.keys(o).sort().map(k=>[k,o[k]])),null,2)+'\n');console.log(f,Object.keys(o).length,'keys')" lib/translations/lug.json
   ```

3. Confirm it has 454 keys. If the model truncated (fewer keys), ask it to
   "continue from key `<last_key>`" and merge, or split the source JSON in half
   and translate each half.
4. Repeat for all six languages, then rebuild the app. The bundled JSON is used
   instantly and offline — no API calls at runtime.

> Tip: whenever you add or change English strings in `lib/strings.ts`, re-dump the
> source with the same one-liner used to create `source-strings.json`, and
> re-translate the changed keys.
