import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Smartphone, ShieldAlert, RefreshCw } from 'lucide-react';
import ReleaseUptake from '../components/ReleaseUptake.jsx';

const Step = ({ icon: Icon, title, children }) => (
  <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
    <h2 className="flex items-center gap-2 text-base font-bold text-white mb-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00a884]/20">
        <Icon size={16} className="text-[#00a884]" />
      </span>
      {title}
    </h2>
    <div className="space-y-2 text-sm text-blue-100/80 leading-relaxed">{children}</div>
  </section>
);

/**
 * How to install GENZ on Android — the app is distributed as a direct APK
 * download (Chrome), NOT through the Play Store. Bilingual (Kiswahili +
 * English) because our users are East African.
 */
const InstallGuide = () => {
  return (
    <div className="min-h-screen bg-[#0b141a] text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/login"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Back to login"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Install GENZ on Android</h1>
            <p className="text-xs text-blue-100/60">How to install the app on Android</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#00a884]/30 bg-[#00a884]/10 p-4 text-sm text-emerald-100">
            <p className="font-semibold mb-1">📱 No Play Store — direct download via Chrome</p>
            <p>
              GENZ is distributed as an <strong>APK</strong> you download directly from our website.
              This means our updates arrive fast, without waiting for a Play Store review.
              We don&apos;t use the Play Store — the app is a direct download from our site.
            </p>
          </div>

          <Step icon={Download} title="1. Download the APK">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Open the GENZ website in <strong>Chrome</strong> on your Android phone.
              </li>
              <li>
                Tap the <strong>Download Android App</strong> button on the login page.
              </li>
              <li>
                Chrome will show a warning: <em>&quot;This type of file can harm your device&quot;</em> —
                this is a standard warning for all APKs outside the Play Store. Tap <strong>OK</strong>.
              </li>
            </ul>
          </Step>

          <Step icon={ShieldAlert} title="2. Allow Chrome to install (Allow unknown sources)">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                After the download, tap the <strong>genz-whatsapp.apk</strong> notification.
              </li>
              <li>
                If Android asks <em>&quot;Allow from this source?&quot;</em> — tap{' '}
                <strong>Allow</strong>. This only lets Chrome install the app.
              </li>
              <li>
                If you see <em>&quot;Play Protect doesn&apos;t recognize this app&apos;s developer&quot;</em> —
                tap <strong>More details → Install anyway</strong>. Our app is safe and signed
                with a real keystore; this warning appears for any app outside the Play Store.
              </li>
            </ul>
          </Step>

          <Step icon={Smartphone} title="3. Open the app">
            <ul className="list-disc pl-5 space-y-1">
              <li>After installing, tap <strong>Open</strong> or find the GENZ icon on your home screen.</li>
              <li>Log in with your phone number and password — your data syncs automatically.</li>
              <li>Allow notifications so you receive messages and calls even when the app is closed.</li>
            </ul>
          </Step>

          <Step icon={RefreshCw} title="4. Update (When a new version comes)">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                New version available? Open the website again in Chrome and download the new APK —{' '}
                <strong>no need to uninstall the app</strong>, it installs over the old one and
                your data stays.
              </li>
              <li>
                While inside the app, you&apos;ll see a <strong>green banner</strong>: &quot;Update available —
                vX.Y.Z&quot; showing the new version. Tap <strong>Update</strong> to download directly.
              </li>
              <li>
                You can check your version on the login page: <em>&quot;Genz Messenger Android vX.Y.Z&quot;</em>.
              </li>
            </ul>
          </Step>

          <a
            href="/genz-whatsapp.apk"
            download="genz-whatsapp.apk"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00a884] py-3 font-bold text-white hover:bg-[#00c795] transition-colors"
          >
            <Download size={18} />
            Download Android App
          </a>
          <p className="text-center text-xs text-slate-500">
            Android only — for now. iOS is coming soon.
          </p>
          <ReleaseUptake className="mt-3 text-center text-[10px] text-slate-600" />
        </div>
      </div>
    </div>
  );
};

export default InstallGuide;
