const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";
const SALT = process.env.MESSAGE_ENCRYPTION_SALT || "salt";
const PBKDF2_ITERATIONS = Number(process.env.MESSAGE_ENCRYPTION_ITERATIONS || 100000);

const deriveKey = (secret, iterations = PBKDF2_ITERATIONS) => (
  crypto.pbkdf2Sync(secret, SALT, iterations, 32, "sha256")
);

// SECURITY (4.1): the legacy hardcoded fallback key is removed. Without
// MESSAGE_ENCRYPTION_SECRET the module fails loudly instead of silently
// encrypting with a well-known key that anyone can use to decrypt.
const getActiveSecret = () => {
  if (process.env.MESSAGE_ENCRYPTION_SECRET) {
    return {
      secret: process.env.MESSAGE_ENCRYPTION_SECRET,
      iterations: PBKDF2_ITERATIONS
    };
  }

  throw new Error("MESSAGE_ENCRYPTION_SECRET is required");
};

const decryptWithKey = (hash, key) => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(hash.iv, "hex"),
  );
  let decrypted = decipher.update(hash.content, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

exports.encrypt = (text) => {
  const IV = crypto.randomBytes(16);
  const { secret, iterations } = getActiveSecret();
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(secret, iterations), IV);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return { iv: IV.toString("hex"), content: encrypted };
};

exports.decrypt = (hash) => {
  const { secret, iterations } = getActiveSecret();

  // SECURITY (4.1): no fallback to a legacy key — fail rather than silently
  // decrypt with a known key.
  return decryptWithKey(hash, deriveKey(secret, iterations));
};
