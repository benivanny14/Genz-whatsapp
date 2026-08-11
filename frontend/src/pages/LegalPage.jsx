import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, Users } from 'lucide-react';

const docs = {
  terms: {
    title: 'Masharti ya Matumizi',
    icon: FileText,
    sections: [
      { h: '1. Kukubali Masharti', p: 'Kwa kutumia GENZ WhatsApp unakubali masharti haya. Usipotumia, usitumie app. Tunahifadhi haki ya kubadilisha masharti; mabadiliko makubwa yatatangazwa ndani ya app.' },
      { h: '2. Umri', p: 'App hii imekusudiwa watumiaji wenye umri wa miaka 13 na kuendelea. Watumiaji wenye umri kati ya 13 na 18 wanahitaji ridhaa ya mzazi au mlezi. Usijisajili ukiwa chini ya miaka 13.' },
      { h: '3. Matumizi Yanayoruhusiwa', p: 'Unakubali kutumia app kwa mawasiliano halali tu. Haramu ni: kutuma maudhui haramu, kuudhi, kuvunja hakimiliki, kutuma spam, kudanganya, au kutumia app kwa shughuli haramu.' },
      { h: '4. Account Yako', p: 'Wewe unawajibika kwa usalama wa password na account yako. Tutumie mara moja ukiona matumizi yasiyoruhusiwa. Tunaweza kusimamisha account inayokiuka masharti.' },
      { h: '5. Malipo', p: 'Baadhi ya features zinaweza kuwa za kulipwa (subscription). Malipo yanashughulikiwa na watoa huduma wa nje; hatuhifadhi taarifa za kadi yako.' },
      { h: '6. Hakimiliki', p: 'GENZ WhatsApp ni mali yetu. Hupaswi kunakili, kubadilisha, au kuuza app au sehemu zake bila idhini.' },
      { h: '7. Kukomesha', p: 'Unaweza kufuta account yako wakati wowote. Tunaweza kukomesha huduma kwa watumiaji wanaokiuka masharti au sheria.' },
      { h: '8. Kukataliwa kwa Dhima', p: 'App inatolewa "kama ilivyo". Hatutawajibika kwa uharibifu usiotokana na makusudi yetu. Tunajitahidi kuhakikisha huduma inafanya kazi, lakini hatuthibitishi kwamba haitakoma kamwe.' }
    ]
  },
  privacy: {
    title: 'Sera ya Faragha',
    icon: Shield,
    sections: [
      { h: '1. Taarifa Tunazokusanya', p: 'Tunakusanya: jina la mtumiaji, namba ya simu, picha ya profile, ujumbe na media unazotuma, statuses, taarifa ya mawasiliano (nani anawasiliana na nani na saa ngapi), na taarifa za kifaa (aina ya browser, mfumo).' },
      { h: '2. Ujumbe na Usimbaji (Encryption)', p: 'Text messages za mtu kwa mtu (1:1) zinajaribu kusimbwa kwa njia ya end-to-end (E2EE) kwenye device zako wakati keys zinapatikana. HATA HIVYO: media (picha, video, voice), messages za group, na messages zinapotumwa bila keys hazijafichwa — server inaziona. Usitume taarifa nyeti sana ambazo hutaki mtu mwingine aone.' },
      { h: '3. Metadata', p: 'Tunaona na kuhifadhi taarifa kama nani alimtumia nani ujumbe na saa ngapi (metadata). Hii inatusaidia kufanya huduma ifanye kazi na kudhibiti matumizi mabaya.' },
      { h: '4. Keys za Encryption', p: 'Public keys zako zinahifadhiwa kwenye server zetu; private key yako inabaki kwenye device yako. Kwa sababu server inashikilia public keys, tusisitize kwamba usalama wa E2EE unategemea uadilifu wa mfumo wetu.' },
      { h: '5. Media na Hifadhi', p: 'Media unazotuma zinahifadhiwa kwenye server zetu (au watoa huduma wa nje kama Cloudinary) ili zipokewe na wapokeaji. Backups zako zinasimbwa kwa AES-256.' },
      { h: '6. Statuses', p: 'Statuses zako zinaweza kuonekana kulingana na mipangilio yako ya faragha (kila mtu, marafiki, watu maalum, au wewe pekee). Status za "everyone" zinaweza kuonekana kwa mtu yeyote mwenye link.' },
      { h: '7. Kudhibiti Data Yako', p: 'Unaweza kufuta ujumbe, statuses, na account yako. Unaweza kuomba data yako kupitia mipangilio. Hatutauza taarifa zako binafsi.' },
      { h: '8. Watumiaji Wachanga', p: 'Tunachukua faragha ya vijana kwa uzito. Ikiwa unaamini mtoto chini ya 13 ametumia app hii, wasiliana nasi ili tufute data.' },
      { h: '9. Cookies na Huduma za Nje', p: 'Tunatumia teknolojia za hifadhi ya ndani (localStorage, IndexedDB) kwa utendaji. Huduma za nje (kama Sentry kwa ripoti za makosa) zinaweza kukusanya taarifa za kiufundi tu.' }
    ]
  },
  guidelines: {
    title: 'Miongozo ya Jamii',
    icon: Users,
    sections: [
      { h: '1. Weka Heshima', p: 'Gen Z wanastahili mazingira salama. Usiudhike, usitishie, wala usiwanyanyase wengine — hata kwa utani.' },
      { h: '2. Hakuna Uchi au Maudhui ya Kimapenzi ya Watoto', p: 'Uchi wa watoto (CSAM) ni HARAMU kabisa na unaripotiwa kwa mamlaka. Pia tunakataza uchi wa watu wazima usioruhusiwa, na maudhui ya kutumia nguvu.' },
      { h: '3. Hakuna Unyanyasaji', p: 'Usiwanyanyase watu kwa rangi, jinsia, dini, ulemavu, au mapenzi. Unyanyasaji unaorudiwa unaweza kusababisha kufutwa kwa account.' },
      { h: '4. Usishare Taarifa za Kibinafsi za Wengine', p: 'Usishare anwani, namba za simu, picha za faragha, au taarifa za kibinafsi za mtu mwingine bila ridhaa yake (doxxing).' },
      { h: '5. Hakuna Udukuzi au Spam', p: 'Usitume ujumbe wa spam, virusi, scams, au viungo hatari. Usijaribu kudukua account za wengine.' },
      { h: '6. Taarifa za Uongo', p: 'Usishare taarisha za uongo zenye madhara (fake news) kuhusu afya, usalama, au dharura. Fikiria kabla ya kupeleka mbele (forward).' },
      { h: '7. Ripoti Matatizo', p: 'Ukipata maudhui au tabia inayovunja miongozo hii, ripoti kupitia chaguo la "Report" kwenye message, status, au profile. Timu yetu inachunguza ripoti zote.' },
      { h: '8. Matokeo ya Ukiukaji', p: 'Ukiukaji unaweza kusababisha onyo, kusimamishwa kwa muda, au kufutwa kabisa kwa account. Ukiukaji mkubwa (kama CSAM) unaripotiwa kwa mamlaka.' }
    ]
  }
};

