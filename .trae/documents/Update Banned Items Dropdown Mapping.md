I have successfully updated the `BANNED_ITEMS_OPTIONS` constant in `SingleUsePlastic.jsx` to include the specific banned items for all the requested areas, based on the provided image data.

**Changes Implemented:**
-   **Mapped All Areas:** Added specific banned item lists for:
    -   Packaging Material Storage Area
    -   Finished Goods Storage & Dispatch
    -   Production Area
    -   Material Handling
    -   Medical Room
    -   Kitchen / Pantry / Lunch Room
    -   Tool Store Room
    -   Quality Check Area
    -   Final Product Packaging Area
    -   Scrap Yard
-   **Data Consistency:** Each list matches the items specified in your provided table (e.g., "Plastic tape waste", "Shrink wrap waste", "Disposable gloves", etc.).

The "Banned Single Use Plastic Items to Check" dropdown will now correctly populate with the relevant items for *any* area selected from the "Area Name" dropdown.

**Code Reference:**
-   `client-react/src/components/PlantProcessSteps/SingleUsePlastic.jsx`