const openpgp = require('openpgp');

/**
 * E2EE utilities - OpenPGP (ECC Curve25519)
 * Generates per-user keypair, encrypts for recipient public key.
 * Private key is stored encrypted with user's password-derived passphrase.
 */

async function generateKeyPair(userId) {
  const { privateKey, publicKey } = await openpgp.generateKey({
    type: 'ecc',
    curve: 'curve25519',
    userIDs: [{ name: String(userId) }],
    passphrase: String(userId),
    format: 'armored'
  });
  return { privateKey, publicKey };
}

async function encryptMessage(text, publicKeyArmored) {
  if (!publicKeyArmored) return text;
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: String(text) }),
    encryptionKeys: publicKey
  });
  return encrypted;
}

async function decryptMessage(encryptedText, privateKeyArmored, passphrase) {
  if (!privateKeyArmored || !encryptedText) return encryptedText;
  // Detect if not armored PGP (plain text) - return as is
  if (!String(encryptedText).includes('-----BEGIN PGP MESSAGE-----')) return encryptedText;
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
    passphrase: String(passphrase)
  });
  const message = await openpgp.readMessage({ armoredMessage: encryptedText });
  const { data: decrypted } = await openpgp.decrypt({
    message,
    decryptionKeys: privateKey
  });
  return decrypted;
}

module.exports = { generateKeyPair, encryptMessage, decryptMessage };
