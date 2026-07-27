const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";
const LEGACY_SECRET_KEY = "GENZ_WHATSAPP_SECRET_KEY";
const SALT = process.env.MESSAGE_ENCRYPTION_SALT || "salt";
const PBKDF2_ITERATIONS = Number(process.env.MESSAGE_ENCRYPTION_ITERATIONS || 100000);

const deriveKey = (secret, iterations = PBKDF2_ITERATIONS) => (
  crypto.pbkdf2Sync(secret, SALT, iterations, 32, "sha256")
);

const getActiveSecret = () => {
  if (process.env.MESSAGE_ENCRYPTION_SECRET) {
    return {
      secret: process.env.MESSAGE_ENCRYPTION_SECRET,
      iterations: PBKDF2_ITERATIONS
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("MESSAGE_ENCRYPTION_SECRET is required in production");
  }

  // Legacy fallback keeps old development/demo messages readable while real
  // deployments migrate to MESSAGE_ENCRYPTION_SECRET and per-device E2EE.
  return {
    secret: LEGACY_SECRET_KEY,
    iterations: 1
  };
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

  try {
    return decryptWithKey(hash, deriveKey(secret, iterations));
  } catch (error) {
    if (secret === LEGACY_SECRET_KEY) {
      throw error;
    }

    return decryptWithKey(hash, deriveKey(LEGACY_SECRET_KEY, 1));
  }
};
