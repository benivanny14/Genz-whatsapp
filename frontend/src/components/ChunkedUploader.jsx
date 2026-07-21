import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, File, FileVideo, FileAudio, Image, Loader } from 'lucide-react';
import { resolveApiBase } from '../utils/resolveApiBase';

const API_URL = resolveApiBase();
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
});

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileIcon = (type) => {
  if (type?.startsWith('video/')) return <FileVideo size={20} className="text-blue-400" />;
  if (type?.startsWith('audio/')) return <FileAudio size={20} className="text-purple-400" />;
  if (type?.startsWith('image/')) return <Image size={20} className="text-green-400" />;
  return <File size={20} className="text-gray-400" />;
};

const ChunkedUploader = ({ onComplete, onClose, onUploadComplete, onCancel, accept = '*/*', maxSizeGB = 10, label = 'Chagua File' }) => {
  // Support both prop naming conventions
  const handleComplete = onComplete || onUploadComplete;
  const handleClose = onClose || onCancel;
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | done | error
  const [error, setError] = useState('');
  const [speed, setSpeed] = useState('');
  const [eta, setEta] = useState('');
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const fileRef = useRef(null);
  const abortRef = useRef(false);
  const startTimeRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const maxBytes = maxSizeGB * 1024 * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setError(`File ni kubwa sana. Max: ${maxSizeGB}GB`);
      return;
    }
    setFile(selectedFile);
    setError('');
    setStatus('idle');
    setProgress(0);
    setUploadedBytes(0);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, []);

  const startUpload = async () => {
    if (!file || status === 'uploading') return;
    setStatus('uploading');
    setProgress(0);
    setError('');
    abortRef.current = false;
    startTimeRef.current = Date.now();

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    try {
      // For small files (< 5MB), use simple upload
      if (file.size <= CHUNK_SIZE) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        setStatus('done');
        setProgress(100);
        onUploadComplete?.(data.fileUrl, file.name, file.type, file.size);
        return;
      }

      // Initialize chunked upload
      const initRes = await fetch(`${API_URL}/advanced/upload/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          fileName: file.name,
          totalChunks,
          fileSize: file.size,
          mimeType: file.type
        })
      });
      if (!initRes.ok) throw new Error('Failed to initialize upload');
      const { uploadId } = await initRes.json();

      // Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        if (abortRef.current) throw new Error('Upload cancelled');
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const formData = new FormData();
        formData.append('chunk', chunk, `chunk_${i}`);
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', String(i));

        const chunkRes = await fetch(`${API_URL}/advanced/upload/chunk`, { method: 'POST', headers: authHeaders(), body: formData });
        if (!chunkRes.ok) throw new Error(`Chunk ${i} failed`);

        const uploaded = end;
        setUploadedBytes(uploaded);
        const pct = Math.round((uploaded / file.size) * 100);
        setProgress(pct);

        // Speed & ETA calculation
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const speedBps = uploaded / elapsed;
        const remaining = (file.size - uploaded) / speedBps;
        setSpeed(formatBytes(speedBps) + '/s');
        if (remaining < 60) setEta(`${Math.round(remaining)}s`);
        else setEta(`${Math.round(remaining / 60)}m ${Math.round(remaining % 60)}s`);
      }

      // Merge chunks
      const completeRes = await fetch(`${API_URL}/advanced/upload/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ uploadId, fileName: file.name, totalChunks })
      });
      if (!completeRes.ok) throw new Error('Failed to merge file');
      const completeData = await completeRes.json();

      setStatus('done');
      setProgress(100);
      setSpeed('');
      setEta('');
      handleComplete?.(
        completeData.fileUrl?.startsWith('http') ? completeData.fileUrl : `${API_URL}${completeData.fileUrl}`,
        file.name, file.type, file.size
      );
    } catch (err) {
      if (err.message !== 'Upload cancelled') {
        setError(err.message || 'Upload failed');
        setStatus('error');
      } else {
        setStatus('idle');
        setProgress(0);
      }
    }
  };

  const cancelUpload = () => {
    abortRef.current = true;
    setStatus('idle');
    setProgress(0);
    setFile(null);
    handleClose?.();
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      {!file && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-blue-500/40 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500/80 hover:bg-blue-500/5 transition-all group"
        >
          <Upload size={40} className="text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
          <p className="text-white font-semibold text-base">{label}</p>
          <p className="text-gray-500 text-sm mt-1">Drag & Drop au bonyeza hapa</p>
          <p className="text-gray-600 text-xs mt-2">Max: {maxSizeGB}GB • Aina zote za files</p>
          <input
            type="file"
            ref={fileRef}
            hidden
            accept={accept}
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
        </div>
      )}

      {/* File Selected */}
      {file && status !== 'done' && (
        <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
          {/* File Info */}
          <div className="flex items-center gap-3 mb-4">
            {getFileIcon(file.type)}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{file.name}</p>
              <p className="text-gray-400 text-xs">{formatBytes(file.size)} • {file.type || 'Unknown type'}</p>
            </div>
            {status !== 'uploading' && (
              <button onClick={() => { setFile(null); setStatus('idle'); setProgress(0); }}
                className="p-1 hover:bg-white/10 rounded-full text-gray-400" aria-label="Close">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {status === 'uploading' && (
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{formatBytes(uploadedBytes)} / {formatBytes(file.size)}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full upload-progress-bar transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Loader size={10} className="animate-spin" /> {speed}
                </span>
                <span>ETA: {eta}</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {status !== 'uploading' ? (
              <button
                onClick={startUpload}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Upload size={16} /> Pakia Sasa
              </button>
            ) : (
              <button
                onClick={cancelUpload}
                className="flex-1 py-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl font-semibold text-sm"
              >
                Acha Upload
              </button>
            )}
          </div>
        </div>
      )}

      {/* Success */}
      {status === 'done' && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle size={24} className="text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-green-300 font-semibold">Upload Imekamilika!</p>
            <p className="text-green-400/70 text-xs truncate">{file?.name}</p>
          </div>
          <button
            onClick={() => { setFile(null); setStatus('idle'); setProgress(0); }}
            className="text-green-400 hover:text-white"
           aria-label="Close">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChunkedUploader;
