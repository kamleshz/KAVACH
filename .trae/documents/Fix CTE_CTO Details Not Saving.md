The issue was identified in `AddClient.jsx` where the initialization of `cteDetailRows` and `ctoDetailRows` state from the backend data was not preserving nested fields (like `productComplianceRows`, `productComponentDetails`, etc.). This caused these nested details to be lost when saving the client data, as the save operation replaces the entire `cteDetailsList` and `ctoDetailsList` with the state which lacked these fields.

I have applied a fix in `AddClient.jsx` to include `...item` when mapping the backend data to the local state, ensuring all nested fields are preserved and correctly sent back to the server upon saving.

**Changes Implemented:**
1.  Modified `client-react/src/pages/AddClient.jsx`:
    -   Updated the `useEffect` hook (lines ~372 and ~406) responsible for populating `cteDetailRows` and `ctoDetailRows`.
    -   Added spread operator `...item` to the map function to ensure all properties from the backend response (including nested arrays) are included in the local state.

This ensures that when `handleSaveStep4` or `handleSubmit` constructs the payload for `productionFacility`, it includes the full objects for CTE and CTO details, preserving any nested data like product compliance rows.