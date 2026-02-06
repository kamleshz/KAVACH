I have successfully implemented the "Disposable" tab (Tab 2) as requested.

**Changes Implemented:**

1. **Tab Renaming:** Changed the second tab's label from "Recycled Quantity Used" to **"Disposable"**.
2. **Separate Table Implementation:**

   * Created a dedicated table in Tab 2 that lists the 4 specific items: "Disposable plastic bottles", "cups", "covers", and "biomedical plastic waste".

   * Added a "FOUND (YES/NO)" dropdown column for each item.
3. **Data Persistence & Separation:**

   * These items are automatically initialized in the `checklistRows` state with `areaName: 'Disposable'`.

   * **Tab 1** (Single Use Plastic) now *filters out* these rows, so they don't clutter the main checklist.

   * **Tab 2** (Disposable) *only shows* these rows.

   * Both tabs share the same underlying data structure, ensuring everything saves correctly to the backend without needing schema changes.

Now, users can toggle between the "Single Use Plastic" checklist and the specific "Disposable" compliance check, with data preserved across both.

**Code Reference:**

* `client-react/src/components/PlantProcessSteps/SingleUsePlastic.jsx`

