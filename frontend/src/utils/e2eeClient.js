import * as openpgp from 'openpgp';

/**
 * E2EE client - decrypt messages encrypted with recipient public key.
 * Uses user's privateKey (armored, encrypted with userId passphrase).
 */

export async function decryptMessage(encryptedText, privateKeyArmored, passphrase) {
  if (!privateKeyArmored || !encryptedText) return encryptedText;
  if (!String(encryptedText).includes('-----BEGIN PGP MESSAGE-----')) return encryptedText;
  try {
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
  } catch (e) {
    console.warn('[E2EE] decrypt failed', e.message);
    return '🔒 Encrypted message';
  }
}

export async function encryptForRecipient(text, publicKeyArmored) {
  if (!publicKeyArmored) return text;
  try {
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
    const encrypted = await openpgp.encrypt({
      message: await openpgp.createMessage({ text: String(text) }),
      encryptionKeys: publicKey
    });
    return encrypted;
  } catch (e) {
    console.warn('[E2EE] encrypt failed', e.message);
    return text;
  }
}
