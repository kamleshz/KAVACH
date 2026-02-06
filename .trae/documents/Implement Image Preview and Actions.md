I have successfully updated the "UPLOAD PHOTO" column to match the requested design with image previews and "View/Change" options.

**Changes Implemented:**
1.  **Image Preview Logic:**
    *   Updated the `beforeUpload` handler to read the selected file as a Data URL (base64) using `FileReader`. This allows the image to be displayed immediately without a backend round-trip.
    *   The `photoRef` field now stores the base64 string of the image.

2.  **Conditional Rendering:**
    *   **If no image is selected:** Displays the dashed upload box with the cloud icon and "Upload" text.
    *   **If an image exists:** Displays a 64x64px preview thumbnail of the image.

3.  **View/Change Actions:**
    *   Added "View" and "Change" links below the thumbnail.
    *   **View:** Opens the full-size image (base64 data) in a new browser tab.
    *   **Change:** Triggers the file upload dialog again to replace the existing image.

This implementation provides a much richer user experience, allowing users to verify their uploads instantly.

**Code Reference:**
- `client-react/src/components/PlantProcessSteps/SingleUsePlastic.jsx`