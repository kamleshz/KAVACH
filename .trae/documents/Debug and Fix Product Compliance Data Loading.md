I have identified the issue: The `fetchCompliance` function in `PlantProcess.jsx` fetches data from the API, but if the API returns an empty array (or fails), it falls back to using `item.productComplianceRows`. However, the `item` state (which comes from `findItem` -> `client.productionFacility.cteDetailsList/ctoDetailsList`) might not have the latest `productComplianceRows` if they are stored in a separate `ProductCompliance` collection (which the new architecture seems to support via `saveProductComplianceController`).

The `saveProductComplianceController` saves data to a separate `ProductComplianceModel`, but `PlantProcess.jsx` tries to load from `API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE`. If that returns data, it uses it. If not, it falls back to `item.productComplianceRows`.

The issue is likely that when `item` is initially loaded (via `fetchClientDetails`), it populates `item` from the `ClientModel`. But `ProductCompliance` data is now being saved to a separate model/collection in some cases (as seen in `saveProductComplianceController`).

However, looking at `saveProductComplianceController`, it saves to `ProductComplianceModel`. And `getProductComplianceController` fetches from `ProductComplianceModel`.

The problem might be in how `productRows` are initialized or updated.

Wait, I see a potential issue in `PlantProcess.jsx` around line 3230:
```javascript
        const rows = res.data?.data || [];
        if (rows.length) {
          setProductRows(rows);
          setLastSavedRows(rows);
          setInitialProductRows(rows);
        } else if (item && Array.isArray(item.productComplianceRows) && item.productComplianceRows.length) {
           // Fallback to item.productComplianceRows
```

If `res.data.data` is empty (e.g. first load from new endpoint), it falls back to `item.productComplianceRows`.

But if the user *just* saved data, `getProductComplianceController` should return it.

The user says "Data is not Showing in front end although it is availabe in database".

Let's look at `getProductComplianceController` in `client.controller.js`:
```javascript
export const getProductComplianceController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, itemId } = req.query;
        const doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        return res.status(200).json({
            message: "Product compliance fetched",
            error: false,
            success: true,
            data: doc?.rows || [], // <--- Returns doc.rows
            hasDoc: !!doc
        });
    } catch (error) { ... }
};
```

And `saveProductComplianceController`:
```javascript
        let doc = await ProductComplianceModel.findOne({ client: clientId, type, itemId });
        if (!doc) {
            doc = new ProductComplianceModel({ client: clientId, type, itemId, rows: [] });
        }
        // ... updates doc.rows ...
        await doc.save();
```

So `ProductComplianceModel` is the source of truth for this tab.

If `item.productComplianceRows` (from `ClientModel`) is used as a fallback, that's fine.

However, if `rows.length` is 0 (empty array from API), it falls back to `item`.

If the database has data in `ProductComplianceModel`, `res.data.data` should be non-empty.

If the user says it's in the database, maybe they mean it's in the `Client` document (legacy location) but `getProductComplianceController` returns `[]` (empty) because it looks at the new `ProductCompliance` collection which might be empty if migration didn't happen or if there's a disconnect.

**Wait, I noticed something in `AddClient.jsx` fix previously:**
We fixed `AddClient.jsx` to preserve `productComplianceRows` when saving the client. This means `ClientModel` (the `item`) has the data.

But `PlantProcess.jsx` prefers the separate `ProductComplianceModel` (via API).

If `ProductComplianceModel` is empty (returns `[]`), `PlantProcess.jsx` falls back to `item.productComplianceRows`.

**The Issue:**
In `PlantProcess.jsx`, `item` is derived from `client` state.
`client` state is fetched via `fetchClientDetails`.

If `ProductComplianceModel` has NO data (empty array), `rows.length` is 0.
Then it checks `item.productComplianceRows`.

If `item` is not yet set when `fetchCompliance` runs, or if `item` doesn't have the rows, it won't show.

**Crucially**: `fetchCompliance` depends on `[clientId, type, itemId, item]`.
If `item` changes (loaded later), `fetchCompliance` runs again.

**Hypothesis:**
The data is *only* in `ClientModel` (legacy) and not in `ProductComplianceModel` (new).
OR
The data is in `ProductComplianceModel` but not being returned correctly.

But the user said "Data is not Showing in front end although it is availabe in database".

