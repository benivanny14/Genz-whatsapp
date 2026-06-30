/**
 * StatusFeature.jsx
 * Weka faili hii kwenye: src/components/Status/StatusFeature.jsx
 * 
 * MATUMIZI:
 * import StatusFeature from './components/Status/StatusFeature';
 * <StatusFeature currentUserId={currentUserId} apiBase={API_BASE_URL} token={token} />
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Rangi na Mada ───────────────────────────────────────────────────────────
const COLORS = {
  primary: "#25D366",
  primaryDark: "#128C7E",
  bg: "#111B21",
  surface: "#1F2C34",
  surfaceLight: "#2A3942",
  text: "#E9EDEF",
  textMuted: "#8696A0",
  border: "#2A3942",
  danger: "#FF4444",
  overlay: "rgba(0,0,0,0.85)",
};

const BG_OPTIONS = [
  "#075E54","#128C7E","#25D366","#DCF8C6",
  "#1A1A2E","#16213E","#0F3460","#533483",
  "#E94560","#FF6B6B","#FFD93D","#6BCB77",
  "#000000","#FFFFFF","#2C3E50","#8E44AD",
];

const EMOJI_REACTIONS = ["❤️","😂","😮","😢","🙏","👍"];

// ─── API Helper ──────────────────────────────────────────────────────────────
const api = (base, token) => ({
  get: (path) => fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json()),
  post: (path, body) => fetch(`${base}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(r => r.json()),
  postForm: (path, form) => fetch(`${base}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  }).then(r => r.json()),
  delete: (path) => fetch(`${base}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json()),
});

// ─── Muda wa Kiswahili ───────────────────────────────────────────────────────
const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Sasa hivi";
  if (mins < 60) return `Dakika ${mins} zilizopita`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Masaa ${hrs} yaliyopita`;
  return "Jana";
};

const timeLeft = (expiresAt) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Imeisha";
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return hrs > 0 ? `Masaa ${hrs}` : `Dakika ${mins}`;
};

// ─── Component: StatusBar (progress bar juu) ─────────────────────────────────
function StatusProgressBars({ total, current, duration, onNext }) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    setProgress(0);
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const pct = Math.min((elapsed / (duration * 1000)) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onNext();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [current, duration]);

  return (
    <div style={{ display: "flex", gap: 3, padding: "10px 12px 0" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 2, borderRadius: 2,
          background: i < current ? COLORS.text : "rgba(255,255,255,0.35)",
          overflow: "hidden"
        }}>
          {i === current && (
            <div style={{
              height: "100%", width: `${progress}%`,
              background: COLORS.text,
              transition: "none"
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Component: StatusViewer (kuona status moja) ─────────────────────────────
function StatusViewer({ statuses, userInfo, currentUserId, onClose, onReact, onDelete, apiBase, token }) {
  const [idx, setIdx] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const isOwn = String(userInfo._id) === String(currentUserId);
  const current = statuses[idx];
  const http = api(apiBase, token);

  useEffect(() => {
    if (!current) return;
    // Rekodi view
    if (!isOwn) {
      http.post(`/status/${current._id}/view`, {}).catch(() => {});
    }
    // Load viewers kama ni yangu
    if (isOwn) {
      http.get(`/status/${current._id}/viewers`)
        .then(d => { if (d.success) setViewers(d.views || []); })
        .catch(() => {});
    }
  }, [idx, current?._id]);

  const goNext = useCallback(() => {
    if (idx < statuses.length - 1) setIdx(i => i + 1);
    else onClose();
  }, [idx, statuses.length]);

  const goPrev = () => { if (idx > 0) setIdx(i => i - 1); };

  if (!current) return null;

  const duration = current.type === "voice" ? (current.duration || 10) :
                   current.type === "video" ? (current.duration || 15) : 5;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "#000", display: "flex", flexDirection: "column"
    }}>
      {/* Progress bars */}
      <StatusProgressBars
        total={statuses.length}
        current={idx}
        duration={duration}
        onNext={goNext}
      />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px", zIndex: 2
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: COLORS.primary,
          backgroundImage: userInfo.profilePicture ? `url(${userInfo.profilePicture})` : "none",
          backgroundSize: "cover", backgroundPosition: "center",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0
        }}>
          {!userInfo.profilePicture && (userInfo.username?.[0] || "?").toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 15 }}>
            {isOwn ? "Yangu" : userInfo.username}
          </div>
          <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
            {timeAgo(current.createdAt)} • {timeLeft(current.expiresAt)} imebaki
          </div>
        </div>
        {isOwn && (
          <button onClick={() => {
            if (window.confirm("Futa status hii?")) {
              onDelete(current._id);
              if (statuses.length === 1) onClose();
              else goNext();
            }
          }} style={{
            background: "none", border: "none", color: COLORS.danger,
            fontSize: 20, cursor: "pointer", padding: "4px 8px"
          }}>🗑️</button>
        )}
        <button onClick={onClose} style={{
          background: "none", border: "none", color: COLORS.text,
          fontSize: 22, cursor: "pointer", padding: "4px 8px"
        }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={(e) => {
          const x = e.clientX;
          const w = window.innerWidth;
          if (x < w * 0.3) goPrev();
          else if (x > w * 0.7) goNext();
        }}
      >
        {current.type === "text" && (
          <div style={{
            width: "100%", height: "100%",
            background: current.backgroundColor || COLORS.primaryDark,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 32
          }}>
            <p style={{
              color: "#fff", fontSize: 24, fontWeight: 600,
              textAlign: "center", lineHeight: 1.5,
              fontFamily: current.fontStyle === "serif" ? "Georgia, serif" :
                          current.fontStyle === "mono" ? "monospace" : "sans-serif",
              wordBreak: "break-word", maxWidth: 400
            }}>{current.content}</p>
          </div>
        )}

        {current.type === "image" && (
          <img src={current.mediaUrl} alt="status"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        )}

        {current.type === "video" && (
          <video src={current.mediaUrl} autoPlay loop
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        )}

        {current.type === "voice" && (
          <div style={{
            background: COLORS.surface, borderRadius: 16, padding: 32,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16
          }}>
            <div style={{ fontSize: 64 }}>🎙️</div>
            <p style={{ color: COLORS.text, fontSize: 18 }}>Sauti ya {userInfo.username}</p>
            <audio src={current.mediaUrl} autoPlay controls
              style={{ width: 280 }} />
          </div>
        )}

        {current.content && current.type !== "text" && (
          <div style={{
            position: "absolute", bottom: 60, left: 0, right: 0,
            padding: "8px 20px",
            background: "rgba(0,0,0,0.5)"
          }}>
            <p style={{ color: "#fff", fontSize: 15, textAlign: "center" }}>{current.content}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        {isOwn ? (
          <button onClick={() => setShowViewers(true)} style={{
            flex: 1, background: COLORS.surfaceLight, border: "none",
            color: COLORS.text, borderRadius: 24, padding: "10px 16px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            fontSize: 14
          }}>
            <span>👁️</span>
            <span>{current.views?.length || 0} waliiona</span>
            {current.reactions?.length > 0 && (
              <span style={{ marginLeft: "auto" }}>
                {current.reactions.map(r => r.emoji).slice(0, 3).join("")}
                {" "}{current.reactions.length}
              </span>
            )}
          </button>
        ) : (
          <>
            <div style={{ position: "relative", flex: 1 }}>
              <button onClick={() => setShowEmoji(e => !e)} style={{
                width: "100%", background: COLORS.surfaceLight, border: "none",
                color: COLORS.textMuted, borderRadius: 24,
                padding: "10px 16px", cursor: "pointer", textAlign: "left", fontSize: 14
              }}>
                React kwa status hii...
              </button>
              {showEmoji && (
                <div style={{
                  position: "absolute", bottom: "110%", left: 0,
                  background: COLORS.surface, borderRadius: 32,
                  padding: "8px 12px", display: "flex", gap: 8,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
                }}>
                  {EMOJI_REACTIONS.map(e => (
                    <button key={e} onClick={() => {
                      onReact(current._id, e);
                      setShowEmoji(false);
                    }} style={{
                      background: "none", border: "none",
                      fontSize: 26, cursor: "pointer",
                      transition: "transform 0.1s"
                    }}
                    onMouseEnter={ev => ev.target.style.transform = "scale(1.3)"}
                    onMouseLeave={ev => ev.target.style.transform = "scale(1)"}
                    >{e}</button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Viewers Modal */}
      {showViewers && (
        <div style={{
          position: "absolute", inset: 0, background: COLORS.overlay,
          display: "flex", flexDirection: "column", zIndex: 10
        }}>
          <div style={{
            background: COLORS.surface, borderRadius: "16px 16px 0 0",
            marginTop: "auto", maxHeight: "70%", overflow: "auto"
          }}>
            <div style={{
              padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 16 }}>
                Waliiona ({viewers.length})
              </span>
              <button onClick={() => setShowViewers(false)} style={{
                background: "none", border: "none", color: COLORS.textMuted,
                fontSize: 20, cursor: "pointer"
              }}>✕</button>
            </div>
            {viewers.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: COLORS.textMuted }}>
                Hakuna aliyeona bado
              </div>
            ) : viewers.map((v, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 20px", borderBottom: `1px solid ${COLORS.border}` 
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: COLORS.primaryDark,
                  backgroundImage: v.user?.profilePicture ? `url(${v.user.profilePicture})` : "none",
                  backgroundSize: "cover", backgroundPosition: "center",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700
                }}>
                  {!v.user?.profilePicture && (v.user?.username?.[0] || "?").toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: COLORS.text, fontWeight: 500 }}>{v.user?.username}</div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12 }}>{timeAgo(v.viewedAt)}</div>
                </div>
                {current.reactions?.find(r => String(r.user?._id) === String(v.user?._id)) && (
                  <span style={{ fontSize: 20 }}>
                    {current.reactions.find(r => String(r.user?._id) === String(v.user?._id)).emoji}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component: VideoTrimmer ─────────────────────────────────────────────────
function VideoTrimmer({ file, onConfirm, onCancel }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(30);
  const [playing, setPlaying] = useState(false);
  const MAX_DURATION = 30;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.onloadedmetadata = () => {
        const d = Math.floor(videoRef.current.duration);
        setDuration(d);
        setEnd(Math.min(d, MAX_DURATION));
      };
    }
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.currentTime = start;
      videoRef.current.play();
      setPlaying(true);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const check = () => {
      if (v.currentTime >= end) {
        v.pause();
        setPlaying(false);
      }
    };
    v.addEventListener("timeupdate", check);
    return () => v.removeEventListener("timeupdate", check);
  }, [end]);

  const trimDuration = Math.min(end - start, MAX_DURATION);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000",
      display: "flex", flexDirection: "column", zIndex: 1100
    }}>
      <div style={{
        padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
        borderBottom: `1px solid ${COLORS.border}` 
      }}>
        <button onClick={onCancel} style={{
          background: "none", border: "none", color: COLORS.text,
          fontSize: 22, cursor: "pointer"
        }}>←</button>
        <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 16 }}>
          Kata Video (max sekunde 30)
        </span>
      </div>

      <video ref={videoRef} style={{
        flex: 1, maxHeight: "55vh", objectFit: "contain", background: "#000"
      }} />

      <div style={{ padding: "20px 24px", background: COLORS.surface }}>
        {/* Slider ya Kuanza */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: COLORS.textMuted, fontSize: 13 }}>Anza: {start}s</span>
            <span style={{ color: COLORS.textMuted, fontSize: 13 }}>Muda: {trimDuration}s</span>
          </div>
          <input type="range" min={0} max={Math.max(0, duration - 1)}
            value={start}
            onChange={e => {
              const v = Number(e.target.value);
              setStart(v);
              if (end - v > MAX_DURATION) setEnd(v + MAX_DURATION);
              if (end <= v) setEnd(Math.min(v + 1, duration));
            }}
            style={{ width: "100%", accentColor: COLORS.primary }}
          />
        </div>

        {/* Slider ya Kumaliza */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: COLORS.textMuted, fontSize: 13 }}>Maliza: {end}s</span>
            <span style={{ color: COLORS.textMuted, fontSize: 13 }}>Jumla: {duration}s</span>
          </div>
          <input type="range" min={Math.min(1, duration)} max={duration}
            value={end}
            onChange={e => {
              const v = Number(e.target.value);
              if (v - start > MAX_DURATION) {
                setStart(Math.max(0, v - MAX_DURATION));
              }
              setEnd(v);
            }}
            style={{ width: "100%", accentColor: COLORS.primary }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={togglePlay} style={{
            flex: 1, padding: "12px", background: COLORS.surfaceLight,
            border: "none", borderRadius: 12, color: COLORS.text,
            fontSize: 15, cursor: "pointer"
          }}>
            {playing ? "⏸ Simama" : "▶ Cheza sehemu"}
          </button>
          <button onClick={() => onConfirm({ file, start, end, duration: trimDuration })} style={{
            flex: 1, padding: "12px", background: COLORS.primary,
            border: "none", borderRadius: 12, color: "#fff",
            fontSize: 15, fontWeight: 600, cursor: "pointer"
          }}>
            ✓ Tumia ({trimDuration}s)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component: VoiceRecorder ────────────────────────────────────────────────
function VoiceRecorder({ onConfirm, onCancel }) {
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(null);
  const [blob, setBlob] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const MAX_SECS = 60;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(b);
        setRecorded(URL.createObjectURL(b));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(100);
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s + 1 >= MAX_SECS) { stopRecording(); return MAX_SECS; }
          return s + 1;
        });
      }, 1000);
    } catch {
      alert("Ruhusa ya microphone inahitajika!");
    }
  };

  const stopRecording = () => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setPlaying(false);
    }
  }, [recorded]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: COLORS.overlay,
      display: "flex", alignItems: "flex-end", zIndex: 1100
    }}>
      <div style={{
        width: "100%", background: COLORS.surface,
        borderRadius: "20px 20px 0 0", padding: "24px 24px 32px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 18 }}>
            🎙️ Sauti ya Status
          </span>
          <button onClick={onCancel} style={{
            background: "none", border: "none", color: COLORS.textMuted,
            fontSize: 22, cursor: "pointer"
          }}>✕</button>
        </div>

        {/* Timer */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontSize: 52, fontWeight: 700, fontFamily: "monospace",
            color: recording ? COLORS.danger : COLORS.text
          }}>
            {formatTime(seconds)}
          </div>
          {recording && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: COLORS.danger,
                animation: "pulse 1s infinite"
              }} />
              <span style={{ color: COLORS.danger, fontSize: 14 }}>Inarekodiwa... ({MAX_SECS - seconds}s imebaki)</span>
            </div>
          )}
          {!recording && !recorded && (
            <p style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 8 }}>
              Bonyeza rekodi kuanza (max sekunde 60)
            </p>
          )}
        </div>

        {/* Waveform placeholder */}
        {recording && (
          <div style={{
            height: 48, background: COLORS.surfaceLight, borderRadius: 8,
            marginBottom: 24, display: "flex", alignItems: "center",
            justifyContent: "center", gap: 3, overflow: "hidden"
          }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} style={{
                width: 3, borderRadius: 2,
                background: COLORS.primary,
                height: `${20 + Math.random() * 60}%`,
                animation: `wave ${0.5 + Math.random() * 0.5}s ease infinite alternate` 
              }} />
            ))}
          </div>
        )}

        {/* Playback */}
        {recorded && !recording && (
          <div style={{
            background: COLORS.surfaceLight, borderRadius: 12,
            padding: "12px 16px", marginBottom: 24,
            display: "flex", alignItems: "center", gap: 12
          }}>
            <button onClick={togglePlay} style={{
              width: 44, height: 44, borderRadius: "50%",
              background: COLORS.primary, border: "none",
              color: "#fff", fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              {playing ? "⏸" : "▶"}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.text, fontSize: 14, marginBottom: 4 }}>
                Rekodi yako • {formatTime(seconds)}
              </div>
              <div style={{ height: 3, background: COLORS.border, borderRadius: 2 }}>
                <div style={{ width: playing ? "60%" : "0%", height: "100%", background: COLORS.primary, borderRadius: 2, transition: "width 0.3s" }} />
              </div>
            </div>
            <audio ref={audioRef} src={recorded} style={{ display: "none" }} />
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          {!recording && !recorded && (
            <button onClick={startRecording} style={{
              flex: 1, padding: "14px", background: COLORS.danger,
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 16, fontWeight: 600, cursor: "pointer"
            }}>
              🎙️ Anza Kurekodi
            </button>
          )}
          {recording && (
            <button onClick={stopRecording} style={{
              flex: 1, padding: "14px", background: COLORS.surfaceLight,
              border: `2px solid ${COLORS.danger}`, borderRadius: 12,
              color: COLORS.danger, fontSize: 16, fontWeight: 600, cursor: "pointer"
            }}>
              ⏹ Simamisha
            </button>
          )}
          {recorded && !recording && (
            <>
              <button onClick={() => { setRecorded(null); setBlob(null); setSeconds(0); }} style={{
                flex: 1, padding: "14px", background: COLORS.surfaceLight,
                border: "none", borderRadius: 12, color: COLORS.text,
                fontSize: 15, cursor: "pointer"
              }}>
                🔄 Rekodi Tena
              </button>
              <button onClick={() => onConfirm(blob, seconds)} style={{
                flex: 1, padding: "14px", background: COLORS.primary,
                border: "none", borderRadius: 12, color: "#fff",
                fontSize: 15, fontWeight: 600, cursor: "pointer"
              }}>
                ✓ Tumia Sauti
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes wave { from{transform:scaleY(0.5)} to{transform:scaleY(1)} }
      `}</style>
    </div>
  );
}

// ─── Component: StatusCreator ────────────────────────────────────────────────
function StatusCreator({ onClose, onCreated, apiBase, token }) {
  const [type, setType] = useState("text");
  const [text, setText] = useState("");
  const [bgColor, setBgColor] = useState("#075E54");
  const [fontStyle, setFontStyle] = useState("sans");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [trimData, setTrimData] = useState(null);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const http = api(apiBase, token);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    if (f.type.startsWith("video/")) {
      setType("video");
      setShowTrimmer(true);
    } else {
      setType("image");
    }
  };

  const uploadToCloudinary = async (fileOrBlob, resourceType = "auto") => {
    const form = new FormData();
    form.append("file", fileOrBlob);
    form.append("upload_preset", "genz-whatsapp");
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dl4ws3rcq"}/${resourceType}/upload`,
      { method: "POST", body: form }
    );
    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmit = async () => {
    if (type === "text" && !text.trim()) return alert("Andika ujumbe kwanza!");
    setUploading(true);
    try {
      let mediaUrl = "";
      let duration = 0;

      if (type === "image" && file) {
        mediaUrl = await uploadToCloudinary(file, "image");
      } else if (type === "video" && file) {
        mediaUrl = await uploadToCloudinary(file, "video");
        duration = trimData?.duration || 0;
      } else if (type === "voice" && file) {
        mediaUrl = await uploadToCloudinary(file, "video");
        duration = trimData?.duration || 0;
      }

      const result = await http.post("/status", {
        type,
        content: type === "text" ? text : caption,
        mediaUrl,
        duration,
        backgroundColor: bgColor,
        fontStyle
      });

      if (result.success) {
        onCreated(result.status);
        onClose();
      } else {
        alert(result.message || "Imeshindwa kuweka status");
      }
    } catch (err) {
      alert("Hitilafu: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (showTrimmer && file) {
    return <VideoTrimmer file={file} onCancel={() => { setShowTrimmer(false); setFile(null); setPreview(null); }}
      onConfirm={(data) => { setTrimData(data); setShowTrimmer(false); }} />;
  }

  if (showVoice) {
    return <VoiceRecorder onCancel={() => setShowVoice(false)}
      onConfirm={(blob, secs) => {
        setFile(blob);
        setType("voice");
        setTrimData({ duration: secs });
        setShowVoice(false);
      }} />;
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 900,
      background: COLORS.bg, display: "flex", flexDirection: "column"
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
        borderBottom: `1px solid ${COLORS.border}` 
      }}>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: COLORS.text,
          fontSize: 22, cursor: "pointer"
        }}>←</button>
        <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 17, flex: 1 }}>
          Weka Status Mpya
        </span>
        {!uploading ? (
          <button onClick={handleSubmit} style={{
            background: COLORS.primary, border: "none", borderRadius: 20,
            color: "#fff", padding: "8px 20px", fontSize: 14,
            fontWeight: 600, cursor: "pointer"
          }}>
            Tuma ✓
          </button>
        ) : (
          <div style={{ color: COLORS.textMuted, fontSize: 14 }}>Inapakia...</div>
        )}
      </div>

      {/* Type Selector */}
      <div style={{
        display: "flex", padding: "12px 20px", gap: 8,
        borderBottom: `1px solid ${COLORS.border}` 
      }}>
        {[
          { id: "text", label: "✏️ Maandishi" },
          { id: "image", label: "🖼️ Picha" },
          { id: "video", label: "🎬 Video" },
          { id: "voice", label: "🎙️ Sauti" },
        ].map(t => (
          <button key={t.id} onClick={() => {
            setType(t.id);
            if (t.id === "voice") setShowVoice(true);
            if (t.id === "image" || t.id === "video") fileRef.current?.click();
          }} style={{
            padding: "8px 14px", borderRadius: 20,
            background: type === t.id ? COLORS.primary : COLORS.surfaceLight,
            border: "none", color: type === t.id ? "#fff" : COLORS.textMuted,
            fontSize: 13, fontWeight: 500, cursor: "pointer"
          }}>{t.label}</button>
        ))}
      </div>

      <input ref={fileRef} type="file"
        accept={type === "video" ? "video/*" : "image/*"}
        onChange={handleFile} style={{ display: "none" }} />

      {/* Preview / Input Area */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {type === "text" && (
          <div style={{
            height: "100%", minHeight: 300,
            background: bgColor,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: 24
          }}>
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="Andika ujumbe wako..."
              maxLength={700}
              style={{
                background: "transparent", border: "none", outline: "none",
                color: "#fff", fontSize: 22, fontWeight: 600, textAlign: "center",
                width: "100%", resize: "none", minHeight: 120,
                fontFamily: fontStyle === "serif" ? "Georgia, serif" :
                             fontStyle === "mono" ? "monospace" : "sans-serif",
                lineHeight: 1.5
              }} />
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 8 }}>
              {text.length}/700
            </div>
          </div>
        )}

        {(type === "image" || type === "video") && preview && (
          <div style={{ position: "relative" }}>
            {type === "image"
              ? <img src={preview} alt="preview" style={{ width: "100%", maxHeight: "50vh", objectFit: "contain", background: "#000" }} />
              : <video src={preview} controls style={{ width: "100%", maxHeight: "50vh", objectFit: "contain", background: "#000" }} />
            }
            {trimData && (
              <div style={{
                position: "absolute", top: 10, right: 10,
                background: "rgba(0,0,0,0.6)", borderRadius: 8, padding: "4px 10px"
              }}>
                <span style={{ color: "#fff", fontSize: 12 }}>✂️ {trimData.duration}s</span>
              </div>
            )}
            {type === "video" && (
              <button onClick={() => setShowTrimmer(true)} style={{
                position: "absolute", bottom: 10, right: 10,
                background: COLORS.primary, border: "none", borderRadius: 8,
                color: "#fff", padding: "6px 12px", fontSize: 13, cursor: "pointer"
              }}>✂️ Kata Video</button>
            )}
          </div>
        )}

        {type === "voice" && file && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: 40, gap: 16
          }}>
            <div style={{ fontSize: 64 }}>🎙️</div>
            <p style={{ color: COLORS.text, fontSize: 18 }}>
              Sauti imerekodiwa ({trimData?.duration || 0}s)
            </p>
            <button onClick={() => setShowVoice(true)} style={{
              background: COLORS.surfaceLight, border: "none", borderRadius: 8,
              color: COLORS.textMuted, padding: "8px 16px", cursor: "pointer"
            }}>🔄 Rekodi Tena</button>
          </div>
        )}

        {/* Caption (kwa media) */}
        {(type === "image" || type === "video") && (
          <div style={{ padding: "12px 20px" }}>
            <input value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="Ongeza maelezo (optional)..."
              maxLength={200}
              style={{
                width: "100%", background: COLORS.surfaceLight,
                border: `1px solid ${COLORS.border}`, borderRadius: 10,
                padding: "10px 14px", color: COLORS.text, fontSize: 14,
                outline: "none", boxSizing: "border-box"
              }} />
          </div>
        )}

        {/* Background Colors (kwa text) */}
        {type === "text" && (
          <div style={{ padding: "16px 20px" }}>
            <p style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 10 }}>Rangi ya mandhari</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {BG_OPTIONS.map(c => (
                <button key={c} onClick={() => setBgColor(c)} style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: c, border: bgColor === c ? `3px solid ${COLORS.primary}` : "2px solid transparent",
                  cursor: "pointer", outline: "none"
                }} />
              ))}
            </div>
            <p style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 16, marginBottom: 10 }}>Mstari wa maandishi</p>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "sans", label: "Aa Normal" },
                { id: "serif", label: "Aa Serif" },
                { id: "mono", label: "Aa Mono" },
              ].map(f => (
                <button key={f.id} onClick={() => setFontStyle(f.id)} style={{
                  padding: "8px 14px", borderRadius: 8,
                  background: fontStyle === f.id ? COLORS.primary : COLORS.surfaceLight,
                  border: "none", color: fontStyle === f.id ? "#fff" : COLORS.textMuted,
                  fontFamily: f.id === "serif" ? "Georgia, serif" : f.id === "mono" ? "monospace" : "sans-serif",
                  cursor: "pointer", fontSize: 13
                }}>{f.label}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component Kuu: StatusFeature ────────────────────────────────────────────
export default function StatusFeature({ currentUserId, apiBase, token }) {
  const [myStatuses, setMyStatuses] = useState([]);
  const [others, setOthers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [viewing, setViewing] = useState(null); // { statuses, user }
  const http = api(apiBase, token);

  const loadStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await http.get("/status");
      if (data.success) {
        setMyStatuses(data.myStatuses || []);
        setOthers(data.others || []);
      }
    } catch (e) {
      console.error("Imeshindwa kupakia statuses:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatuses(); }, []);

  const handleDelete = async (statusId) => {
    await http.delete(`/status/${statusId}`);
    loadStatuses();
  };

  const handleReact = async (statusId, emoji) => {
    await http.post(`/status/${statusId}/react`, { emoji });
    loadStatuses();
  };

  const handleCreated = (newStatus) => {
    setMyStatuses(prev => [newStatus, ...prev]);
  };

  // Avatar wa mtumiaji
  const myUser = myStatuses[0]?.user || { _id: currentUserId, username: "Mimi" };

  if (loading) return (
    <div style={{
      height: "100%", display: "flex", alignItems: "center",
      justifyContent: "center", background: COLORS.bg
    }}>
      <div style={{ color: COLORS.textMuted, fontSize: 15 }}>Inapakia statuses...</div>
    </div>
  );

  return (
    <div style={{ background: COLORS.bg, height: "100%", overflow: "auto" }}>
      {/* ── Yangu ── */}
      <div style={{ padding: "20px 20px 8px" }}>
        <p style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
          Status Yangu
        </p>

        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "10px 0", cursor: "pointer"
        }} onClick={() => {
          if (myStatuses.length > 0) setViewing({ statuses: myStatuses, user: myUser });
          else setShowCreator(true);
        }}>
          {/* Avatar na badge */}
          <div style={{ position: "relative" }}>
            <div style={{
              width: 54, height: 54, borderRadius: "50%",
              border: myStatuses.length > 0 ? `3px solid ${COLORS.primary}` : `3px dashed ${COLORS.textMuted}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: COLORS.surfaceLight, overflow: "hidden"
            }}>
              {myUser.profilePicture
                ? <img src={myUser.profilePicture} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 20 }}>
                    {(myUser.username?.[0] || "M").toUpperCase()}
                  </span>
              }
            </div>
            <button onClick={e => { e.stopPropagation(); setShowCreator(true); }} style={{
              position: "absolute", bottom: -2, right: -2,
              width: 22, height: 22, borderRadius: "50%",
              background: COLORS.primary, border: `2px solid ${COLORS.bg}`,
              color: "#fff", fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1
            }}>+</button>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 15 }}>
              Status Yangu
            </div>
            <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 2 }}>
              {myStatuses.length === 0
                ? "Gusa kuongeza status"
                : `${myStatuses.length} status${myStatuses.length > 1 ? "" : ""} • ${timeAgo(myStatuses[0].createdAt)}` 
              }
            </div>
          </div>

          {myStatuses.length > 0 && (
            <div style={{ color: COLORS.textMuted, fontSize: 12, textAlign: "right" }}>
              <div>{myStatuses.reduce((s, st) => s + (st.views?.length || 0), 0)} 👁️</div>
              <div style={{ marginTop: 2 }}>{timeLeft(myStatuses[0].expiresAt)}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: COLORS.border, margin: "0 20px" }} />

      {/* ── Za Wengine ── */}
      {others.length > 0 && (
        <div style={{ padding: "16px 20px 8px" }}>
          <p style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
            Statuses za Wengine
          </p>

          {others.map((group) => {
            const hasUnviewed = group.hasUnviewed;
            const latest = group.statuses[0];
            return (
              <div key={group.user._id}
                onClick={() => setViewing({ statuses: group.statuses, user: group.user })}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "10px 0", cursor: "pointer",
                  borderBottom: `1px solid ${COLORS.border}` 
                }}
              >
                <div style={{
                  width: 54, height: 54, borderRadius: "50%",
                  border: hasUnviewed
                    ? `3px solid ${COLORS.primary}` 
                    : `3px solid ${COLORS.surfaceLight}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: COLORS.surfaceLight, overflow: "hidden", flexShrink: 0
                }}>
                  {group.user.profilePicture
                    ? <img src={group.user.profilePicture} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 20 }}>
                        {(group.user.username?.[0] || "?").toUpperCase()}
                      </span>
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 15 }}>
                    {group.user.username}
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 2 }}>
                    {timeAgo(latest.createdAt)}
                    {latest.type === "voice" && " • 🎙️ Sauti"}
                    {latest.type === "video" && " • 🎬 Video"}
                    {latest.type === "image" && " • 🖼️ Picha"}
                    {latest.content && latest.type === "text" && ` • "${latest.content.slice(0, 30)}..."`}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                  {group.statuses.length > 1 && (
                    <span style={{
                      background: COLORS.primary, color: "#fff",
                      borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 600
                    }}>{group.statuses.length}</span>
                  )}
                  {latest.reactions?.length > 0 && (
                    <span style={{ fontSize: 14 }}>
                      {latest.reactions.slice(0, 2).map(r => r.emoji).join("")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {others.length === 0 && myStatuses.length === 0 && (
        <div style={{
          padding: 48, textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16
        }}>
          <div style={{ fontSize: 56 }}>📸</div>
          <p style={{ color: COLORS.textMuted, fontSize: 16 }}>
            Hakuna statuses bado
          </p>
          <button onClick={() => setShowCreator(true)} style={{
            background: COLORS.primary, border: "none", borderRadius: 24,
            color: "#fff", padding: "12px 28px", fontSize: 15,
            fontWeight: 600, cursor: "pointer"
          }}>
            + Weka Status ya Kwanza
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreator && (
        <StatusCreator
          apiBase={apiBase}
          token={token}
          onClose={() => setShowCreator(false)}
          onCreated={handleCreated}
        />
      )}

      {viewing && (
        <StatusViewer
          statuses={viewing.statuses}
          userInfo={viewing.user}
          currentUserId={currentUserId}
          apiBase={apiBase}
          token={token}
          onClose={() => { setViewing(null); loadStatuses(); }}
          onReact={handleReact}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
