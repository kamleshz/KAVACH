I have successfully updated Tab 2 to reflect the new requirements.

**Changes Implemented:**
1.  **Tab 2 Renamed:** The "Disposable" tab has been repurposed. It now focuses on a single key compliance question.
2.  **Single Question Format:** The table in Tab 2 now displays exactly one row with the question: *"Is any Compostable / Biodegradable used in factory premises?"*
3.  **Data Structure:**
    *   Replaced the previous "Disposable" items logic with a new `areaName: 'CompostableQuestion'` entry.
    *   This ensures the Yes/No answer is stored specifically for this question.
    *   The answer is captured in the existing `found` field, leveraging the same data model.
4.  **UI Updates:**
    *   Updated the column header to "QUESTION" and "RESPONSE (YES/NO)".
    *   Added a "Select Response" placeholder for clarity.
    *   Updated the Tab 1 filter to exclude this new question row, keeping the main checklist clean.

**Code Reference:**
- `client-react/src/components/PlantProcessSteps/SingleUsePlastic.jsx`