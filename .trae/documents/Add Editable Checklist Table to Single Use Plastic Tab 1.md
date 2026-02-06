I have successfully added the editable "Single Use Plastic Checklist" table to "Tab 1" of the `SingleUsePlastic` component, as requested.

**Changes Implemented:**
1.  **New Table in Tab 1:** Added a secondary table below the existing "Procurement Data Import" section within Tab 1.
2.  **Editable Columns:** The table includes all the requested columns with appropriate input types:
    *   **Sr. No.**: Auto-incrementing index.
    *   **Area Name**: Text Input.
    *   **Banned Single Use Plastic Items to Check**: Text Input.
    *   **Found (Yes/No)**: Dropdown Select.
    *   **Qty (if found)**: Text Input.
    *   **Remarks / Action Taken**: Text Area.
    *   **Photo Reference No.**: Text Input.
    *   **Checked By**: Text Input.
    *   **Date**: DatePicker.
3.  **State Management:** Implemented `checklistRows` state to manage the table data locally within the component.
4.  **Add/Delete Functionality:** Added an "Add Row" button to dynamically create new rows and a "Delete" action column to remove rows.
5.  **UI Enhancements:** Used Ant Design components (`Input`, `Select`, `DatePicker`, `Button`) for a polished look consistent with the rest of the application.

**Note:** The data in this new table is currently managed in the local state of the `SingleUsePlastic` component. Since no specific backend endpoint was provided for this new checklist, it serves as a UI implementation. If persistence is needed, it can be hooked up to the `PlantProcess` save logic in a future step.

**Next Steps:**
- The user can now interact with the "Single Use Plastic Checklist" in Tab 1.
- They can add rows, fill in details, and delete rows.
- The existing Procurement Data table remains available at the top of Tab 1.