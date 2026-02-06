I have identified the issue: when the page refreshes, the `plantLocationNumber` is updated from the fetched data, which triggers a `useEffect` hook. This hook calls `handlePlantLocationChange`, which was previously creating a fresh set of empty rows, effectively overwriting the data that had just been fetched from the backend.

I have modified `handlePlantLocationChange` in `AddClient.jsx` to be **non-destructive**. It now checks if the number of existing rows matches the target number. If they match (which is the case after a data load), it preserves the existing data. It only adds or removes rows if the count actually changes (e.g., when the user manually edits the number).

**Changes Implemented:**
- Updated `handlePlantLocationChange` in `client-react/src/pages/AddClient.jsx` to use functional state updates.
- The function now compares the current row count with the new `plantLocationNumber` and only appends new empty rows or slices existing ones if necessary, preserving existing data when the counts match.