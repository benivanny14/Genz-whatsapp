import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { bootstrapNativeShell, registerNativePush, openApkUrl, dismissUpdatePrompt, isNative } from './index';

export default function NativeBootstrap() {
  const navigate = useNavigate();
  const { selectedConversation, selectConversation } = useChat();
  const { isAuthenticated } = useAuth();
  const selectedRef = useRef(selectedConversation);
  const [update, setUpdate] = useState(null);
  selectedRef.current = selectedConversation;

  useEffect(() => {
    let stop = () => {};
    bootstrapNativeShell({
      toast: (msg) => toast(msg, { duration: 2000 }),
      navigate,
      selectConversation,
      getChatState: () => ({
        inChat: Boolean(selectedRef.current),
        closeChat: () => selectConversation(null)
      }),
      showUpdate: (payload) => setUpdate(payload)
    }).then((cleanup) => {
      stop = cleanup || (() => {});
    });
    return () => stop();
  }, [navigate, selectConversation]);

  useEffect(() => {
    if (!isAuthenticated || !isNative()) return undefined;
    registerNativePush({ navigate, selectConversation });
    return undefined;
  }, [isAuthenticated, navigate, selectConversation]);

  if (!update) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[2000] px-4">
      <div className="mx-auto max-w-md rounded-2xl bg-[#111b21] border border-[#233138] p-4 shadow-2xl">
        <p className="text-white font-semibold">Update mpya ipo — Download</p>
        <p className="text-xs text-[#8696a0] mt-1">
          Version {update.versionName} (build {update.versionCode})
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="flex-1 bg-[#25d366] text-[#073b28] font-bold rounded-xl py-2"
            onClick={() => openApkUrl(update.apkUrl)}
          >
            Download
          </button>
          <button
            type="button"
            className="px-4 rounded-xl bg-[#202c33] text-white"
            onClick={() => {
              dismissUpdatePrompt(update.versionCode);
              setUpdate(null);
            }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
