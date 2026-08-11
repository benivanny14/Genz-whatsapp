import React, { useState } from 'react';
import encryptionService from '../services/encryptionService';

const E2EEKeysManager = () => {
  const [status, setStatus] = useState('idle');
  const [publicKey, setPublicKey] = useState(null);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const handleGenerate = async () => {
    setStatus('generating');
    try {
      const res = await encryptionService.generateKeyPair();
      if (res?.success) {
        setPublicKey(res.keyPair.publicKey);
        setStatus('generated');
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error('Generate keys failed:', e);
      setStatus('error');
    }
  };

  const handleRotate = async () => {
    setStatus('rotating');
    try {
      const res = await encryptionService.rotateKeys();
      if (res?.success) {
        setPublicKey(res.keyPair.publicKey);
        setStatus('rotated');
        setConfirmRotate(false);
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error('Rotate keys failed:', e);
      setStatus('error');
    }
  };

  const handleExport = async () => {
    try {
      const exported = await encryptionService.exportKeys({ includePrivate: true });
      if (!exported?.data) return;
      const blob = new Blob([JSON.stringify(exported.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `genz_e2ee_keys_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export keys failed:', e);
    }
  };

  const handleExportArchive = async () => {
    try {
      const exported = await encryptionService.exportKeyStore();
      if (!exported?.data) return;
      const blob = new Blob([JSON.stringify(exported.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `genz_e2ee_key_store_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export key store failed:', e);
    }
  };

  const handleImport = async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = parsed?.current
        ? await encryptionService.importKeyStore(parsed)
        : await encryptionService.importKeys(parsed);
      if (res?.success) {
        setPublicKey(res.data.publicKey);
        setStatus('imported');
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error('Import keys failed:', e);
      setStatus('error');
    }
  };

  const handleShowPublic = async () => {
    try {
      const exp = await encryptionService.exportKeys({ includePrivate: false });
      if (exp?.data?.publicKey) {
        setPublicKey(exp.data.publicKey);
        await navigator.clipboard?.writeText(JSON.stringify(exp.data.publicKey));
      }
    } catch (e) {
      console.error('Show public key failed:', e);
    }
  };

  return (
    <div style={{ padding: 12, border: '1px solid #e6e6e6', borderRadius: 6 }}>
      <h4 style={{ marginTop: 0 }}>E2EE Key Manager</h4>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={handleGenerate}>Generate Key Pair</button>
        <button onClick={() => setConfirmRotate(true)}>Rotate Key Pair</button>
        <button onClick={handleExport}>Export (private)</button>
        <button onClick={handleExportArchive}>Export Archive (all keys)</button>
        <label style={{ display: 'inline-block' }}>
          <input type="file" accept="application/json" onChange={handleImport} style={{ display: 'none' }} />
          <button type="button">Import Keys</button>
        </label>
        <button onClick={handleShowPublic}>Show / Copy Public Key</button>
      </div>
      {confirmRotate && (
        <div style={{ marginTop: 8, padding: 10, border: '1px solid #f59e0b', borderRadius: 6, background: '#fffbeb' }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Rotate encryption keys?</strong>
            <div style={{ marginTop: 4, fontSize: 13 }}>
              This replaces your active encryption key pair. Your previous keys are
              archived in this browser so old messages stay readable here, but new
              messages will be encrypted to the new key — and clearing browser
              storage permanently loses the archived keys.
            </div>
          </div>
          <button onClick={handleRotate} style={{ marginRight: 8 }}>Confirm Rotation</button>
          <button onClick={() => setConfirmRotate(false)}>Cancel</button>
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <strong>Status:</strong> {status}
      </div>
      {publicKey && (
        <div className="text-xs text-green-500 font-medium">Keys generated successfully. You can now download them.</div>
      )}
    </div>
  );
};

export default E2EEKeysManager;
