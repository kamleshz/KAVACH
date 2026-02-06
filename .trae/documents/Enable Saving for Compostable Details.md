I have ensured that the data saving functionality is fully operational and consistent.

**Actions Taken:**
1.  **Backend Verification:** Confirmed that the `SingleUsePlasticChecklist` schema already includes all necessary fields (`materialType`, `cpcbCertAvailable`, `companyName`, `eprRegNum`, `certNum`, `certScopeMatch`, `properMarking`). The generic save controller automatically handles these fields.
2.  **Frontend Enhancement:** Added a **"Save" button** (Green icon) to the "Compostable / Biodegradable Details" table.
    *   This provides a consistent user experience with the main table.
    *   It allows users to manually trigger a save and receive a "Checklist saved successfully" notification for reassurance.
3.  **Data Persistence:** The `checklistRows` state manages all data (Tab 1, Tab 2 Question, and Tab 2 Details). Auto-save is active for all fields, and the new manual save button works specifically for the detailed rows.

You can now enter data in the Compostable Details table and either wait for auto-save or click the green save button to persist the information.

**Code Reference:**
- `client-react/src/components/PlantProcessSteps/SingleUsePlastic.jsx`