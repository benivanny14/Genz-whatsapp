const fs = require('fs');
const path = require('path');

const callScreenPath = path.join(__dirname, 'frontend/src/components/CallScreen.jsx');
let content = fs.readFileSync(callScreenPath, 'utf8');

const audioEffectScript = `
  // ── Ringtone using Web Audio API ──
  const audioCtxRef = useRef(null);
  const ringerIntervalRef = useRef(null);

  const startRingtone = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      
      const playRing = () => {
        if (ctx.state === 'suspended') ctx.resume();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Standard UK/Europe ring frequencies
        osc1.frequency.value = 400;
        osc2.frequency.value = 450;
        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Ring cadence: 0.4s on, 0.2s off, 0.4s on, 2s off
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime + 0.4);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.45);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.6);
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.65);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime + 1.0);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.05);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.1);
        osc2.stop(ctx.currentTime + 1.1);
      };

      playRing();
      ringerIntervalRef.current = setInterval(playRing, 3000);
    } catch (e) {
      console.warn('Audio ringtone failed:', e);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringerIntervalRef.current) {
      clearInterval(ringerIntervalRef.current);
      ringerIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (callStatus === 'incoming' || callStatus === 'calling') {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [callStatus, startRingtone, stopRingtone]);
`;

if (!content.includes('startRingtone')) {
  // Insert after const callerName = ...
  content = content.replace(
    /const callerName = [^\n]*;/m,
    `$& \n ${audioEffectScript}`
  );
  
  // also add useCallback to imports
  if (!content.includes('useCallback')) {
    content = content.replace(
      "import { useState, useEffect, useRef } from 'react';",
      "import { useState, useEffect, useRef, useCallback } from 'react';"
    );
  }
  
  fs.writeFileSync(callScreenPath, content);
  console.log('Added Ringtone to CallScreen.jsx');
} else {
  console.log('Ringtone already added');
}