If `ProductComplianceModel` is used, it should return data.

**Correction:**
I see that `fetchCompliance` checks `rows.length`.
If `ProductComplianceModel` returns an empty array (which it might if no document exists or rows is empty), it falls back to `item`.

**BUT**, `getProductComplianceController` returns `data: doc?.rows || []`.

If the user has data in `ClientModel` (the "database" they might be referring to, especially since `AddClient` saves there), but `ProductComplianceModel` is empty (or non-existent), then `PlantProcess` should display data from `item`.

**However**, `fetchCompliance` is an async function inside `useEffect`.

```javascript
    const fetchCompliance = async () => {
      if (!clientId || !type || !itemId) return;
      try {
        const res = await api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(clientId), {
          params: { type, itemId }
        });
        const rows = res.data?.data || [];
        if (rows.length) {
           // ...
        } else if (item && Array.isArray(item.productComplianceRows) && item.productComplianceRows.length) {
           // Fallback
           setProductRows(item.productComplianceRows);
           // ...
        }
      } catch (_) {
         // Error fallback
      }
    };
```

If `res.data.data` is `[]`, it goes to `else if`.
If `item` is `null` (not yet loaded), it skips.

**The Fix:**
I suspect `item` might be `null` when `fetchCompliance` first runs.
But `useEffect` depends on `item`. So when `item` loads, it should rerun.

**Wait**, look at `saveProductComplianceController`. It saves to `ProductComplianceModel`.
And `AddClient.jsx` saves to `ClientModel`.

If the user added data via `AddClient`, it's in `ClientModel`.
When they go to `PlantProcess`, `ProductComplianceModel` is empty.
So it *should* fallback to `item`.

**Potential Bug:**
The `item` object in `PlantProcess.jsx` comes from `findItem()`:

```javascript
  const findItem = () => {
    if (!client || !type || !itemId) return;
    const list = type === 'CTE' ? client.productionFacility?.cteDetailsList : client.productionFacility?.ctoDetailsList;
    const found = list?.find(i => i._id === itemId);
    setItem(found || null);
  };
```

This `item` contains `productComplianceRows`.

If `fetchCompliance` is called, and `rows` is empty, it uses `item`.

**Is it possible that `rows` is NOT empty but contains empty objects?**
`getProductComplianceController` returns `doc?.rows || []`.

If a `ProductCompliance` document exists but has empty rows, it might return `[]`.

**Let's verify `ProductCompliance.jsx` component.**
It receives `productRows` as props.

**Wait, I see a possible issue with `useEffect` dependencies or race conditions.**

Let's look at `fetchCompliance` again.

```javascript
    const fetchCompliance = async () => {
      // ...
      try {
        const res = await api.get(...)
        const rows = res.data?.data || [];
        if (rows.length) {
          // ...
        } else if (item && Array.isArray(item.productComplianceRows) && item.productComplianceRows.length) {
          setProductRows(item.productComplianceRows);
          // ...
        }
      } 
      // ...
    };
```

If `item` is updated *after* `fetchCompliance` returns empty `rows`, does it re-run?
Yes, `item` is in dependency array.

