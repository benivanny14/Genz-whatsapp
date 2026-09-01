import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Pause, ChevronLeft, ChevronRight, Ghost, Shield, Clock,
  Paintbrush, Lock, BarChart3, Music, Smartphone, Palette, Users,
  MessageCircle, Camera, Mic, Image, Settings, Maximize2, Volume2,
  Send, Smile, CheckCheck, ShieldCheck, Fingerprint, Layers, SkipForward
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   FEATURE SLIDES — Each represents one app feature
   ═══════════════════════════════════════════════════════ */
const SLIDES = [
  {
    id: 'chat', icon: MessageCircle, title: 'Real-time Messaging',
    subtitle: 'Mazungumzo ya haraka kwa realtime',
    description: 'Tuma na pokea ujumbe wa haraka. Ujumbe unafika mara moja na unaonekana kwa status ya delivery.',
    color: '#00a884', mockType: 'chat',
  },
  {
    id: 'ghost', icon: Ghost, title: 'Ghost Mode',
    subtitle: 'Tazama status bila kuonekana',
    description: 'Watumiaji hawataki kuwaona umetazama status yao. Unaweza kutazama bila kujulikana.',
    color: '#8b5cf6', mockType: 'ghost',
  },
  {
    id: 'anti-delete', icon: Shield, title: 'Anti-Delete Status',
    subtitle: 'Ona status zilizofutwa',
    description: 'Hata mtu akifuta status yake, bado unaiona. Hakuna kitu kimefutwa kwako.',
    color: '#ef4444', mockType: 'antiDelete',
  },
  {
    id: 'status72h', icon: Clock, title: 'Status 72h',
    subtitle: 'Status inadumu siku 3',
    description: 'Badala ya saa 24 pekee, status yako inadumu siku 3 kamili. Ona matokeo zaidi.',
    color: '#f59e0b', mockType: 'status72h',
  },
  {
    id: 'drawing', icon: Paintbrush, title: 'Drawing Tools',
    subtitle: 'Chora juu ya picha na video',
    description: 'Ongeza mavazi, maandishi, na michoro kwenye picha kabla ya kutuma.',
    color: '#ec4899', mockType: 'drawing',
  },
  {
    id: 'privacy', icon: Lock, title: 'Privacy Controls',
    subtitle: 'Control nani anaona nini',
    description: 'Ficha picha, status, taarifa za mwisho kuonekana, na zaidi kwa kila mtu.',
    color: '#3b82f6', mockType: 'privacy',
  },
  {
    id: 'analytics', icon: BarChart3, title: 'Status Analytics',
    subtitle: 'Ona ni nani anatazama status zako',
    description: 'Orodha ya wote waliotazama status yako. Ona muda na data za uchambuzi.',
    color: '#10b981', mockType: 'analytics',
  },
  {
    id: 'music', icon: Music, title: 'Music on Status',
    subtitle: 'Ongeza muziki kwenye status',
    description: 'Chagua wimbo unaopenda na uongeze kwenye status yako kama Instagram Stories.',
    color: '#a855f7', mockType: 'music',
  },
  {
    id: 'multiDevice', icon: Layers, title: 'Multi-Device',
    subtitle: 'Tumia kwenye simu na kompyuta',
    description: 'Unganisha vifaa vingi. Jibu messages kwenye kompyuta huku ukiwa na simu.',
    color: '#06b6d4', mockType: 'multiDevice',
  },
  {
    id: 'themes', icon: Palette, title: 'Custom Themes',
    subtitle: 'Badilisha mwonekano wa app',
    description: 'Chagua mandhari tofauti, boresha rangi, na fanye app ionekane kama unavyotaka.',
    color: '#f97316', mockType: 'themes',
  },
  {
    id: 'groups', icon: Users, title: 'Group Chats',
    subtitle: 'Ongea na marafiki kwa pamoja',
    description: 'Unda vikundi, ongeza members, na piga mazungumzo na watu wengi kwa wakati mmoja.',
    color: '#14b8a6', mockType: 'groups',
  },
  {
    id: 'voice', icon: Mic, title: 'Voice Messages',
    subtitle: 'Tuma sauti kwa urahisi',
    description: 'Rekodi sauti na itume moja kwa moja. Sauti inafika haraka na kwa ubora wa juu.',
    color: '#6366f1', mockType: 'voice',
  },
  {
    id: 'media', icon: Image, title: 'Media Sharing',
    subtitle: 'Piga picha na tuma mara moja',
    description: 'Shiriki picha, video, documents, na zaidi. Compression ya ubora wa juu.',
    color: '#0ea5e9', mockType: 'media',
  },
  {
    id: 'encryption', icon: ShieldCheck, title: 'E2E Encryption',
    subtitle: 'Mazungumzo yako ni salama',
    description: 'Mazungumzo yako yote yamelindwa na usimbaji-fumbo wa hali ya juu. Hakuna mtu anaweza kusoma.',
    color: '#22c55e', mockType: 'encryption',
  },
  {
    id: 'appLock', icon: Fingerprint, title: 'App Lock',
    subtitle: 'Linda app kwa alama ya kidole',
    description: 'Weka lock kwenye app kwa fingerprint, Face ID, au PIN. App iko salama daima.',
    color: '#dc2626', mockType: 'appLock',
  },
];

