I have successfully updated the `SingleUsePlastic` checklist table columns as requested.

**Changes Implemented:**
1.  **Removed Column:** Deleted the "Checked By" column from the table configuration.
2.  **Renamed Column:** Changed the title of "Qty (if found)" to "Quantity".
3.  **Reordered Columns:** Moved "Remarks / Action Taken" to appear after "Upload Photo" and before "Action", effectively placing it at the end of the data entry fields.

The new column order is:
Sr. No. -> Area Name -> Banned Items -> Found -> Quantity -> Upload Photo -> Remarks / Action Taken -> Action.

**Code Reference:**
- `client-react/src/components/PlantProcessSteps/SingleUsePlastic.jsx`