**However**, if `item` does NOT have `productComplianceRows` populated (e.g. if `getAllClientsController` or `getClientByIdController` doesn't select/populate it), then fallback fails.

Let's check `getClientByIdController` in `client.controller.js`.
I need to check if it returns the full nested structure.

If `getClientByIdController` returns the client, does it include `productComplianceRows` inside `cteDetailsList`?
The schema has it.

**Another possibility:**
The `productRows` state in `PlantProcess.jsx` is initialized with one empty row:
```javascript
  const [productRows, setProductRows] = useState([
    {
      generate: 'No',
      // ...
    }
  ]);
```

If `fetchCompliance` finds nothing (neither in API nor `item`), it does **NOT** reset `productRows` to empty or keep the default. It does nothing.
So it keeps the default 1 empty row.

**But the user says "Data is not Showing ... although it is availabe in database".**

This implies they expect to see data.

If `item.productComplianceRows` is present, it should show.

**Maybe `item` structure is different?**
In `AddClient.jsx`, we saw `item` (from `cteList`) has `productComplianceRows`.

**Let's check `ClientAudit.jsx` or similar.**

**Wait!**
In `PlantProcess.jsx`, `fetchCompliance` uses `item.productComplianceRows`.
But in `AddClient.jsx` (and the Schema), it is `productComplianceRows` (plural).

**What if `item` in `PlantProcess` is actually a plain object from the array?**
Yes.

**Let's verify `getClientByIdController` to ensure it returns the deep fields.**

I'll read `getClientByIdController`.

Also, I will modify `PlantProcess.jsx` to ensure that if `rows` is empty, it explicitly checks `item` and logs if it's missing.

**Actually, I found a logic gap.**
If `ProductComplianceModel` has a document for this `clientId/type/itemId`, but `rows` is empty `[]`.
Then `if (rows.length)` is false.
It goes to `else if (item ...`.

If `item` has data, it sets it.

**But what if `ProductComplianceModel` DOES NOT EXIST?**
`doc` is null. `data` is `[]`. `rows.length` is 0.
Fallback to `item`.

**What if the user saved via `PlantProcess` before?**
Then `ProductComplianceModel` exists.

**What if the user saved via `AddClient` *after* saving in `PlantProcess` (empty)?**
The `ProductComplianceModel` (empty) takes precedence over `ClientModel` (with data) because of the order of checks?
No, if `rows.length` is 0, it falls back.

**Wait, `rows` from API is `res.data?.data`.**
If `doc` exists but `rows` is empty, it returns `[]`.

**Maybe the issue is `useEffect` not triggering when `item` becomes available?**
`item` depends on `client`. `client` is fetched.

**Let's look at `getClientByIdController`.**

I will perform the following:
1.  Check `getClientByIdController` to see if it populates the necessary fields.
2.  If that looks correct, I'll modify `PlantProcess.jsx` to be more robust in merging/selecting data sources.

**Hypothesis:** The `productComplianceRows` might be lost in `item` if not explicitly selected or if `lean()` is used incorrectly (though `findById` returns Mongoose doc by default).

**Another thing:** `AddClient.jsx` was fixed to save `productComplianceRows` to `ClientModel`.
`PlantProcess.jsx` reads from `ProductComplianceModel` first.

If I create a new client, `ProductComplianceModel` is missing.
I go to `PlantProcess`. `res.data.data` is `[]`.
It uses `item.productComplianceRows`. This should work.

**Maybe the `item` in `PlantProcess` is not what we think.**
`findItem` uses `client.productionFacility...id(itemId)`.

**Let's use `console.log` debugging or just strict inspection.**

**One detail from `AddClient.jsx` fix:**
We ensured `productComplianceRows` are saved.

**Wait, I see `fetchCompliance` is inside `useEffect`.**
```javascript
  useEffect(() => {
    // ... definitions ...
    fetchCompliance();
    // ...
  }, [clientId, type, itemId, item]);
```
If `item` changes, `fetchCompliance` runs.

**Is it possible `api.get` throws an error?**
`catch (_)` handles it and falls back to `item`.

**Is it possible `API_ENDPOINTS` is wrong?**
Checked `client.route.js`: `router.get('/:clientId/product-compliance', ...)` matches.

**Let's look at `ProductCompliance.jsx`.**
It takes `productRows` as prop.
It slices them for pagination:
```javascript
  const currentRows = productRows.slice(indexOfFirstRow, indexOfLastRow);
```
If `productRows` is `[]`, `currentRows` is `[]`.

**Wait, `PlantProcess.jsx` initializes `productRows` with 1 empty row.**
If `fetchCompliance` finds data, it calls `setProductRows`.

**What if `item.productComplianceRows` is `undefined`?**
Then it stays as the default 1 empty row.

**Is it possible the backend field name is different?**
Schema says `productComplianceRows`.
Controller `updateClientController` uses `$set`.

**I will try to force a check on `item` in `PlantProcess.jsx` and potentially refresh the `item` logic.**

**Actually, I see `getClientByIdController` might not be returning the updated data if it's cached or something? No.**

**Let's try to fetch `all-product-compliance-rows` or similar?**
No, that's for a list.

**Proposed Plan:**
1.  Check `getClientByIdController` in `server/controllers/client.controller.js`.
2.  Modify `PlantProcess.jsx` to debug/fix the data loading logic.
    -   Specifically, ensure `item` actually has the data.
    -   Maybe `fetchClientDetails` needs to ensure it gets the full object.

**Let's read `getClientByIdController` first.**