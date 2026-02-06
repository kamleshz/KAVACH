I have resolved the issue of continuous notifications and the underlying infinite save loop.

**Changes Implemented:**

1. **Stopped Infinite Save Loop:**

   * **In** **`PlantProcess.jsx`:** Wrapped the `saveSupChecklist` function in `useCallback`. This prevents the function reference from changing on every render, which was causing the child component's effect to re-run unnecessarily.

   * **In** **`SingleUsePlastic.jsx`:** Introduced a `useRef` called `isRemoteUpdate`. When data is loaded from the parent (remote update), this flag is set to `true`. The auto-save effect now checks this flag and *skips* saving if the update came from the server, breaking the cycle of "Server Update -> Child State Update -> Auto Save -> Server Update".

These changes ensure that auto-saving only happens when *you* make changes to the checklist, and the function reference remains stable, preventing the continuous loop of saves and notifications.

**Code Reference:**

* `client-react/src/pages/PlantProcess.jsx`

* `client-react/src/components/PlantProcessSteps/SingleUsePlastic.jsx`

