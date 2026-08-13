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
            <p className="text-xs text-blue-100/60">Jinsi ya kusakinisha app kwenye Android</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#00a884]/30 bg-[#00a884]/10 p-4 text-sm text-emerald-100">
            <p className="font-semibold mb-1">📱 Hakuna Play Store — download moja kwa moja kupitia Chrome</p>
            <p>
              GENZ inasambazwa kama <strong>APK</strong> inayopakuliwa moja kwa moja kutoka kwenye tovuti.
              Hii inamaanisha update zetu zinakuja haraka, bila kusubiri review ya Play Store.
              We don&apos;t use the Play Store — the app is a direct download from our site.
            </p>
          </div>

          <Step icon={Download} title="1. Pakua APK (Download the APK)">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Fungua tovuti ya GENZ kwenye <strong>Chrome</strong> kwenye simu yako ya Android.
              </li>
              <li>
                Bonyeza kitufe cha <strong>Download Android App</strong> kwenye login page.
              </li>
              <li>
                Chrome itaonyesha onyo: <em>&quot;This type of file can harm your device&quot;</em> —
                hili ni onyo la kawaida kwa APK zote zisizo za Play Store. Bonyeza <strong>OK</strong>.
              </li>
            </ul>
          </Step>

          <Step icon={ShieldAlert} title="2. Ruhusu Chrome kusakinisha (Allow unknown sources)">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Baada ya download, bonyeza notification ya <strong>genz-whatsapp.apk</strong>.
              </li>
              <li>
                Ikiwa Android inauliza <em>&quot;Allow from this source?&quot;</em> — bonyeza{' '}
                <strong>Allow / Ruhusu</strong>. Hii inaruhusu Chrome tu kusakinisha app.
              </li>
              <li>
                Ukiona <em>&quot;Play Protect doesn&apos;t recognize this app&apos;s developer&quot;</em> —
                bonyeza <strong>More details → Install anyway</strong>. App yetu ni salama na imesainiwa
                na keystore halisi; onyo hili linatokea kwa app yoyote nje ya Play Store.
              </li>
            </ul>
          </Step>

          <Step icon={Smartphone} title="3. Fungua app (Open the app)">
            <ul className="list-disc pl-5 space-y-1">
              <li>Baada ya install, bonyeza <strong>Open</strong> au tafuta icon ya GENZ kwenye nyumbani.</li>
              <li>Ingia na namba yako ya simu na nenosiri — data yako itasawazishwa moja kwa moja.</li>
              <li>Ruhusu notification ili upate ujumbe na simu hata app ikiwa imefungwa.</li>
            </ul>
          </Step>

          <Step icon={RefreshCw} title="4. Update (When a new version comes)">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Kuna version mpya? Fungua tovuti tena kwenye Chrome na pakua APK mpya —{' '}
                <strong>hakuna haja ya kufuta app</strong>, inasakinishwa juu ya ile ya zamani na
                data yako inabaki.
              </li>
              <li>
                Ukitoka ndani ya app, utaona <strong>banner ya kijani</strong>: &quot;Update available —
                vX.Y.Z&quot; ikionyesha version mpya. Bonyeza <strong>Update</strong> kupakua moja kwa moja.
              </li>
              <li>
                Unaweza kuangalia version yako kwenye login page: <em>&quot;GENZ WhatsApp Android vX.Y.Z&quot;</em>.
              </li>
            </ul>
          </Step>

          <a
            href="https://github.com/benivanny14/Genz-whatsapp/releases/latest/download/genz-whatsapp.apk"
            download="genz-whatsapp.apk"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00a884] py-3 font-bold text-white hover:bg-[#00c795] transition-colors"
          >
            <Download size={18} />
            Download Android App
          </a>
          <a
            href="/genz-whatsapp.apk"
            download="genz-whatsapp.apk"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors"
          >
            <Download size={18} />
            Same-origin download (kama server ipo / if the server is up)
          </a>
          <p className="text-center text-xs text-slate-500">
            Android tu — kwa sasa. iPhone inakuja karibuni. / Android only — iOS is coming soon.
          </p>
          <ReleaseUptake className="mt-3 text-center text-[10px] text-slate-600" />
        </div>
      </div>
    </div>
  );
};

export default InstallGuide;
