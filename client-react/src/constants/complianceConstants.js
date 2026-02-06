export const WASTE_TYPES = {
  PLASTIC: 'Plastic',
  ELECTRONIC: 'Electronic',
  BATTERY: 'Battery',
  TYRE: 'Tyre',
  USED_OIL: 'Used Oil'
};

export const ENTITY_TYPES = {
  PIBO: 'PIBO',
  PWP: 'PWP'
};

export const CATEGORIES = [
  'Category I',
  'Category II',
  'Category III',
  'Category IV',
  'Not Applicable'
];

export const POLYMER_TYPES = [
  'HDPE',
  'PET',
  'PP',
  'PS',
  'LDPE',
  'LLDPE',
  'MLP',
  'Others',
  'PLA',
  'PBAT'
];

export const PACKAGING_TYPES = [
  'Primary Packaging',
  'Secondary Packaging',
  'Tertiary Packaging'
];

export const CONTAINER_CAPACITIES = [
  'containers < 0.9 l',
  'containers > 0.9l and < 4.9 l',
  'containers > 4.9 l'
];

export const LAYER_TYPES = [
  'Not Applicable',
  'MultiLayer',
  'MonoLayer'
];

export const UREP_YEAR_OPTIONS = [
  '2023-24',
  '2024-25',
  '2025-26',
  '2026-27',
  '2027-28',
  '2028-29',
  '2029-30'
];

export const UREP_DEFAULT_TARGETS = {
  '2025-26': { 'Category I': 30, 'Category II': 10, 'Category III': 5 },
  '2026-27': { 'Category I': 40, 'Category II': 10, 'Category III': 5 },
  '2027-28': { 'Category I': 50, 'Category II': 20, 'Category III': 10 },
  '2028-29': { 'Category I': 60, 'Category II': 20, 'Category III': 10 }
};

export const CATEGORY_II_TYPE_OPTIONS = [
  'Carry Bags',
  'Plastic Sheet or like material',
  'Non-woven Plastic carry bags'
];

export const CLIENT_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PRE_VALIDATION: 'PRE_VALIDATION',
  AUDIT: 'AUDIT',
  POST_AUDIT: 'POST_AUDIT' // Assuming this might be used or useful
};
