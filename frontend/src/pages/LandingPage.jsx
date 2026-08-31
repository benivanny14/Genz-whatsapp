import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Download, Shield, MessageCircle, Users, Lock,
  Globe, Smartphone, ChevronDown, ChevronUp, Check,
  Star, Bell, ExternalLink, EyeOff, Ban, Play,
  Send, Settings, Ghost, Layers, BarChart3, Music,
  QrCode, Wifi, HardDrive, ArrowRight, Github, Twitter,
  ChevronLeft, ChevronRight, RefreshCw, ShieldCheck,
  Clock, Paintbrush
} from 'lucide-react';
import { fetchVersionManifest, apkDownloadUrl } from '../utils/versionManifest';
import FeatureShowcase from '../components/FeatureShowcase';

/* ═══════════════════════════════════════════════════════
   SECTION DATA
   ═══════════════════════════════════════════════════════ */

const FEATURES = [
  { icon: Ghost, title: 'Ghost Mode', desc: 'Tazama status bila kuonekana. Hakuna mtu atajua ulitazama.' },
  { icon: Shield, title: 'Anti-Delete Status', desc: 'Ona status zilizofutwa na mtu mwingine. Hakuna kitu kimefutwa kwako.' },
  { icon: Clock, title: 'Status 72h', desc: 'Status inadumu hadi siku 3 badala ya saa 24 pekee.' },
  { icon: Paintbrush, title: 'Drawing Tools', desc: 'Chora juu ya picha kabla ya kuzituma. Rangi na brushes tofauti.' },
  { icon: Lock, title: 'Privacy Controls', desc: 'Control nani anaona nini. Ficha picha, status, na taarifa nyingine.' },
  { icon: BarChart3, title: 'Status Analytics', desc: 'Ona ni nani anatazama status yako na mara ngapi.' },
  { icon: Music, title: 'Music on Status', desc: 'Ongeza muziki kwenye status yako kama Instagram Stories.' },
  { icon: Layers, title: 'Multi-Device', desc: 'Tumia kwenye simu nyingi simultaneously kama WhatsApp Web.' },
];

const COMPARISON_FEATURES = [
  { name: 'Ghost Mode', wa: false, tm: true, genz: true },
  { name: 'Anti-Delete Status', wa: false, tm: true, genz: true },
  { name: 'Status 72h', wa: false, tm: true, genz: true },
  { name: 'Status Replay', wa: false, tm: false, genz: true },
  { name: 'Drawing Tools', wa: false, tm: true, genz: true },
  { name: 'Custom Themes', wa: false, tm: true, genz: true },
  { name: 'Open Source', wa: false, tm: false, genz: true },
  { name: 'No Data Collection', wa: false, tm: false, genz: true },
  { name: 'Free Premium Features', wa: false, tm: true, genz: true },
  { name: 'Active Development', wa: true, tm: true, genz: true },
];

const FAQS = [
  { q: 'Je, Genz Messenger ni bure?', a: 'Ndiyo, app ni bure kutumia. Kuna premium plan ya hiari kwa features za ziada kama Glass Mode na Custom Themes.' },
  { q: 'Je, data yangu iko salama?', a: 'Ndiyo, tunatumia encryption ya hali ya juu (End-to-End Encryption) kulinda data yako. Hatushirikii data na mtu yeyote.' },
  { q: 'Je, ninaweza kutumia kwenye simu nyingi?', a: 'Ndiyo, unaweza ku-link devices nyingi kama WhatsApp Web. Tumia kwenye simu na kompyuta yako wakati mmoja.' },
  { q: 'Je, inafanya kazi offline?', a: 'App inafanya kazi offline kwa ujumbe. Lakini unahitaji internet ili kusukuma na kupokea ujumbe mpya.' },
  { q: 'Je, kuna ads?', a: 'Hapana, Genz Messenger haina matangazo yoyote. Experience safi na bila vikwazo.' },
  { q: 'Je, ninawezaje kupata support?', a: 'Unaweza kutuandikia kupitia Telegram group yetu au kwa barua pepe. Timu yetu inakujibu ndani ya masaa 24.' },
  { q: 'Je, inafanya kazi na WhatsApp rasmi?', a: 'Ndiyo, Genz Messenger inatumia WhatsApp protocol. Unaweza ku-import contacts na mazungumzo kutoka WhatsApp.' },
  { q: 'Je, ninawezaje kusasisha app?', a: 'Unapata notification ndani ya app pale update mpya inapofika. Bonyeza "Update" na APK mpya itapakuliwa na kuisakinisha.' },
];

const TESTIMONIALS = [
  { stars: 5, text: 'App bora zaidi ya messaging! Ghost Mode imenibadilisha jinsi ninavyotumia WhatsApp. Ninaweza kuona status za marafiki bila kujulikana.', name: 'John D.', location: 'Nairobi, Kenya', flag: '🇰🇪' },
  { stars: 5, text: 'Ninapenda anti-delete feature. Sasa siwezi kupoteza ujumbe muhimu tena. Na status 72h ni amazing kwa biashara yangu.', name: 'Mary K.', location: 'Dar es Salaam, Tanzania', flag: '🇹🇿' },
  { stars: 5, text: 'Drawing tools ni creative sana! Ninaweka mavazi ya kufurahisha kwenye picha kabla ya kutuma. Friends zangu wanashangaa.', name: 'James O.', location: 'Kampala, Uganda', flag: '🇺🇬' },
  { stars: 5, text: 'Multi-device support ni game changer. Ninaweza kufanya kazi kwenye kompyuta na kujibu messages kwenye simu wakati mmoja.', name: 'Grace M.', location: 'Kigali, Rwanda', flag: '🇷🇼' },
];

