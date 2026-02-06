I have successfully implemented the conditional Compostable/Biodegradable Details table in Tab 2.

**Changes Implemented:**

1.  **Backend Schema Update:**
    *   Updated `server/models/SingleUsePlasticChecklist.model.js` to include the new fields required for the detailed table:
        *   `materialType` (Compostable/Biodegradable)
        *   `cpcbCertAvailable` (Yes/No)
        *   `companyName`
        *   `eprRegNum` (EPR Registration Certificate Number)
        *   `certNum` (Certificate Number)
        *   `certScopeMatch` (Yes/No)
        *   `properMarking` (Yes/No)

2.  **Frontend Updates (`SingleUsePlastic.jsx`):**
    *   **Conditional Rendering:** The detailed table now *only* appears in Tab 2 if the user answers **"Yes"** to the question *"Is any Compostable / Biodegradable used in factory premises?"*.
    *   **New Table Implementation:** Created a fully functional table with all the requested columns:
        *   Sr. No.
        *   Material Type (Dropdown: Compostable/Biodegradable)
        *   Valid CPCB Certificate Available? (Dropdown: Yes/No)
        *   Name of the Company (Input)
        *   EPR Registration Certificate Number (Input)
        *   Certificate Number (Input)
        *   Certificate Scope Match? (Dropdown: Yes/No)
        *   Proper Product Marking/Labeling? (Dropdown: Yes/No)
        *   Upload Photo (Same enhanced upload component with preview)
        *   Remarks
        *   Actions (Delete button)
    *   **Row Management:** Added an "Add Row" button specific to this table, which initializes rows with the `areaName` set to `'CompostableDetail'` to distinguish them from the main checklist.

This provides a complete, integrated solution where the detailed compliance checks are dynamically revealed based on the user's input.

**Code References:**
- `server/models/SingleUsePlasticChecklist.model.js`
- `client-react/src/components/PlantProcessSteps/SingleUsePlastic.jsx`