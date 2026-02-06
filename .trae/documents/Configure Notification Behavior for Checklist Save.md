I have successfully updated the notification logic for the Single Use Plastic Checklist.

**Changes Implemented:**
1.  **Modified Save Logic (`PlantProcess.jsx`):** Updated the `saveSupChecklist` function to accept a `showNotification` parameter (defaults to `true`). It now conditionally triggers the success/error toast notifications based on this flag.
2.  **Silent Auto-Save (`SingleUsePlastic.jsx`):** Updated the `useEffect` hook (which handles auto-saving on data changes) to pass `false` for the notification parameter. This ensures background saves happen silently without disturbing the user.
3.  **Manual Save Notification (`SingleUsePlastic.jsx`):** Updated the "Save" icon button's click handler to pass `true` for the notification parameter. This ensures the user gets immediate feedback ("Checklist saved successfully") when they explicitly request a save.

This configuration meets your requirement: notifications will *only* appear when the user manually clicks the save button, while data continues to be safely preserved in the background.

**Code Reference:**
- `client-react/src/pages/PlantProcess.jsx`
- `client-react/src/components/PlantProcessSteps/SingleUsePlastic.jsx`