const SCREENSHOTS = [
  { src: '/screenshots/after-login.png', alt: 'Chat List', caption: 'Chat List — Mazungumzo Yako Yote', desc: 'Ona mazungumzo yako yote kwa urahisi. Search, filter, na organize.' },
  { src: '/screenshots/login.png', alt: 'Login Screen', caption: 'Login — Anza Haraka', desc: 'Ingia kwa nambari ya simu. Hakuna nyaraka za ziada.' },
  { src: '/screenshots/login-filled.png', alt: 'Status Page', caption: 'Status — Shiriki Maisha Yako', desc: 'Post status za picha, video, na muziki. Zinadumu siku 3!' },
  { src: '/screenshots/prod-login.png', alt: 'Settings Panel', caption: 'Settings — Customizable Kabisa', desc: 'Badilisha mandhari, faragha, na options nyingi.' },
];

/* ═══════════════════════════════════════════════════════
   I18N TRANSLATIONS
   ═══════════════════════════════════════════════════════ */
const T = {
  sw: {
    // Header
    navFeatures: 'Vipengele',
    navCompare: 'Linganisha',
    navFaq: 'Maswali',
    navDownload: 'Pakua',
    login: 'Ingia',
    download: 'Pakua',
    // Hero
    versionLabel: 'Imesasishwa!',
    headline1: 'Genz Messenger',
    headline2: 'Messaging ya Kisasa',
    heroDesc: 'App ya messaging yenye features za TM WhatsApp na zaidi. Ghost mode, anti-delete, status 72h, na features nyingi za kipekee.',
    downloadAPK: 'Pakua APK',
    watchDemo: 'Tazama Video Demo',
    downloads: 'Downloads',
    // App Info
    appCategory: 'Social Communication App',
    updated: 'Updated: Aug 2026',
    developer: 'Genz Team',
    downloadBtn: 'Download',
    // Screenshots
    screenshotsTitle: 'Angalia App Inavyofanya Kazi',
    screenshotsDesc: 'Screenshots za app yetu ili uone jinsi inavyofanya kazi kabla ya kupakua',
    // Features
    featuresTitle: 'Features Kuu za Genz Messenger',
    featuresDesc: 'Features za kipekee ambazo hupatikana kwenye Genz Messenger pekee',
    // Comparison
    comparisonTitle: 'Kwa Nini Genz ni Bora?',
    comparisonDesc: 'Linganisha Genz Messenger na app nyingine za messaging',
    featureLabel: 'Feature',
    whatsappLabel: 'WhatsApp',
    tmLabel: 'TM WhatsApp',
    genzLabel: 'Genz Messenger ⭐',
    // Video
    videoTitle: 'Tazama Genz Messenger Inavyofanya Kazi',
    videoDesc: 'Video fupi inayoonyesha jinsi app inavyofanya kazi',
    videoPlay: 'Tazama Video Demo',
    videoDuration: 'Duration: 60 seconds',
    // Download
    downloadTitle: 'Pakua Genz Messenger Sasa',
    downloadDesc: 'Chagua njia yako ya kupakua',
    androidAPK: 'Android APK',
    apkDesc: 'Pakua moja kwa moja kwenye simu yako',
    webApp: 'Web App',
    webAppDesc: 'Tumia kwenye browser yako',
    webAppSub: 'Haohitaji kuisakinisha',
    openWebApp: 'Fungua Web App',
    qrTitle: 'Scan QR Code',
    qrDesc: 'Scan na simu yako kupakua',
    qrHint: 'Scan QR code kupakua APK moja kwa moja',
    requirementsTitle: 'Mahitaji ya Mfumo',
    downloading: 'Inapakuliwa...',
    // Install Guide
    installTitle: 'Jinsi ya Kupakua na Install (Hatua 3 Tu)',
    installDesc: 'Fuata hatua hizi rahisi ili uanze kutumia Genz Messenger',
    step1Title: 'Pakua APK',
    step1Desc: 'Bonyeza kitufe cha "Pakua APK" hapo juu. File itaanza kupakuliwa kwenye simu yako.',
    step2Title: 'Ruhusu Install',
    step2Desc: 'Fungua settings ya simu yako na ruhusu "Install from Unknown Sources" kwa Chrome.',
    step3Title: 'Fungua na Anza',
    step3Desc: 'Bonyeza "Install" kisha "Open". Ingia na nambari ya simu na uanze kuzungumza!',
    securityNotice: 'Tunakuhakikishia APK ni salama na haija na virus. App ime-sign na keystore yetu ya halali.',
    // Testimonials
    testimonialsTitle: 'Watumiaji Wanasema Nini',
    testimonialsDesc: 'Maoni ya watumiaji wetu wa halisi',
    // FAQ
    faqTitle: 'Maswali Yanayoulizwa Mara kwa Mara',
    faqDesc: 'Jibu la maswali yanayoulizwa mara kwa mara',
    // Final CTA
    ctaTitle: 'Tayari Kubadilisha',
    ctaSubtitle: 'Jinsi Unavyopiga Mazungumzo?',
    ctaDesc: 'Pakua Genz Messenger leo na uanze kutumia features za kipekee ambazo hazipatikani kwingine. Bure, salama, na ya kisasa.',
    ctaDownload: 'Pakua APK Bure',
    ctaLogin: 'Ingia Kwenye Akaunti',
    language: 'Lugha:',
    // Footer
    footerTagline: 'Messaging ya Kisasa',
    footerDesc: 'App ya messaging yenye features za kipekee. Ghost mode, anti-delete, status 72h, na zaidi.',
    quickLinks: 'Miungo ya Haraka',
    home: 'Nyumbani',
    privacy: 'Faragha',
    terms: 'Sheria',
    followUs: 'Fuatilia Sisi',
    copyright: 'Haki zote zimehifadhiwa.',
  },
  en: {
    navFeatures: 'Features',
    navCompare: 'Compare',
    navFaq: 'FAQ',
    navDownload: 'Download',
    login: 'Login',
    download: 'Download',
    versionLabel: 'Updated!',
    headline1: 'Genz Messenger',
    headline2: 'Modern Messaging',
    heroDesc: 'A messaging app with TM WhatsApp features and more. Ghost mode, anti-delete, 72h status, and exclusive features.',
    downloadAPK: 'Download APK',
    watchDemo: 'Watch Video Demo',
    downloads: 'Downloads',
    appCategory: 'Social Communication App',
    updated: 'Updated: Aug 2026',
    developer: 'Genz Team',
    downloadBtn: 'Download',
    screenshotsTitle: 'See the App in Action',
    screenshotsDesc: 'Screenshots of our app so you can see how it works before downloading',
    featuresTitle: 'Key Features of Genz Messenger',
    featuresDesc: 'Unique features only found in Genz Messenger',
    comparisonTitle: 'Why Genz is Better?',
    comparisonDesc: 'Compare Genz Messenger with other messaging apps',
    featureLabel: 'Feature',
    whatsappLabel: 'WhatsApp',
    tmLabel: 'TM WhatsApp',
    genzLabel: 'Genz Messenger ⭐',
    videoTitle: 'See Genz Messenger in Action',
    videoDesc: 'A short video showing how the app works',
    videoPlay: 'Watch Video Demo',
    videoDuration: 'Duration: 60 seconds',
    downloadTitle: 'Download Genz Messenger Now',
    downloadDesc: 'Choose your download method',
    androidAPK: 'Android APK',
    apkDesc: 'Download directly to your phone',
    webApp: 'Web App',
    webAppDesc: 'Use in your browser',
    webAppSub: 'No installation needed',
    openWebApp: 'Open Web App',
    qrTitle: 'Scan QR Code',
    qrDesc: 'Scan with your phone to download',
    qrHint: 'Scan QR code to download APK directly',
    requirementsTitle: 'System Requirements',
    downloading: 'Downloading...',
    installTitle: 'How to Download & Install (3 Easy Steps)',
    installDesc: 'Follow these simple steps to start using Genz Messenger',
    step1Title: 'Download APK',
    step1Desc: 'Tap the "Download APK" button above. The file will start downloading to your phone.',
    step2Title: 'Allow Install',
    step2Desc: 'Open your phone settings and allow "Install from Unknown Sources" for Chrome.',
    step3Title: 'Open & Start',
    step3Desc: 'Tap "Install" then "Open". Sign in with your phone number and start chatting!',
    securityNotice: 'We guarantee the APK is safe and virus-free. The app is signed with our legitimate keystore.',
    testimonialsTitle: 'What Users Say',
    testimonialsDesc: 'Real feedback from our users',
    faqTitle: 'Frequently Asked Questions',
    faqDesc: 'Answers to commonly asked questions',
    ctaTitle: 'Ready to Change',
    ctaSubtitle: 'How You Chat?',
    ctaDesc: 'Download Genz Messenger today and start using unique features not found elsewhere. Free, safe, and modern.',
    ctaDownload: 'Download APK Free',
    ctaLogin: 'Login to Account',
    language: 'Language:',
    footerTagline: 'Modern Messaging',
    footerDesc: 'A messaging app with unique features. Ghost mode, anti-delete, 72h status, and more.',
    quickLinks: 'Quick Links',
    home: 'Home',
    privacy: 'Privacy',
    terms: 'Terms',
    followUs: 'Follow Us',
    copyright: 'All rights reserved.',
  },
  fr: {
    navFeatures: 'Fonctionnalités',
    navCompare: 'Comparer',
    navFaq: 'FAQ',
    navDownload: 'Télécharger',
    login: 'Connexion',
    download: 'Télécharger',
    versionLabel: 'Mis à jour!',
    headline1: 'Genz Messenger',
    headline2: 'Messagerie Moderne',
    heroDesc: 'Une application de messagerie avec les fonctionnalités de TM WhatsApp et plus encore. Mode fantôme, anti-suppression, statut 72h et fonctionnalités exclusives.',
    downloadAPK: 'Télécharger APK',
    watchDemo: 'Voir la Démo Vidéo',
    downloads: 'Téléchargements',
    appCategory: 'Application de Communication Sociale',
    updated: 'Mis à jour: Août 2026',
    developer: 'Équipe Genz',
    downloadBtn: 'Télécharger',
    screenshotsTitle: "Voir l'App en Action",
    screenshotsDesc: "Captures d'écran de notre app pour voir comment elle fonctionne avant de télécharger",
    featuresTitle: 'Fonctionnalités Clés de Genz Messenger',
    featuresDesc: 'Fonctionnalités uniques uniquement dans Genz Messenger',
    comparisonTitle: 'Pourquoi Genz est Mieux?',
    comparisonDesc: "Comparez Genz Messenger avec d'autres applications de messagerie",
    featureLabel: 'Fonctionnalité',
    whatsappLabel: 'WhatsApp',
    tmLabel: 'TM WhatsApp',
    genzLabel: 'Genz Messenger ⭐',
    videoTitle: 'Voir Genz Messenger en Action',
    videoDesc: "Une courte vidéo montrant comment l'application fonctionne",
    videoPlay: 'Voir la Démo Vidéo',
    videoDuration: 'Durée: 60 secondes',
    downloadTitle: 'Télécharger Genz Messenger Maintenant',
    downloadDesc: 'Choisissez votre méthode de téléchargement',
    androidAPK: 'APK Android',
    apkDesc: 'Téléchargez directement sur votre téléphone',
    webApp: 'App Web',
    webAppDesc: 'Utilisez dans votre navigateur',
    webAppSub: "Pas d'installation requise",
    openWebApp: "Ouvrir l'App Web",
    qrTitle: 'Scanner le QR Code',
    qrDesc: 'Scannez avec votre téléphone pour télécharger',
    qrHint: "Scannez le QR code pour télécharger l'APK directement",
    requirementsTitle: 'Configuration Requise',
    downloading: 'Téléchargement...',
    installTitle: 'Comment Télécharger & Installer (3 Étapes)',
    installDesc: 'Suivez ces étapes simples pour commencer à utiliser Genz Messenger',
    step1Title: 'Télécharger APK',
    step1Desc: 'Appuyez sur le bouton "Télécharger APK" ci-dessus. Le fichier commencera à se télécharger sur votre téléphone.',
    step2Title: "Autoriser l'Installation",
    step2Desc: 'Ouvrez les paramètres de votre téléphone et autorisez "Sources Inconnues" pour Chrome.',
    step3Title: 'Ouvrir & Commencer',
    step3Desc: 'Appuyez sur "Installer" puis "Ouvrir". Connectez-vous avec votre numéro de téléphone et commencez à discuter!',
    securityNotice: "Nous garantissons que l'APK est sûr et sans virus. L'application est signée avec notre keystore légitime.",
    testimonialsTitle: 'Ce que Disent les Utilisateurs',
    testimonialsDesc: 'Des retours réels de nos utilisateurs',
    faqTitle: 'Questions Fréquemment Posées',
    faqDesc: "Réponses aux questions les plus courantes",
    ctaTitle: 'Prêt à Changer',
    ctaSubtitle: 'Comment Vous Discutez?',
    ctaDesc: "Téléchargez Genz Messenger aujourd'hui et commencez à utiliser des fonctionnalités uniques. Gratuit, sûr et moderne.",
    ctaDownload: 'Télécharger APK Gratuit',
    ctaLogin: 'Se Connecter',
    language: 'Langue:',
    footerTagline: 'Messagerie Moderne',
    footerDesc: 'Une application de messagerie avec des fonctionnalités uniques. Mode fantôme, anti-suppression, statut 72h et plus.',
    quickLinks: 'Liens Rapides',
    home: 'Accueil',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    followUs: 'Suivez-nous',
    copyright: 'Tous droits réservés.',
  },
};

