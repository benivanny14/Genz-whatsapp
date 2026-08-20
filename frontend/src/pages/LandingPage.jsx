import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download, Shield, MessageCircle, Users, Lock, Image,
  Zap, Globe, Smartphone, ChevronDown, ChevronUp, Check,
  Star, Wifi, Bell, Palette, ArrowRight, ExternalLink, RefreshCw
} from 'lucide-react';
import { fetchVersionManifest, apkDownloadUrl } from '../utils/versionManifest';

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'Real-time Messaging',
    desc: 'Tuma na pokea ujumbe wa haraka kwa wakati halisi.',
  },
  {
    icon: Image,
    title: 'Media Sharing',
    desc: 'Tuma picha, video, sauti, na nyaraka kwa urahisi.',
  },
  {
    icon: Users,
    title: 'Group Chats',
    desc: 'Fanya makundi ya mazungumzo na marafiki yako.',
  },
  {
    icon: Lock,
    title: 'End-to-End Security',
    desc: 'Ujumbe wako unalindwa na usalama wa hali ya juu.',
  },
  {
    icon: Bell,
    title: 'Push Notifications',
    desc: 'Pata taarifa papo hapo hata ukiwa nje ya app.',
  },
  {
    icon: Palette,
    title: 'Themes & Customization',
    desc: 'Badilisha muonekano wa app kwa ladha yako.',
  },
  {
    icon: Shield,
    title: 'Anti-Delete',
    desc: 'Ona ujumbe uliofutwa na mtu mwingine.',
  },
  {
    icon: Zap,
    title: 'Voice Effects',
    desc: 'Ongeza sauti za kubahatisha kwenye voice notes.',
  },
];

const STEPS = [
  {
    num: '1',
    title: 'Pakua APK',
    desc: 'Bonyeza kitufe cha Download hapo juu kupakua faili ya APK.',
  },
  {
    num: '2',
    title: 'Sakinisha',
    desc: 'Fungua faili uliyopakua na ubonyeze "Install". Weka ruhusa usakinishe kutoka vyanzo visivyojulikana ikiwa inahitajika.',
  },
  {
    num: '3',
    title: 'Fungua App',
    desc: 'Bonyeza "Open" baada ya usakinishaji kukamilika. Jisajili au ingia ili kuanza kuzungumza.',
  },
];

const FAQS = [
  {
    q: 'Je, app hii ni ya bure?',
    a: 'Ndiyo, Genz Messenger ni bure kabisa. Hakuna ada ya usajili au matumizi.',
  },
  {
    q: 'Je, data yangu inalindwa?',
    a: 'Ndiyo. Ujumbe wako unalindwa na usalama wa hali ya juu. Hakuna mtu anayeweza kusoma ujumbe wako.',
  },
  {
    q: 'Ninawezaje ku-update app?',
    a: 'Ukiwa na version ya zamani, utapokea taarifa ya update ndani ya app. Bonyeze "Update" kupakua version mpya.',
  },
  {
    q: 'Je, inafanya kazi kwenye Android yote?',
    a: 'Ndiyo, inafanya kazi kwenye Android 6.0 na zaidi.',
  },
  {
    q: 'Ninawezaje kuona ujumbe uliofutwa?',
    a: 'Genz Messenger ina kipengele cha Anti-Delete kinachokuonyesha ujumbe uliofutwa na mtu mwingine.',
  },
];

