import { useState } from 'react';
import { parseExcelFile, createTemplate } from '../utils/excelHelpers';
import { toast } from 'react-toastify';

export const useExcelImport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const importData = async (e, onDataParsed) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await parseExcelFile(file);
      if (data && data.length > 0) {
        if (onDataParsed) {
          onDataParsed(data);
        }
        toast.success(`Successfully uploaded ${data.length} rows`);
      } else {
        toast.warning("File is empty or invalid");
      }
    } catch (err) {
      console.error("Excel import error:", err);
      setError(err);
      toast.error("Failed to parse Excel file");
    } finally {
      setIsLoading(false);
      // Reset input value to allow uploading the same file again if needed
      e.target.value = null;
    }
  };

  const downloadTemplate = (templateConfig) => {
    try {
      createTemplate(
        templateConfig.headers, 
        templateConfig.sampleData, 
        templateConfig.fileName
      );
      toast.success("Template downloaded successfully");
    } catch (err) {
      console.error("Template download error:", err);
      toast.error("Failed to download template");
    }
  };

  return {
    importData,
    downloadTemplate,
    isLoading,
    error
  };
};
