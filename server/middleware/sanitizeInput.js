const hasOwn = Object.prototype.hasOwnProperty;

const sanitizeKey = (key) => key.replace(/\$/g, "").replace(/\./g, "_");

const sanitizeValueInPlace = (value) => {
  if (Array.isArray(value)) {
    value.forEach((item) => sanitizeValueInPlace(item));
    return value;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  for (const key of Object.keys(value)) {
    if (!hasOwn.call(value, key)) continue;

    const sanitizedKey = sanitizeKey(key);
    const childValue = value[key];

    if (sanitizedKey !== key) {
      delete value[key];
      value[sanitizedKey] = childValue;
    }

    sanitizeValueInPlace(value[sanitizedKey]);
  }

  return value;
};

export const sanitizeInput = (req, _res, next) => {
  sanitizeValueInPlace(req.body);
  sanitizeValueInPlace(req.params);
  sanitizeValueInPlace(req.query);
  next();
};

export default sanitizeInput;
