const mongoose = require('mongoose');

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (mongoose.Types.ObjectId.isValid(value)) return String(value);
  if (value._id && value._id !== value) return normalizeId(value._id);
  if (value.id && value.id !== value) return normalizeId(value.id);
  if (typeof value.toString === 'function') return value.toString();
  return null;
};

try {
  const objId = new mongoose.Types.ObjectId();
  const result = normalizeId(objId);
  console.log("Result:", result);
} catch (e) {
  console.error("Error:", e);
}
