export const E_WASTE_CATEGORIES_TEMPLATE = {
  fileName: "Categories_Compliance_Template.xlsx",
  headers: [
    "Category Code", 
    "Product Name", 
    "Category of EEE", 
    "EEE Code", 
    "List of EEE", 
    "Product Avg Life", 
    "Sales / Import Date", 
    "Quantity sold/Imported in MT"
  ],
  sampleData: [
    { 
      "Category Code": "CODE/001", 
      "Product Name": "Sample Product", 
      "Category of EEE": "Information Technology and Telecommunication Equipment", 
      "EEE Code": "EEE/001", 
      "List of EEE": "Centralised data processing: Mainframes", 
      "Product Avg Life": "5", 
      "Sales / Import Date": "2023-01-01", 
      "Quantity sold/Imported in MT": "100" 
    }
  ]
};

export const STORAGE_AUDIT_TEMPLATE = {
  fileName: "Storage_Audit_Template.xlsx",
  headers: [
    "EEE Code",
    "Product Name",
    "List of EEE",
    "Date of Storage",
    "End Date",
    "Difference",
    "Quantity (MT)",
    "Remarks"
  ],
  sampleData: [
    {
      "EEE Code": "EEE/001",
      "Product Name": "Sample Product",
      "List of EEE": "IT Equipment",
      "Date of Storage": "2023-01-01",
      "End Date": "2023-01-15",
      "Difference": "14 Days",
      "Quantity (MT)": "1.5",
      "Remarks": "Stored safely"
    }
  ]
};

export const ROHS_COMPLIANCE_TEMPLATE = {
  fileName: "ROHS_Compliance_Template.xlsx",
  headers: [
    "EEE Code",
    "Substance",
    "Symbol",
    "Maximum Allowed Limit",
    "Actual percentage"
  ],
  sampleData: [
    {
      "EEE Code": "EEE/001",
      "Substance": "Lead",
      "Symbol": "Pb",
      "Maximum Allowed Limit": "0.1",
      "Actual percentage": "0.05"
    }
  ]
};
