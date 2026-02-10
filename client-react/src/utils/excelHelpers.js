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