const LandingPage = () => {
  const [version, setVersion] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchVersionManifest().then(setVersion).catch(() => {});
    // Prefetch the APK in the background so the download starts faster
    try {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = apkDownloadUrl();
      link.as = 'fetch';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-[#0b141a] text-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-[#0b141a]/90 backdrop-blur border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={22} className="text-[#00a884]" />
            <span className="font-bold text-sm">Genz Messenger</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-[#00a884] hover:text-[#00c795] transition-colors"
            >
              Ingia
            </Link>
            <a
              href={apkDownloadUrl()}
              download="genz-whatsapp.apk"
              className="inline-flex items-center gap-1.5 bg-[#00a884] hover:bg-[#00c795] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={14} />
              Pakua
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00a884]/10 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 pt-16 pb-20 text-center">
          {/* Logo */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-[#00a884]/15 border border-[#00a884]/30 flex items-center justify-center">
            <MessageCircle size={40} className="text-[#00a884]" />
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            <span className="text-[#00a884]">Genz</span> Messenger
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
            App ya mazungumzo ya haraka, salama, na ya kisasa. 
            Fanya mazungumzo na marafiki, familia, na wote wanaopenda.
          </p>

          {/* Download Button */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <a
              href={apkDownloadUrl()}
              download="genz-whatsapp.apk"
              onClick={() => { setDownloading(true); setTimeout(() => setDownloading(false), 3000); }}
              className="inline-flex items-center gap-3 bg-[#00a884] hover:bg-[#00c795] text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all shadow-lg shadow-[#00a884]/25 hover:shadow-[#00a884]/40"
            >
              {downloading ? (
                <><RefreshCw size={22} className="animate-spin" /> Inapakia...</>
              ) : (
                <><Download size={22} /> Pakua APK Bure</>
              )}
            </a>
            {version && (
              <p className="text-xs text-slate-500">
                Version {version.version} • {(version.size / 1024 / 1024).toFixed(1)} MB • Android 6.0+
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[
              { icon: Shield, label: 'Salama' },
              { icon: Zap, label: 'Haraka' },
              { icon: Globe, label: 'Bure' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Icon size={20} className="text-[#00a884]" />
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Vipengele <span className="text-[#00a884]">Vikuu</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#00a884]/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#00a884]/10 flex items-center justify-center mb-3 group-hover:bg-[#00a884]/20 transition-colors">
                <Icon size={20} className="text-[#00a884]" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How to Install ── */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Jinsi ya <span className="text-[#00a884]">Kuisakinisha</span>
        </h2>
        <div className="space-y-6">
          {STEPS.map(({ num, title, desc }) => (
            <div key={num} className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-10 h-10 rounded-full bg-[#00a884]/15 flex items-center justify-center shrink-0">
                <span className="text-[#00a884] font-bold">{num}</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Maswali <span className="text-[#00a884]">Yaliyoulizwa Mara kwa Mara</span>
        </h2>
        <div className="space-y-3">
          {FAQS.map(({ q, a }, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-medium text-sm">{q}</span>
                {openFaq === i ? (
                  <ChevronUp size={18} className="text-slate-500 shrink-0" />
                ) : (
                  <ChevronDown size={18} className="text-slate-500 shrink-0" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed">
                  {a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Terms & Policies ── */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          <span className="text-[#00a884]">Sheria</span> na Sera
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Terms of Service */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-3">
              <Shield size={20} className="text-[#00a884]" />
              <h3 className="font-semibold">Sheria za Matumizi</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              Kwa kutumia Genz Messenger, unakubali sheria zifuatazo:
            </p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-start gap-2">
                <Check size={14} className="text-[#00a884] mt-0.5 shrink-0" />
                <span>Usitume ujumbe wa udhalilishaji, unyanyasaji, au uvumi.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-[#00a884] mt-0.5 shrink-0" />
                <span>Heshimu faragha ya watumiaji wengine.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-[#00a884] mt-0.5 shrink-0" />
                <span>Usitumie app kwa shughuli zisizofaa au zinasaliti sheria.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-[#00a884] mt-0.5 shrink-0" />
                <span>Kila mtumiaji anawajibika kwa tabia yake ndani ya app.</span>
              </li>
            </ul>
          </div>

          {/* Privacy Policy */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-3">
              <Lock size={20} className="text-[#00a884]" />
              <h3 className="font-semibold">Sera ya Faragha</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              Faragha yako ni muhimu kwetu. Hii ndiyo jinsi tunavyolinda data yako:
            </p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-start gap-2">
                <Check size={14} className="text-[#00a884] mt-0.5 shrink-0" />
                <span>Ujumbe wako unalindwa na usalama wa hali ya juu.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-[#00a884] mt-0.5 shrink-0" />
                <span>Hatugawani data yako na watu wa tatu.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-[#00a884] mt-0.5 shrink-0" />
                <span>Unaweza kufuta akaunti yako wakati wowote.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-[#00a884] mt-0.5 shrink-0" />
                <span>Tunahifadhi tu taarifa zinazohitajika kwa kazi ya app.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Additional Policies */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { title: 'Sheria za Kulipa', desc: 'Malipo yote yanafanywa kwa njia salama. Genz Messenger haichukui ada yoyote ya ziada.' },
            { title: 'Uhalali wa Media', desc: 'Media zote zilizopakiwa ni za mmiliki wake. Usipakie media zisizofaa.' },
            { title: 'Ujumbe Uliofutwa', desc: 'Kipengele cha Anti-Delete kinaonyesha ujumbe uliofutwa. Tumia kwa kujua ukweli, si kwa unyanyasaji.' },
          ].map(({ title, desc }) => (
            <div key={title} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <h4 className="font-medium text-sm mb-2">{title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-3xl bg-gradient-to-br from-[#00a884]/10 to-[#00a884]/5 border border-[#00a884]/20">
          <Smartphone size={48} className="text-[#00a884] mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">
            Anza Kutumia <span className="text-[#00a884]">Genz Messenger</span> Sasa
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Pakua app, jisajili, na anza kuzungumza na marafiki yako. 
            Ni bure, ni salama, ni ya kisasa.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={apkDownloadUrl()}
              download="genz-whatsapp.apk"
              className="inline-flex items-center gap-2 bg-[#00a884] hover:bg-[#00c795] text-white font-bold px-6 py-3 rounded-xl transition-all"
            >
              <Download size={18} />
              Pakua Sasa
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.1] text-white font-semibold px-6 py-3 rounded-xl border border-white/[0.1] transition-all"
            >
              Ingia Kwenye Akaunti
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <MessageCircle size={18} className="text-[#00a884]" />
            <span className="font-semibold text-sm">Genz Messenger</span>
          </div>
          <p className="text-xs text-slate-600 mb-4">
            App ya mazungumzo ya haraka, salama, na ya kisasa.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
            <Link to="/terms" className="hover:text-[#00a884] transition-colors">Sheria za Matumizi</Link>
            <span className="text-white/10">•</span>
            <Link to="/privacy-policy" className="hover:text-[#00a884] transition-colors">Sera ya Faragha</Link>
            <span className="text-white/10">•</span>
            <Link to="/install" className="hover:text-[#00a884] transition-colors">Jinsi ya Kuisakinisha</Link>
          </div>
          <p className="text-[10px] text-slate-700 mt-4">
            © {new Date().getFullYear()} Genz Messenger. Haki zote zimehifadhiwa.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