/* ═══════════════════════════════════════════════════════
   PHONE MOCKUP WRAPPER
   ═══════════════════════════════════════════════════════ */
const PhoneFrame = ({ children, slideColor }) => (
  <div className="relative mx-auto w-[220px] md:w-[260px]">
    <div className="relative rounded-[2.2rem] bg-gradient-to-b from-gray-700 to-gray-900 p-[6px] shadow-2xl shadow-black/40">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#0b141a] min-h-[420px]">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-b-2xl z-10" />
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 pt-7 pb-1 bg-[#1f2c34] text-[9px] text-white/60">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 border border-white/40 rounded-sm flex items-end justify-end p-[1px]">
              <div className="w-2 h-1 bg-green-400 rounded-[1px]" />
            </div>
          </div>
        </div>
        {/* App header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1f2c34]">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: slideColor + '30' }}>
            <MessageCircle size={14} style={{ color: slideColor }} />
          </div>
          <span className="text-white font-semibold text-[11px]">GENZ</span>
        </div>
        {/* Content */}
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
    {/* Glow effect */}
    <div className="absolute -inset-4 rounded-[3rem] opacity-20 blur-2xl -z-10" style={{ backgroundColor: slideColor }} />
  </div>
);

/* ═══════════════════════════════════════════════════════
   MOCK SCREENS — Each feature's visual representation
   ═══════════════════════════════════════════════════════ */
const ChatMock = () => (
  <div className="p-2">
    {/* Chat header */}
    <div className="flex items-center gap-2 px-2 py-1.5 bg-[#1f2c34] rounded-t-lg">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[9px] font-bold">A</div>
      <div className="flex-1">
        <div className="text-white text-[10px] font-semibold">Amara</div>
        <div className="text-white/40 text-[7px]">online</div>
      </div>
      <Lock size={10} className="text-white/30" />
    </div>
    {/* Messages between 5+ users */}
    <div className="space-y-1.5 py-2 px-1">
      {[
        { text: 'Habari za leo? 😊', sent: true, time: '09:15', status: '✓✓' },
        { text: 'Nzuri sana! Wewe?', sent: false, time: '09:16', color: '#a855f7' },
        { text: 'Sawa tu. Umeshajaribu ghost mode?', sent: true, time: '09:17', status: '✓✓' },
        { text: 'Ndiyo! Ni ya ajabu 👻', sent: false, time: '09:18', color: '#ec4899' },
        { text: 'Tumeongea kwa group. John pia ameipenda', sent: false, time: '09:20', color: '#3b82f6' },
        { text: 'Anti-delete feature ni nzuri sana 🛡️', sent: true, time: '09:22', status: '✓✓' },
        { text: 'Kweli! Status 72h pia ni game changer ⏰', sent: false, time: '09:23', color: '#10b981' },
      ].map((m, i) => (
        <div key={i} className={`flex ${m.sent ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[75%] px-2 py-1 rounded-lg text-[8px] ${
            m.sent
              ? 'bg-[#005e54] rounded-tr-sm text-white'
              : 'bg-[#1f2c34] rounded-tl-sm text-white/90'
          }`}
            style={!m.sent ? { borderLeft: `2px solid ${m.color}` } : {}}>
            <p>{m.text}</p>
            <div className={`flex items-center gap-0.5 mt-0.5 ${m.sent ? 'justify-end' : ''}`}>
              <span className="text-[6px] text-white/30">{m.time}</span>
              {m.status && <span className="text-[6px] text-blue-400">{m.status}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
    {/* Input */}
    <div className="flex items-center gap-1.5 p-1.5 bg-[#1f2c34] rounded-b-lg">
      <Smile size={12} className="text-white/40 ml-1" />
      <div className="flex-1 text-[8px] text-white/30 bg-white/5 rounded-full px-2 py-1">Type a message...</div>
      <div className="w-6 h-6 rounded-full bg-[#00a884] flex items-center justify-center">
        <Send size={9} className="text-white" />
      </div>
    </div>
  </div>
);

const GhostMock = () => (
  <div className="p-3">
    <div className="text-[10px] text-white/60 mb-2 font-semibold">Status za Marafiki</div>
    {['Mary K.', 'John D.', 'Ahmed M.'].map((name, i) => (
      <div key={i} className="flex items-center gap-2 p-2 rounded-lg mb-1.5" style={{ backgroundColor: i === 0 ? '#8b5cf610' : 'transparent' }}>
        <div className="w-9 h-9 rounded-full border-2 border-[#00a884] p-0.5">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00a884] to-[#00c795] flex items-center justify-center text-white text-[10px] font-bold">
            {name[0]}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-white text-[10px] font-medium">{name}</div>
          <div className="text-white/40 text-[8px]">Leo, 10:30</div>
        </div>
        {i === 0 && (
          <div className="flex items-center gap-1 bg-[#8b5cf6]/20 px-2 py-0.5 rounded-full">
            <Ghost size={10} className="text-[#8b5cf6]" />
            <span className="text-[8px] text-[#8b5cf6] font-medium">Ghost</span>
          </div>
        )}
      </div>
    ))}
    <div className="mt-3 p-2 bg-[#8b5cf6]/10 rounded-lg border border-[#8b5cf6]/20">
      <div className="flex items-center gap-1.5">
        <Ghost size={12} className="text-[#8b5cf6]" />
        <span className="text-[9px] text-[#8b5cf6] font-medium">Ghost Mode IMEWEZESHA</span>
      </div>
      <p className="text-[8px] text-white/40 mt-1">Unaweza kutazama status bila kuonekana</p>
    </div>
  </div>
);

const AntiDeleteMock = () => (
  <div className="p-3">
    <div className="text-[10px] text-white/60 mb-2 font-semibold">Status zilizofutwa</div>
    <div className="space-y-2">
      <div className="p-2 rounded-lg bg-[#ef4444]/5 border border-[#ef4444]/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
            <Shield size={14} className="text-[#ef4444]" />
          </div>
          <div className="flex-1">
            <div className="text-white text-[10px] font-medium">Mary K.</div>
            <div className="text-[#ef4444] text-[8px]">-status yake ilifutwa baada ya kuipost</div>
          </div>
          <span className="text-[8px] text-white/30">2h zilizopita</span>
        </div>
        <div className="mt-2 p-1.5 bg-white/5 rounded text-[8px] text-white/50 italic">
          "Nimepata offer mpya ya kazi! 🎉"
        </div>
      </div>
      <div className="p-2 rounded-lg bg-[#ef4444]/5 border border-[#ef4444]/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
            <Shield size={14} className="text-[#ef4444]" />
          </div>
          <div className="flex-1">
            <div className="text-white text-[10px] font-medium">John D.</div>
            <div className="text-[#ef4444] text-[8px]">-status yake ilifutwa</div>
          </div>
          <span className="text-[8px] text-white/30">5h zilizopita</span>
        </div>
        <div className="mt-2 p-1.5 bg-white/5 rounded text-[8px] text-white/50 italic">
          "Safari nzuri! 📸"
        </div>
      </div>
    </div>
  </div>
);

const Status72hMock = () => (
  <div className="p-3">
    <div className="flex items-center justify-between mb-3">
      <div className="text-[10px] text-white/60 font-semibold">Status Yangu</div>
      <div className="flex items-center gap-1 bg-[#f59e0b]/20 px-2 py-0.5 rounded-full">
        <Clock size={10} className="text-[#f59e0b]" />
        <span className="text-[8px] text-[#f59e0b] font-medium">72h Active</span>
      </div>
    </div>
    <div className="space-y-2">
      {[
        { title: 'Photo ya team building', views: 24, time: 'Siku 1 zilizopita', remaining: 'Siku 2 zimesalia' },
        { title: 'Quote ya leo', views: 18, time: 'Siku 2 zilizopita', remaining: 'Siku 1 imesalia' },
      ].map((s, i) => (
        <div key={i} className="p-2 rounded-lg bg-white/5">
          <div className="flex items-center justify-between">
            <span className="text-white text-[10px]">{s.title}</span>
            <span className="text-[8px] text-[#f59e0b]">{s.views} views</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[7px] text-white/30">{s.time}</span>
            <span className="text-[7px] text-[#f59e0b]/70">{s.remaining}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1 mt-1.5">
            <div className="bg-[#f59e0b] h-1 rounded-full" style={{ width: i === 0 ? '66%' : '33%' }} />
          </div>
        </div>
      ))}
    </div>
    <div className="text-[8px] text-white/30 text-center mt-3">Status zinadumu siku 3 badala ya 1</div>
  </div>
);

const DrawingMock = () => (
  <div className="p-3">
    <div className="text-[10px] text-white/60 mb-2 font-semibold">Drawing Tools</div>
    <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-[#ec4899]/20 to-[#8b5cf6]/20 aspect-[4/3]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-1">🌄</div>
          <div className="text-[8px] text-white/40">Picha yako</div>
        </div>
      </div>
      <div className="absolute top-2 left-3 bg-[#ec4899] px-2 py-0.5 rounded text-[8px] text-white font-bold rotate-[-5deg]">
        Nimependa! ❤️
      </div>
      <div className="absolute bottom-3 right-2 w-4 h-4 rounded-full bg-[#f59e0b] border-2 border-white/50" />
      <div className="absolute top-4 right-4 text-lg">🎨</div>
    </div>
    <div className="flex items-center justify-center gap-2 mt-2">
      {['✏️', '🖌️', '📝', '😀', '❤️', '⭐'].map((e, i) => (
        <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${i === 0 ? 'bg-[#ec4899]/30 ring-1 ring-[#ec4899]' : 'bg-white/10'}`}>
          {e}
        </div>
      ))}
    </div>
  </div>
);

const PrivacyMock = () => (
  <div className="p-3">
    <div className="text-[10px] text-white/60 mb-2 font-semibold">Faragha</div>
    <div className="space-y-1.5">
      {[
        { label: 'Last Seen', value: 'Wote', icon: '👀', locked: false },
        { label: 'Profile Photo', value: 'Wote', icon: '📷', locked: false },
        { label: 'Status', value: 'Waliopewa ruhusa', icon: '📝', locked: true },
        { label: 'Read Receipts', value: 'Imezimwa', icon: '✅', locked: true },
        { label: 'Groups', value: 'Wote', icon: '👥', locked: false },
      ].map((item, i) => (
        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[11px]">{item.icon}</span>
            <span className="text-white text-[9px]">{item.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-white/40">{item.value}</span>
            {item.locked ? (
              <Lock size={9} className="text-[#3b82f6]" />
            ) : (
              <span className="text-[9px] text-white/30">👁</span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AnalyticsMock = () => (
  <div className="p-3">
    <div className="flex items-center justify-between mb-3">
      <div className="text-[10px] text-white/60 font-semibold">Status Analytics</div>
      <BarChart3 size={12} className="text-[#10b981]" />
    </div>
    <div className="grid grid-cols-3 gap-1.5 mb-3">
      {[
        { label: 'Views', value: '147', color: '#10b981' },
        { label: 'Replies', value: '23', color: '#3b82f6' },
        { label: 'Shares', value: '8', color: '#f59e0b' },
      ].map((stat, i) => (
        <div key={i} className="p-2 rounded-lg bg-white/5 text-center">
          <div className="text-[12px] font-bold" style={{ color: stat.color }}>{stat.value}</div>
          <div className="text-[7px] text-white/40">{stat.label}</div>
        </div>
      ))}
    </div>
    <div className="text-[9px] text-white/60 mb-1.5">Waliotazama:</div>
    {['Mary K. — 5x', 'John D. — 3x', 'Ahmed M. — 2x', 'Grace M. — 1x'].map((viewer, i) => (
      <div key={i} className="flex items-center justify-between p-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-[#10b981]/20 flex items-center justify-center text-[8px] text-[#10b981] font-bold">
            {viewer[0]}
          </div>
          <span className="text-[9px] text-white/70">{viewer.split(' — ')[0]}</span>
        </div>
        <span className="text-[8px] text-[#10b981]">{viewer.split(' — ')[1]}</span>
      </div>
    ))}
  </div>
);

const MusicMock = () => (
  <div className="p-3">
    <div className="text-[10px] text-white/60 mb-2 font-semibold">Ongeza Muziki</div>
    <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-[#a855f7]/30 to-[#6366f1]/30 aspect-[4/3] flex items-center justify-center mb-2">
      <div className="text-center">
        <div className="text-3xl mb-1">🎶</div>
        <div className="text-[8px] text-white/60">Status yako</div>
      </div>
      <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur rounded-lg p-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-[#a855f7] flex items-center justify-center">
          <Music size={10} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="text-[9px] text-white font-medium">Diamond Platnumz</div>
          <div className="text-[7px] text-white/40">Jeje</div>
        </div>
        <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
          <Play size={8} className="text-white ml-0.5" />
        </div>
      </div>
    </div>
    <div className="text-[8px] text-white/40 text-center">Wimbo unaonekana kwenye status yako</div>
  </div>
);

const MultiDeviceMock = () => (
  <div className="p-3">
    <div className="text-[10px] text-white/60 mb-2 font-semibold">Vifaa Vilivyounganishwa</div>
    <div className="space-y-1.5">
      {[
        { name: 'Samsung Galaxy S24', type: 'Simu', active: true, icon: '📱' },
        { name: 'MacBook Pro', type: 'Kompyuta', active: true, icon: '💻' },
        { name: 'iPad Air', type: 'Tablet', active: false, icon: '📋' },
      ].map((device, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
          <span className="text-[14px]">{device.icon}</span>
          <div className="flex-1">
            <div className="text-white text-[9px] font-medium">{device.name}</div>
            <div className="text-[7px] text-white/40">{device.type}</div>
          </div>
          <div className={`w-2 h-2 rounded-full ${device.active ? 'bg-[#10b981]' : 'bg-white/20'}`} />
        </div>
      ))}
    </div>
    <div className="mt-2 p-2 bg-[#06b6d4]/10 rounded-lg border border-[#06b6d4]/20">
      <div className="flex items-center gap-1.5">
        <Layers size={10} className="text-[#06b6d4]" />
        <span className="text-[8px] text-[#06b6d4] font-medium">Sync inafanya kazi</span>
      </div>
    </div>
  </div>
);

const ThemesMock = () => (
  <div className="p-3">
    <div className="text-[10px] text-white/60 mb-2 font-semibold">Mandhari</div>
    <div className="grid grid-cols-2 gap-1.5">
      {[
        { name: 'Dark', colors: ['#0b141a', '#111b21'], active: true },
        { name: 'Ocean', colors: ['#0c1929', '#1a3a5c'], active: false },
        { name: 'Forest', colors: ['#0a1a0a', '#1a3a1a'], active: false },
        { name: 'Sunset', colors: ['#1a0a0a', '#3a1a1a'], active: false },
      ].map((theme, i) => (
        <div key={i} className={`p-2 rounded-lg border ${theme.active ? 'border-[#f97316]' : 'border-white/10'}`}
          style={{ background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})` }}>
          <div className="w-full h-3 rounded bg-white/10 mb-1" />
          <div className="w-2/3 h-2 rounded bg-white/5 mb-1" />
          <div className="flex justify-between items-center">
            <span className="text-[8px] text-white/70">{theme.name}</span>
            {theme.active && <span className="text-[7px] text-[#f97316]">✓</span>}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const GroupsMock = () => (
  <div className="p-2">
    {[
      { name: 'Group ya Genz', members: 128, msg: 'James: Kumbe status ya 72h...', time: '10:30', unread: 5, color: '#14b8a6' },
      { name: 'Familia Yetu', members: 8, msg: 'Mama: Hamjambo watoto!', time: '09:00', unread: 0, color: '#f59e0b' },
      { name: 'Wafanyakazi', members: 45, msg: 'Meeting kesho saa 3', time: 'Yesterday', unread: 2, color: '#3b82f6' },
    ].map((group, i) => (
      <div key={i} className="flex items-center gap-2 p-2 rounded-lg">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: group.color + '30', color: group.color }}>
          {group.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <span className="text-white font-medium text-[10px]">{group.name}</span>
            <span className="text-[8px] text-white/30">{group.time}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/50 text-[8px] truncate">{group.msg}</span>
            {group.unread > 0 && (
              <span className="bg-[#14b8a6] text-white text-[7px] font-bold rounded-full px-1.5 min-w-[14px] text-center">
                {group.unread}
              </span>
            )}
          </div>
          <span className="text-[7px] text-white/30">{group.members} members</span>
        </div>
      </div>
    ))}
  </div>
);

const VoiceMock = () => (
  <div className="p-3">
    <div className="text-[10px] text-white/60 mb-2 font-semibold">Voice Messages</div>
    <div className="space-y-2">
      {[
        { from: 'Mary K.', duration: '0:15', sent: false },
        { from: 'Wewe', duration: '0:08', sent: true },
      ].map((msg, i) => (
        <div key={i} className={`flex ${msg.sent ? 'justify-end' : 'justify-start'}`}>
          <div className={`p-2 rounded-xl max-w-[80%] ${msg.sent ? 'bg-[#005c4b]' : 'bg-[#1f2c34]'}`}>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#6366f1]/30 flex items-center justify-center">
                <Mic size={8} className="text-[#6366f1]" />
              </div>
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5,4,3,2,1].map((h, j) => (
                  <div key={j} className="w-[2px] rounded-full bg-white/50" style={{ height: h * 2 + 'px' }} />
                ))}
              </div>
            </div>
            <div className="text-[8px] text-white/40 mt-1">{msg.duration}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MediaMock = () => (
  <div className="p-3">
    <div className="text-[10px] text-white/60 mb-2 font-semibold">Gallery</div>
    <div className="grid grid-cols-3 gap-1">
      {['🌄', '🌅', '🏙️', '🌺', '🎯', '🎭', '🏔️', '🌊', '🎪'].map((emoji, i) => (
        <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-[#0ea5e9]/20 to-[#8b5cf6]/20 flex items-center justify-center">
          <span className="text-lg">{emoji}</span>
        </div>
      ))}
    </div>
    <div className="flex items-center gap-1 mt-2">
      <Camera size={10} className="text-[#0ea5e9]" />
      <span className="text-[8px] text-[#0ea5e9]">Piga picha mpya</span>
    </div>
  </div>
);

const EncryptionMock = () => (
  <div className="p-3 flex flex-col items-center justify-center min-h-[300px]">
    <div className="w-16 h-16 rounded-full bg-[#22c55e]/20 flex items-center justify-center mb-3">
      <ShieldCheck size={28} className="text-[#22c55e]" />
    </div>
    <div className="text-white text-[11px] font-bold mb-1">End-to-End Encrypted</div>
    <div className="text-[8px] text-white/40 text-center px-4 mb-4">
      Mazungumzo yako yote yamelindwa na usimbaji-fumbo
    </div>
    <div className="w-full space-y-1.5">
      {['🔒 Ujumbe', '🔒 Sauti', '🔒 Video', '🔒 Picha', '🔒 Documents'].map((item, i) => (
        <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-white/5">
          <span className="text-[9px] text-white/70">{item}</span>
        </div>
      ))}
    </div>
  </div>
);

const AppLockMock = () => (
  <div className="p-3 flex flex-col items-center justify-center min-h-[300px]">
    <div className="w-16 h-16 rounded-full bg-[#dc2626]/20 flex items-center justify-center mb-3">
      <Fingerprint size={28} className="text-[#dc2626]" />
    </div>
    <div className="text-white text-[11px] font-bold mb-1">App Locked</div>
    <div className="text-[8px] text-white/40 text-center px-4 mb-4">
      Weka alama ya kidole kufungua
    </div>
    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center animate-pulse mb-2">
      <Fingerprint size={20} className="text-white/60" />
    </div>
    <div className="text-[8px] text-white/30">Gusa fingerprint sensor</div>
    <div className="mt-3 text-[8px] text-[#3b82f6]">Tumia PIN badala yake</div>
  </div>
);

const MOCK_COMPONENTS = {
  chat: ChatMock, ghost: GhostMock, antiDelete: AntiDeleteMock,
  status72h: Status72hMock, drawing: DrawingMock, privacy: PrivacyMock,
  analytics: AnalyticsMock, music: MusicMock, multiDevice: MultiDeviceMock,
  themes: ThemesMock, groups: GroupsMock, voice: VoiceMock,
  media: MediaMock, encryption: EncryptionMock, appLock: AppLockMock,
};

/* ═══════════════════════════════════════════════════════
   MAIN FEATURE SHOWCASE — Video Player Style
   ═══════════════════════════════════════════════════════ */
const FeatureShowcase = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const containerRef = useRef(null);
  const sectionRef = useRef(null);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);
  const SLIDE_DURATION = 4000; // 4 seconds per slide = 60 seconds total

  // Format time as MM:SS
  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const totalTime = SLIDES.length * SLIDE_DURATION;
  const currentTime = (currentSlide * SLIDE_DURATION) + (progress / 100) * SLIDE_DURATION;

  // IntersectionObserver: auto-play when scrolled into view
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasBeenInView(true);
          // Auto-play when section comes into view for the first time
          if (!hasBeenInView) {
            setIsPlaying(true);
          }
        } else {
          // Pause when scrolled away
          setIsPlaying(false);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [hasBeenInView]);

  const goToSlide = useCallback((index) => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setProgress(0);
      setTransitioning(false);
    }, 150);
  }, []);

  const nextSlide = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
      setProgress(0);
      setTransitioning(false);
    }, 150);
  }, []);

  const prevSlide = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
      setProgress(0);
      setTransitioning(false);
    }, 150);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
    setProgress(0);
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    if (isPlaying) {
      progressRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 0;
          return prev + (100 / (SLIDE_DURATION / 50));
        });
      }, 50);
      intervalRef.current = setInterval(nextSlide, SLIDE_DURATION);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isPlaying, nextSlide]);

  const slide = SLIDES[currentSlide];
  const MockComponent = MOCK_COMPONENTS[slide.mockType];

  return (
    <div ref={sectionRef} className="relative">
      {/* ══════ VIDEO PLAYER FRAME ══════ */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0b141a] border border-white/[0.08] shadow-2xl shadow-black/30">
        
        {/* Video player top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#111b21] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className="px-1.5 py-0.5 bg-white/10 rounded text-[8px] font-bold">HD</span>
            <span>Genz Messenger — Feature Demo</span>
          </div>
          <div className="flex items-center gap-2">
            <Volume2 size={14} className="text-white/40" />
            <Maximize2 size={14} className="text-white/40" />
          </div>
        </div>

        {/* Main video area */}
        <div className="relative">
          {/* Content area */}
          <div className={`transition-all duration-300 ${transitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 p-6 md:p-10 min-h-[500px]">
              {/* Text content */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
                  style={{ backgroundColor: slide.color + '20', color: slide.color }}>
                  <slide.icon size={14} />
                  Feature {currentSlide + 1} / {SLIDES.length}
                </div>
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                  {slide.title}
                </h3>
                <p className="text-lg md:text-xl font-medium mb-3" style={{ color: slide.color }}>
                  {slide.subtitle}
                </p>
                <p className="text-sm md:text-base text-slate-400 max-w-md mx-auto lg:mx-0 leading-relaxed">
                  {slide.description}
                </p>
              </div>

              {/* Phone mockup */}
              <div className="flex-shrink-0">
                <PhoneFrame slideColor={slide.color}>
                  <MockComponent />
                </PhoneFrame>
              </div>
            </div>
          </div>

          {/* ════ BIG PLAY BUTTON OVERLAY (when paused) ════ */}
          {!isPlaying && (
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center cursor-pointer z-20 transition-opacity duration-300"
              onClick={togglePlay}
            >
              <div className="relative group">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#00a884] flex items-center justify-center shadow-2xl shadow-[#00a884]/40 group-hover:scale-110 transition-transform duration-300">
                  <Play size={36} className="text-white ml-2" />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-white/60 whitespace-nowrap">
                  {hasBeenInView ? 'Bonyeza ili uendeleze' : 'Bonyeza kuanza video'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ════ VIDEO PLAYER CONTROLS ════ */}
        <div className="px-4 py-3 bg-[#111b21] border-t border-white/[0.06]">
          {/* Progress bar */}
          <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group mb-3"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const pct = (x / rect.width) * 100;
              const slideIdx = Math.floor((pct / 100) * SLIDES.length);
              goToSlide(Math.min(slideIdx, SLIDES.length - 1));
            }}>
            {/* Segment markers */}
            {SLIDES.map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${(i / SLIDES.length) * 100}%` }} />
            ))}
            {/* Progress fill */}
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-100"
              style={{
                width: `${((currentSlide * 100 + progress) / SLIDES.length)}%`,
                backgroundColor: slide.color,
              }}
            />
            {/* Hover expand */}
            <div className="absolute inset-0 h-1.5 group-hover:h-2.5 -top-0.5 transition-all rounded-full" />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button onClick={togglePlay} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                {isPlaying ? (
                  <Pause size={18} className="text-white" />
                ) : (
                  <Play size={18} className="text-white ml-0.5" />
                )}
              </button>
              {/* Skip */}
              <button onClick={nextSlide} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                <SkipForward size={16} className="text-white/60" />
              </button>
              {/* Timestamp */}
              <span className="text-[11px] text-white/50 font-mono">
                {formatTime(currentTime)} / {formatTime(totalTime)}
              </span>
            </div>

            {/* Slide dots */}
            <div className="hidden md:flex items-center gap-1">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`transition-all duration-300 rounded-full ${
                    i === currentSlide ? 'w-4 h-1.5' : 'w-1.5 h-1.5 hover:bg-white/40'
                  }`}
                  style={{
                    backgroundColor: i === currentSlide ? slide.color : 'rgba(255,255,255,0.15)',
                  }}
                />
              ))}
            </div>

            {/* Feature chip */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40 hidden md:inline">{slide.title}</span>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: isPlaying ? slide.color : '#6b7280' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ════ FEATURE LABELS BELOW ════ */}
      <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
        {SLIDES.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                i === currentSlide
                  ? 'bg-white/10 text-white shadow-lg'
                  : 'text-white/30 hover:text-white/50 hover:bg-white/5'
              }`}
            >
              <Icon size={12} style={i === currentSlide ? { color: s.color } : {}} />
              <span className="hidden sm:inline">{s.title}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FeatureShowcase;
