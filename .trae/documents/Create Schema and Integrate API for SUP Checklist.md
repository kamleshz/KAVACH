I have successfully created a dedicated schema for the Single Use Plastic Checklist and integrated the save/load functionality into the application.

**Backend Changes:**
1.  **Schema Creation:** Created `SingleUsePlasticChecklistModel.js` with fields for client, type, itemId, and the rows of checklist data (including custom item flags).
2.  **Controller:** Implemented `supChecklist.controller.js` with `getSingleUsePlasticChecklistController` and `saveSingleUsePlasticChecklistController` to handle database operations.
3.  **Routes:** Added API routes (`GET /sup-checklist` and `POST /sup-checklist`) in `client.route.js` to expose these endpoints.

**Frontend Changes:**
1.  **API Integration:** Updated `PlantProcess.jsx` to fetch checklist data when the 'procurement' tab is active and provide a `saveSupChecklist` function.
2.  **Props Passing:** Passed `supChecklistData` and `onSaveSupChecklist` as props to the `SingleUsePlastic` component.

**Next Steps:**
- The `SingleUsePlastic` component now needs to be updated to use these new props (`supChecklistData` and `onSaveSupChecklist`) to actually display the loaded data and trigger the save action when the user modifies the checklist. Currently, it's still using local state (`checklistRows`). I will proceed to update `SingleUsePlastic.jsx` to synchronize its local state with the backend data.