/* ═══════════════════════════════════════════════════════
   QR CODE COMPONENT (goqr.me API — real scannable QR)
   ═══════════════════════════════════════════════════════ */
const QRCode = ({ url, size = 160 }) => {
  const [qrSrc, setQrSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    // goqr.me free API: returns a PNG QR code for the given URL
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=111b21&color=ffffff&margin=10`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setQrSrc(apiUrl);
    img.onerror = () => setError(true);
    img.src = apiUrl;
  }, [url, size]);

  if (error) {
    // Fallback: simple placeholder
    return (
      <div
        className="rounded-lg bg-white flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="text-center p-4">
          <QrCode size={32} className="text-gray-400 mx-auto mb-1" />
          <p className="text-[10px] text-gray-400">QR Code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white flex items-center justify-center overflow-hidden" style={{ width: size, height: size }}>
      {qrSrc ? (
        <img src={qrSrc} alt="QR Code for APK download" width={size} height={size} className="block" />
      ) : (
        <div className="animate-pulse bg-gray-200 w-full h-full" />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   PHONE MOCKUP COMPONENT
   ═══════════════════════════════════════════════════════ */
const PhoneMockup = () => (
  <div className="relative mx-auto w-[260px] md:w-[300px]">
    {/* Phone frame */}
    <div className="relative rounded-[2.5rem] bg-gradient-to-b from-gray-700 to-gray-900 p-2 shadow-2xl shadow-black/50">
      {/* Screen */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[#111b21]">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 py-2 bg-[#1f2c34]">
          <span className="text-[10px] text-white/70">9:41</span>
          <div className="flex items-center gap-1">
            <Signal size={10} className="text-white/70" />
            <Wifi size={10} className="text-white/70" />
            <div className="w-5 h-2.5 rounded-sm border border-white/50 flex items-center justify-end p-[1px]">
              <div className="h-full w-3/4 bg-green-400 rounded-[1px]" />
            </div>
          </div>
        </div>
        
        {/* App header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1f2c34]">
          <div className="flex items-center gap-2">
            <MessageCircle size={20} className="text-[#00a884]" />
            <span className="text-white font-semibold text-sm">GENZ</span>
          </div>
          <div className="flex items-center gap-3">
            <Search size={16} className="text-white/60" />
            <MoreVertical size={16} className="text-white/60" />
          </div>
        </div>
        
        {/* Chat list preview */}
        <div className="p-3 space-y-3">
          {[
            { name: 'John Doe', msg: 'Habari! Umeangalia status yangu? 👻', time: '10:30', unread: 2, color: 'bg-blue-500' },
            { name: 'Mary Ki...', msg: 'Nimependa drawing tools! 🎨', time: '09:15', unread: 0, color: 'bg-pink-500' },
            { name: 'Group ya...', msg: 'James: Kumbe status ya 72h...', time: 'Yesterday', unread: 5, color: 'bg-purple-500' },
            { name: 'David M...', msg: 'Piga video call leo 📹', time: 'Yesterday', unread: 0, color: 'bg-orange-500' },
          ].map((chat, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
              <div className={`w-12 h-12 rounded-full ${chat.color} flex items-center justify-center text-white font-bold text-sm`}>
                {chat.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium text-sm truncate">{chat.name}</span>
                  <span className="text-[10px] text-[#00a884]">{chat.time}</span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-white/50 text-xs truncate">{chat.msg}</span>
                  {chat.unread > 0 && (
                    <span className="bg-[#00a884] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Bottom nav */}
        <div className="flex items-center justify-around py-2 bg-[#1f2c34] border-t border-white/10">
          <MessageCircle size={18} className="text-[#00a884]" />
          <Bell size={18} className="text-white/40" />
          <Users size={18} className="text-white/40" />
          <Settings size={18} className="text-white/40" />
        </div>
      </div>
    </div>
    {/* Floating elements for effect */}
    <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#00a884]/20 rounded-full blur-2xl" />
    <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-[#00a884]/15 rounded-full blur-3xl" />
  </div>
);

// Small helper icons not in lucide
const Signal = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 20h.01" /><path d="M7 20v-4" /><path d="M12 20v-8" /><path d="M17 20V8" />
  </svg>
);

const Search = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

const MoreVertical = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
  </svg>
);

/* ═══════════════════════════════════════════════════════
   ANIMATED SECTION WRAPPER
   ═══════════════════════════════════════════════════════ */
const AnimatedSection = ({ children, className = '', delay = 0 }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════ */
const LandingPage = () => {
  const [version, setVersion] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [lang, setLang] = useState('sw'); // sw, en
  const [videoPlaying, setVideoPlaying] = useState(false);
  const screenshotRef = useRef(null);

  useEffect(() => {
    fetchVersionManifest().then(setVersion).catch(() => {});
    try {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = apkDownloadUrl();
      link.as = 'fetch';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    } catch {}
  }, []);

  const apkSize = version?.size ? (version.size / 1024 / 1024).toFixed(1) : '10.2';
  const apkVersion = version?.version || '1.1.14';

  // Translation helper
  const t = T[lang] || T.sw;

  const switchLang = (code) => {
    setLang(code);
    localStorage.setItem('genz_landing_lang', code);
  };

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => setDownloading(false), 3000);
  };

  const scrollScreenshots = (dir) => {
    if (!screenshotRef.current) return;
    const scrollAmount = 240;
    screenshotRef.current.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0b141a] text-white">
      {/* ══════ HEADER ══════ */}
      <header className="sticky top-0 z-50 bg-[#0b141a]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00a884] flex items-center justify-center">
              <MessageCircle size={18} className="text-white" />
            </div>
            <span className="font-bold text-sm">Genz Messenger</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <a href="#features" className="hover:text-[#00a884] transition-colors">{t.navFeatures}</a>
            <a href="#comparison" className="hover:text-[#00a884] transition-colors">{t.navCompare}</a>
            <a href="#faq" className="hover:text-[#00a884] transition-colors">{t.navFaq}</a>
            <a href="#download" className="hover:text-[#00a884] transition-colors">{t.navDownload}</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-[#00a884] hover:text-[#00c795] transition-colors"
            >
              {t.login}
            </Link>
            <a
              href={apkDownloadUrl()}
              download="genz-whatsapp.apk"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 bg-[#00a884] hover:bg-[#00c795] text-white text-xs font-bold px-3 py-2 rounded-lg transition-all"
            >
              <Download size={14} />
              {t.download}
            </a>
          </div>
        </div>
      </header>

      {/* ══════ SECTION 1: HERO ══════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00a884]/8 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-[#00a884]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[#00a884]/3 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-20">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left: Text content */}
            <div className="flex-1 text-center lg:text-left">
              <AnimatedSection>
                <div className="inline-flex items-center gap-2 bg-[#00a884]/10 border border-[#00a884]/20 rounded-full px-4 py-1.5 mb-6">
                  <span className="w-2 h-2 bg-[#00a884] rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-[#00a884]">Version {apkVersion} — {t.versionLabel}</span>
                </div>
              </AnimatedSection>
              
              <AnimatedSection delay={100}>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                  {t.headline1.split(' ')[0]} <span className="text-[#00a884]">{t.headline1.split(' ').slice(1).join(' ')}</span>
                  <br />
                  <span className="text-2xl md:text-3xl lg:text-4xl text-white/80 font-bold">{t.headline2}</span>
                </h1>
              </AnimatedSection>
              
              <AnimatedSection delay={200}>
                <p className="mt-6 text-lg text-slate-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                  {t.heroDesc}
                </p>
              </AnimatedSection>
              
              <AnimatedSection delay={300}>
                <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <a
                    href={apkDownloadUrl()}
                    download="genz-whatsapp.apk"
                    onClick={handleDownload}
                    className="group inline-flex items-center gap-3 bg-[#00a884] hover:bg-[#00c795] text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all shadow-lg shadow-[#00a884]/25 hover:shadow-[#00a884]/40 hover:scale-[1.02]"
                  >
                    {downloading ? (
                      <><RefreshCw size={22} className="animate-spin" /> Inapakuliwa...</>
                    ) : (
                      <>
                        <Download size={22} className="group-hover:animate-bounce" />
                        {t.downloadAPK} ({apkSize} MB)
                      </>
                    )}
                  </a>
                  <a
                    href="#video-demo"
                    className="inline-flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.1] text-white font-semibold px-6 py-4 rounded-2xl border border-white/[0.1] transition-all"
                  >
                    <Play size={18} />
                    {t.watchDemo}
                  </a>
                </div>
              </AnimatedSection>
              
              {/* Trust badges */}
              <AnimatedSection delay={400}>
                <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start">
                  {[
                    { icon: ShieldCheck, label: 'Virus Free' },
                    { icon: Ban, label: 'No Ads' },
                    { icon: EyeOff, label: 'Privacy First' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Icon size={14} className="text-[#00a884]" />
                      {label}
                    </div>
                  ))}
                </div>
              </AnimatedSection>
              
              {/* Download counter */}
              <AnimatedSection delay={500}>
                <div className="mt-6 flex items-center gap-4 justify-center lg:justify-start">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-[#00a884]">10,000+</span>
                    <span className="text-slate-500">{t.downloads}</span>
                  </div>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />)}
                    <span className="text-sm text-slate-500 ml-1">4.8</span>
                  </div>
                </div>
              </AnimatedSection>
            </div>
            
            {/* Right: Phone Mockup */}
            <AnimatedSection delay={300} className="flex-shrink-0">
              <PhoneMockup />
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ══════ APP INFO CARD (like TM WhatsApp) ══════ */}
      <section className="max-w-4xl mx-auto px-4 -mt-4 mb-12">
        <AnimatedSection>
          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-[#00a884] flex items-center justify-center shrink-0">
                <MessageCircle size={40} className="text-white" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold">Genz Messenger</h3>
                <p className="text-sm text-slate-400 mt-1">{t.appCategory}</p>
                <div className="flex flex-wrap items-center gap-4 mt-3 justify-center md:justify-start text-sm text-slate-500">
                  <span>📦 Version {apkVersion}</span>
                  <span>💾 {apkSize} MB</span>
                  <span>📱 Android 8.0+</span>
                  <span>🔄 {t.updated}</span>
                  <span>👤 {t.developer}</span>
                </div>
              </div>
              <a
                href={apkDownloadUrl()}
                download="genz-whatsapp.apk"
                onClick={handleDownload}
                className="shrink-0 inline-flex items-center gap-2 bg-[#00a884] hover:bg-[#00c795] text-white font-bold px-6 py-3 rounded-xl transition-all"
              >
                <Download size={18} />
                {t.downloadBtn}
              </a>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ══════ SECTION 2: SCREENSHOTS GALLERY ══════ */}
      <section className="py-16 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <AnimatedSection>
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
              {t.screenshotsTitle.split(' ')[0]} <span className="text-[#00a884]">{t.screenshotsTitle.split(' ').slice(1).join(' ')}</span>
            </h2>
            <p className="text-slate-500 text-center mb-10 max-w-md mx-auto">
              {t.screenshotsDesc}
            </p>
          </AnimatedSection>
          
          <AnimatedSection delay={200}>
            <div className="relative">
              {/* Navigation buttons */}
              <button
                onClick={() => scrollScreenshots(-1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#00c795] flex items-center justify-center text-white shadow-lg transition-all -ml-2 md:ml-0"
                aria-label="Previous screenshot"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => scrollScreenshots(1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#00c795] flex items-center justify-center text-white shadow-lg transition-all -mr-2 md:mr-0"
                aria-label="Next screenshot"
              >
                <ChevronRight size={20} />
              </button>
              
              {/* Screenshots scroll container — Phone frames like TM WhatsApp */}
              <div
                ref={screenshotRef}
                className="flex gap-6 overflow-x-auto scrollbar-none px-4 snap-x snap-mandatory pb-4"
                style={{ scrollbarWidth: 'none' }}
              >
                {SCREENSHOTS.map((ss, i) => (
                  <div key={i} className="flex-shrink-0 snap-center group">
                    {/* Phone frame */}
                    <div className="relative w-52 md:w-60 mx-auto">
                      {/* Phone body */}
                      <div className="rounded-[2rem] bg-gradient-to-b from-gray-700 to-gray-900 p-[5px] shadow-2xl shadow-black/30 group-hover:shadow-[#00a884]/20 transition-shadow duration-300">
                        <div className="rounded-[1.7rem] overflow-hidden bg-[#1f2c34] relative">
                          {/* Notch */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-900 rounded-b-xl z-10" />
                          {/* Status bar */}
                          <div className="flex items-center justify-between px-4 pt-6 pb-1 text-[8px] text-white/50">
                            <span>9:41</span>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-1.5 border border-white/30 rounded-sm flex items-end justify-end p-[1px]">
                                <div className="w-1.5 h-0.5 bg-green-400 rounded-[1px]" />
                              </div>
                            </div>
                          </div>
                          {/* Screenshot image */}
                          <div className="aspect-[9/16] relative overflow-hidden">
                            <img
                              src={ss.src}
                              alt={ss.alt}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                            {/* Gradient overlay at bottom */}
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                          </div>
                        </div>
                      </div>
                      {/* Glow on hover */}
                      <div className="absolute -inset-3 rounded-[3rem] bg-[#00a884]/0 group-hover:bg-[#00a884]/5 transition-colors duration-500 -z-10 blur-xl" />
                    </div>
                    {/* Caption */}
                    <div className="text-center mt-4 px-2">
                      <p className="text-sm font-semibold text-white/90">{ss.caption}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ss.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ══════ SECTION 3: FEATURES GRID ══════ */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-16">
        <AnimatedSection>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            {t.featuresTitle.split(' ')[0]} <span className="text-[#00a884]">{t.featuresTitle.split(' ').slice(1).join(' ')}</span>
          </h2>
          <p className="text-slate-500 text-center mb-12 max-w-lg mx-auto">
            {t.featuresDesc}
          </p>
        </AnimatedSection>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <AnimatedSection key={title} delay={i * 80}>
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#00a884]/30 transition-all duration-300 group hover:bg-[#00a884]/5 h-full">
                <div className="w-12 h-12 rounded-xl bg-[#00a884]/10 flex items-center justify-center mb-4 group-hover:bg-[#00a884]/20 transition-colors">
                  <Icon size={24} className="text-[#00a884]" />
                </div>
                <h3 className="font-semibold text-sm mb-2">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ══════ SECTION 4: COMPARISON TABLE ══════ */}
      <section id="comparison" className="max-w-4xl mx-auto px-4 py-16">
        <AnimatedSection>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            <span className="text-[#00a884]">{t.comparisonTitle.split('?')[0]}</span>?
          </h2>
          <p className="text-slate-500 text-center mb-10 max-w-md mx-auto">
            {t.comparisonDesc}
          </p>
        </AnimatedSection>
        
        <AnimatedSection delay={200}>
          <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#00a884]/10">
                    <th className="text-left p-4 font-semibold text-slate-300">{t.featureLabel}</th>
                    <th className="text-center p-4 font-semibold text-slate-400">{t.whatsappLabel}</th>
                    <th className="text-center p-4 font-semibold text-slate-400">{t.tmLabel}</th>
                    <th className="text-center p-4 font-semibold text-[#00a884] bg-[#00a884]/5">{t.genzLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map(({ name, wa, tm, genz }, i) => (
                    <tr key={name} className={`border-t border-white/[0.04] ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                      <td className="p-4 text-slate-300 font-medium">{name}</td>
                      <td className="text-center p-4">
                        {wa ? (
                          <span className="text-green-400 text-lg">✅</span>
                        ) : (
                          <span className="text-red-400 text-lg">❌</span>
                        )}
                      </td>
                      <td className="text-center p-4">
                        {tm ? (
                          <span className="text-green-400 text-lg">✅</span>
                        ) : (
                          <span className="text-red-400 text-lg">❌</span>
                        )}
                      </td>
                      <td className="text-center p-4 bg-[#00a884]/5">
                        {genz ? (
                          <span className="text-green-400 text-lg">✅</span>
                        ) : (
                          <span className="text-red-400 text-lg">❌</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ══════ SECTION 5: FEATURE SHOWCASE (Interactive Video) ══════ */}
      <section id="video-demo" className="max-w-6xl mx-auto px-4 py-16">
        <AnimatedSection>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            {t.videoTitle.split('Inavyofanya')[0]} <span className="text-[#00a884]">{t.videoTitle.split('Inavyofanya')[1]}</span>
          </h2>
          <p className="text-slate-500 text-center mb-10 max-w-md mx-auto">
            {t.videoDesc}
          </p>
        </AnimatedSection>
        
        <AnimatedSection delay={200}>
          <FeatureShowcase />
        </AnimatedSection>
      </section>

      {/* ══════ SECTION 6: DOWNLOAD OPTIONS ══════ */}
      <section id="download" className="max-w-6xl mx-auto px-4 py-16">
        <AnimatedSection>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            {t.downloadTitle.split('Sasa')[0]} <span className="text-[#00a884]">{t.downloadTitle.split('Sasa')[1]}</span>
          </h2>
          <p className="text-slate-500 text-center mb-12 max-w-md mx-auto">
            {t.downloadDesc}
          </p>
        </AnimatedSection>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* APK Download */}
          <AnimatedSection delay={0}>
            <div className="rounded-2xl bg-white/[0.04] border border-[#00a884]/20 p-6 text-center hover:border-[#00a884]/40 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-[#00a884]/10 flex items-center justify-center mx-auto mb-4">
                <Smartphone size={28} className="text-[#00a884]" />
              </div>
              <h3 className="font-bold mb-2">{t.androidAPK}</h3>
              <p className="text-xs text-slate-500 mb-4">{t.apkDesc}</p>
              <div className="text-xs text-slate-400 mb-4">
                v{apkVersion} • {apkSize} MB • Android 8.0+
              </div>
              <a
                href={apkDownloadUrl()}
                download="genz-whatsapp.apk"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 bg-[#00a884] hover:bg-[#00c795] text-white font-bold px-6 py-3 rounded-xl transition-all w-full justify-center"
              >
                <Download size={18} />
                {downloading ? t.downloading : t.downloadAPK}
              </a>
            </div>
          </AnimatedSection>
          
          {/* Web App */}
          <AnimatedSection delay={100}>
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6 text-center hover:border-white/[0.15] transition-all">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Globe size={28} className="text-blue-400" />
              </div>
              <h3 className="font-bold mb-2">{t.webApp}</h3>
              <p className="text-xs text-slate-500 mb-4">{t.webAppDesc}</p>
              <div className="text-xs text-slate-400 mb-4">
                {t.webAppSub}
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] text-white font-bold px-6 py-3 rounded-xl transition-all w-full justify-center border border-white/[0.1]"
              >
                <ExternalLink size={18} />
                {t.openWebApp}
              </Link>
            </div>
          </AnimatedSection>
          
          {/* QR Code */}
          <AnimatedSection delay={200}>
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6 text-center hover:border-white/[0.15] transition-all">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <QrCode size={28} className="text-purple-400" />
              </div>
              <h3 className="font-bold mb-2">{t.qrTitle}</h3>
              <p className="text-xs text-slate-500 mb-4">{t.qrDesc}</p>
              <div className="flex justify-center mb-4">
                <QRCode url={apkDownloadUrl()} size={120} />
              </div>
              <p className="text-[10px] text-slate-500">
                {t.qrHint}
              </p>
            </div>
          </AnimatedSection>
        </div>
        
        {/* System Requirements */}
        <AnimatedSection delay={300}>
          <div className="max-w-4xl mx-auto mt-12">
            <h3 className="text-lg font-bold text-center mb-6">
              <span className="text-[#00a884]">{t.requirementsTitle.split('ya')[0]}</span>{t.requirementsTitle.split('ya')[1]}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Smartphone, title: 'Android', desc: 'Version 8.0 (Oreo) au mpya zaidi' },
                { icon: HardDrive, title: 'Storage', desc: 'Angalau 50MB ya free space' },
                { icon: Wifi, title: 'Internet', desc: 'Connection kwa install (app inafanya kazi offline)' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-10 h-10 rounded-lg bg-[#00a884]/10 flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-[#00a884]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ══════ SECTION 7: INSTALLATION GUIDE ══════ */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <AnimatedSection>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            {t.installTitle.split('Install')[0]} <span className="text-[#00a884]">Install</span>{t.installTitle.split('Install')[1]}
          </h2>
          <p className="text-slate-500 text-center mb-12 max-w-md mx-auto">
            {t.installDesc}
          </p>
        </AnimatedSection>
        
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              num: '1',
              icon: Download,
              title: t.step1Title,
              desc: t.step1Desc,
              img: '/screenshots/login.png',
            },
            {
              num: '2',
              icon: ShieldAlert,
              title: t.step2Title,
              desc: t.step2Desc,
              img: '/screenshots/login-filled.png',
            },
            {
              num: '3',
              icon: CheckCircle,
              title: t.step3Title,
              desc: t.step3Desc,
              img: '/screenshots/after-login.png',
            },
          ].map(({ num, icon: Icon, title, desc, img }, i) => (
            <AnimatedSection key={num} delay={i * 150}>
              <div className="relative rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden hover:border-[#00a884]/20 transition-all">
                {/* Step number badge */}
                <div className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {num}
                </div>
                {/* Screenshot preview */}
                <div className="h-40 bg-gradient-to-b from-[#1f2c34] to-[#0b141a] flex items-center justify-center relative overflow-hidden">
                  <div className="w-24 h-40 rounded-xl border-2 border-white/10 bg-[#111b21] flex items-center justify-center">
                    <Icon size={24} className="text-[#00a884]" />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold mb-2">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
        
        <AnimatedSection delay={500}>
          <div className="mt-8 p-4 rounded-xl bg-[#00a884]/5 border border-[#00a884]/20 text-center">
            <p className="text-sm text-[#00a884] flex items-center justify-center gap-2">
              <ShieldCheck size={16} />
              {t.securityNotice}
            </p>
          </div>
        </AnimatedSection>
      </section>

      {/* ══════ SECTION 8: TESTIMONIALS ══════ */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <AnimatedSection>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            {t.testimonialsTitle.split('Nini')[0]} <span className="text-[#00a884]">{t.testimonialsTitle.split('Nini')[1]}</span>
          </h2>
          <p className="text-slate-500 text-center mb-12 max-w-md mx-auto">
            {t.testimonialsDesc}
          </p>
        </AnimatedSection>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TESTIMONIALS.map(({ stars, text, name, location, flag }, i) => (
            <AnimatedSection key={i} delay={i * 100}>
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#00a884]/20 transition-all h-full flex flex-col">
                <div className="flex items-center gap-0.5 mb-3">
                  {Array.from({ length: stars }).map((_, j) => (
                    <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed flex-1 italic">"{text}"</p>
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#00a884]/20 flex items-center justify-center text-xs">
                      {flag}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{name}</p>
                      <p className="text-[10px] text-slate-500">{location}</p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ══════ SECTION 9: FAQ ══════ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-16">
        <AnimatedSection>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            {t.faqTitle.split('Yanayoulizwa')[0]} <span className="text-[#00a884]">{t.faqTitle.split('Yanayoulizwa')[1]}</span>{t.faqTitle.split('Mara')[1]}
          </h2>
          <p className="text-slate-500 text-center mb-10 max-w-md mx-auto">
            {t.faqDesc}
          </p>
        </AnimatedSection>
        
        <div className="space-y-3">
          {FAQS.map(({ q, a }, i) => (
            <AnimatedSection key={i} delay={i * 60}>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden hover:border-white/[0.1] transition-colors">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-medium text-sm pr-4">{q}</span>
                  <div className={`shrink-0 w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`}>
                    <ChevronDown size={14} className="text-slate-500" />
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-white/[0.04] pt-3">
                    {a}
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ══════ SECTION 10: FINAL CTA ══════ */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <AnimatedSection>
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00a884]/20 via-[#00a884]/10 to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00a884]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00a884]/5 rounded-full blur-3xl" />
            
            <div className="relative p-8 md:p-12 text-center border border-[#00a884]/20 rounded-3xl">
              <div className="w-16 h-16 rounded-2xl bg-[#00a884]/15 flex items-center justify-center mx-auto mb-6">
                <Smartphone size={32} className="text-[#00a884]" />
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                {t.ctaTitle}
                <br />
                <span className="text-[#00a884]">{t.ctaSubtitle}</span>
              </h2>
              
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                {t.ctaDesc}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={apkDownloadUrl()}
                  download="genz-whatsapp.apk"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-3 bg-[#00a884] hover:bg-[#00c795] text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all shadow-lg shadow-[#00a884]/25 hover:shadow-[#00a884]/40 hover:scale-[1.02]"
                >
                  <Download size={22} />
                  {t.ctaDownload} ({apkSize} MB)
                </a>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.1] text-white font-semibold px-6 py-4 rounded-2xl border border-white/[0.1] transition-all"
                >
                  {t.ctaLogin}
                  <ArrowRight size={16} />
                </Link>
              </div>
              
              {/* Language Switcher */}
              <div className="mt-8 flex items-center justify-center gap-3">
                <span className="text-xs text-slate-500">{t.language}</span>
                {[
                  { code: 'sw', label: '🇹🇿 Kiswahili' },
                  { code: 'en', label: '🇬🇧 English' },
                  { code: 'fr', label: '🇫🇷 Français' },
                ].map(({ code, label }) => (
                  <button
                    key={code}
                    onClick={() => switchLang(code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      lang === code
                        ? 'bg-[#00a884] text-white'
                        : 'bg-white/[0.05] text-slate-500 hover:bg-white/[0.1] hover:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t border-white/[0.06] py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00a884] flex items-center justify-center">
                  <MessageCircle size={20} className="text-white" />
                </div>
                <div>
                  <span className="font-bold">Genz Messenger</span>
                  <p className="text-[10px] text-slate-500">Messaging ya Kisasa</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                {t.footerDesc}
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-sm mb-4">{t.quickLinks}</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-[#00a884] transition-colors">{t.home}</a></li>
                <li><a href="#features" className="hover:text-[#00a884] transition-colors">Vipengele</a></li>
                <li><a href="#download" className="hover:text-[#00a884] transition-colors">Pakua</a></li>
                <li><a href="#faq" className="hover:text-[#00a884] transition-colors">Maswali</a></li>
                <li><Link to="/privacy-policy" className="hover:text-[#00a884] transition-colors">{t.privacy}</Link></li>
                <li><Link to="/terms" className="hover:text-[#00a884] transition-colors">{t.terms}</Link></li>
              </ul>
            </div>
            
            {/* Social & Contact */}
            <div>
              <h4 className="font-semibold text-sm mb-4">{t.followUs}</h4>
              <div className="flex items-center gap-3 mb-4">
                <a href="#" className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-[#00a884]/20 flex items-center justify-center transition-all" aria-label="GitHub">
                  <Github size={18} className="text-slate-400" />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-[#00a884]/20 flex items-center justify-center transition-all" aria-label="Twitter">
                  <Twitter size={18} className="text-slate-400" />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-[#00a884]/20 flex items-center justify-center transition-all" aria-label="Telegram">
                  <Send size={18} className="text-slate-400" />
                </a>
              </div>
              <p className="text-xs text-slate-600">
                Telegram: @GenzMessenger
              </p>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="border-t border-white/[0.06] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} Genz Messenger. {t.copyright}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <Link to="/privacy-policy" className="hover:text-[#00a884] transition-colors">{t.privacy}</Link>
              <span className="text-white/10">•</span>
              <Link to="/terms" className="hover:text-[#00a884] transition-colors">{t.terms}</Link>
              <span className="text-white/10">•</span>
              <Link to="/install" className="hover:text-[#00a884] transition-colors">{t.installTitle.split('Tu')[0]}</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ══════ BACK TO TOP ══════ */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#00a884] hover:bg-[#00c795] flex items-center justify-center text-white shadow-lg shadow-[#00a884]/25 transition-all z-50"
        aria-label="Back to top"
      >
        <ChevronUp size={20} />
      </button>
    </div>
  );
};

// Helper icon components
const CheckCircle = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ShieldAlert = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M12 8v4" /><path d="M12 16h.01" />
  </svg>
);

export default LandingPage;
