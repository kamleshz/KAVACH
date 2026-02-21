import { read, utils, writeFile } from 'xlsx';

/**
 * Generates and downloads an Excel file from JSON data
 * @param {Array} data - Array of objects to export
 * @param {string} fileName - Name of the file to save
 * @param {string} sheetName - Name of the sheet (default: "Sheet1")
 */
export const generateExcelFile = (data, fileName, sheetName = "Sheet1") => {
  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, sheetName);
  writeFile(wb, fileName);
};

/**
 * Creates and downloads an Excel template with headers and sample data
 * @param {Array} headers - Array of column headers
 * @param {Array} sampleData - Array of sample objects
 * @param {string} fileName - Name of the file to save
 * @param {string} sheetName - Name of the sheet (default: "Template")
 */
export const createTemplate = (headers, sampleData, fileName, sheetName = "Template") => {
  const ws = utils.json_to_sheet(sampleData, { header: headers });
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, sheetName);
  writeFile(wb, fileName);
};

/**
 * Creates an Excel template with a main sheet and reference data sheets
 * used for dropdown-like guidance (e.g. E-Waste Categories and EEE list).
 * @param {Array} headers - Array of column headers for the main template
 * @param {string} fileName - Name of the file to save
 * @param {Array} categories - Array of category names
 * @param {Object} eWasteData - Mapping of category -> [{ code, description, avgLife }]
 */
export const createTemplateWithReferenceData = (headers, fileName, categories, eWasteData) => {
  const mainSheet = utils.aoa_to_sheet([headers]);

  const categoriesSheetData = [
    ["Category of EEE"],
    ...categories.map((category) => [category])
  ];
  const categoriesSheet = utils.aoa_to_sheet(categoriesSheetData);

  const eeeListHeader = ["Category of EEE", "EEE Code", "List of EEE", "Product Avg Life"];
  const eeeListRows = [eeeListHeader];

  Object.entries(eWasteData || {}).forEach(([category, items]) => {
    (items || []).forEach((item) => {
      eeeListRows.push([
        category,
        item.code || "",
        item.description || "",
        item.avgLife != null ? item.avgLife : ""
      ]);
    });
  });

  const eeeListSheet = utils.aoa_to_sheet(eeeListRows);

  const wb = utils.book_new();
  utils.book_append_sheet(wb, mainSheet, "Template");
  utils.book_append_sheet(wb, categoriesSheet, "Categories");
  utils.book_append_sheet(wb, eeeListSheet, "EEE_List");
  writeFile(wb, fileName);
};

/**
 * Parses an Excel file and returns JSON data
 * @param {File} file - The uploaded Excel file
 * @returns {Promise<Array>} - Parsed data as an array of objects
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const bstr = e.target.result;
        const wb = read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = utils.sheet_to_json(ws);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