const LegalPage = () => {
  const { doc } = useParams();
  const current = docs[doc];
  if (!current) return <Navigate to="/legal/terms" replace />;

  const Icon = current.icon;

  return (
    <div className="min-h-screen bg-[#0b141a] text-white">
      <header className="sticky top-0 bg-[#111b21] border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <Link to="/login" className="text-[#00a884] hover:text-[#00c98f] p-2 -ml-2" aria-label="Back">
          <ArrowLeft size={22} />
        </Link>
        <Icon size={20} className="text-[#00a884]" />
        <h1 className="font-semibold text-lg">{current.title}</h1>
        <nav className="ml-auto flex gap-1 text-xs">
          {Object.keys(docs).map((key) => (
            <Link
              key={key}
              to={`/legal/${key}`}
              className={`px-3 py-1.5 rounded-full transition-colors ${
                key === doc ? 'bg-[#00a884] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {key === 'terms' ? 'Masharti' : key === 'privacy' ? 'Faragha' : 'Miongozo'}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <p className="text-white/50 text-xs">Mwisho kusasishwa: {new Date().toLocaleDateString()}</p>
        {current.sections.map((s) => (
          <section key={s.h} className="bg-[#111b21] rounded-xl p-5 border border-white/5">
            <h2 className="font-semibold text-[#00a884] mb-2">{s.h}</h2>
            <p className="text-white/80 text-sm leading-relaxed">{s.p}</p>
          </section>
        ))}
        <p className="text-white/40 text-xs text-center pb-8">
          Maswali yoyote kuhusu faragha au usalama? Wasiliana nasi kupitia app → Mipangilio → Saidia.
        </p>
      </main>
    </div>
  );
};

export default LegalPage;
