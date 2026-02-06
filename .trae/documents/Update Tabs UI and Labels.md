I have successfully updated the Tabs UI to match the requested style.

**Changes Implemented:**
1.  **Tab Renaming:** Renamed "Tab 1" to "Single Use Plastic" and "Tab 2" to "Recycled Quantity Used".
2.  **Visual Styling:**
    *   Applied text styling to highlight the active tab in **Orange** (`text-orange-600`) and the inactive tab in **Gray** (`text-gray-600`), matching the "Product Compliance" style.
    *   Used `type="card"` for the Tabs component to give it a cleaner, contained look.
    *   Added custom `tabBarStyle` to create a subtle border separation.
    *   Increased padding in the main container for better spacing.

The tabs now look professional and clearly indicate the current active section, aligning with the visual reference provided.

**Code Reference:**
- `client-react/src/components/PlantProcessSteps/SingleUsePlastic.jsx`