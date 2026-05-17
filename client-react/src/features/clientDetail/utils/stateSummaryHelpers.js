export const parseFlexibleDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const rawValue = value.toString().trim();
  if (!rawValue || rawValue === "-") return null;

  const dayFirstMatch = rawValue.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  const isoMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);

  if (dayFirstMatch) {
    const [, day, month, year] = dayFirstMatch;
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  const parsedDate = new Date(rawValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const isPastDate = (value) => {
  const parsedDate = parseFlexibleDate(value);
  if (!parsedDate) return false;

  const compareDate = new Date(parsedDate);
  compareDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return compareDate.getTime() < today.getTime();
};

export const normalizeStateName = (value) =>
  (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
