# Editing the copy & scoring

All of Wealth Compass's copy and scoring lives in two files the app reads at
runtime: `src/data/copy.json` (words) and `src/data/assessment.json` (questions +
scoring weights). Editing JSON by hand is fiddly, so this folder lets you review
and edit everything as **spreadsheets**, then push your changes back in one command.

## The sheets (`content/csv/`)

| File | What's in it |
|---|---|
| `1-Compass.csv` | The 8 Compass directions — name, meaning, and the narrative (leads / area to explore / reflection / next step) for each. |
| `2-Navigation.csv` | The 5 Navigation preferences — name, meaning, and narrative (leads / how you decide / working with others). |
| `3-SharedCompass.csv` | The Our Shared Compass screen + the shared narrative sentences (with `{name}` / `{dim}` placeholders) and the score thresholds that trigger them. |
| `4-IndividualCTA.csv` | Every call-to-action and heading on the individual journey — reveal, compass result, navigation result, reports, action list, conversation intro, loading messages. |
| `5-SharedCTA.csv` | The partner-invite and partner-join copy (share codes, passphrase prompts, etc.). |
| `6-ConversationCards.csv` | The conversation-starter prompts, grouped by category. |
| `7-Scoring.csv` | Every scoring weight — which answer nudges which dimension, and by how much — plus the global scoring settings. |

Each file opens directly in Excel, Numbers, or Google Sheets.

## How to edit

1. **Export the latest** (optional — the sheets are already here):
   ```bash
   node content/export-content.mjs
   ```
2. **Edit** the CSVs. Change any text freely. A few rules keep things safe:
   - **Don't change the `id` / `key` / `question` / `ref` columns** — those are the
     addresses the importer uses to put your text back in the right place.
   - Keep placeholders like `{name}`, `{dim}`, `{top3}`, `{done}` intact.
   - In `7-Scoring.csv`, edit the `weight` column (and `dimension` if you want an
     answer to point somewhere else). Higher weight = stronger pull toward that
     dimension. You can add a row to give an answer an extra dimension, or delete a
     row to remove one.
3. **Re-import**:
   ```bash
   node content/import-content.mjs
   ```
   This merges your edits back into `copy.json` and `assessment.json`. Only fields
   present in the sheets are touched — nothing else is disturbed. Reload the app to
   see the changes.

## Notes

- The round-trip is **lossless**: exporting and re-importing without edits leaves
  the data byte-for-byte identical.
- Rows for answers that carry no score (narrative-only options) are intentionally
  left out of `7-Scoring.csv`.
- `wealth-compass-content.xlsx` is a single-workbook copy of all seven sheets for
  convenient reviewing. It's a **snapshot** — to make edits stick, change the CSVs
  (or export each workbook tab back to CSV) and run the import.
