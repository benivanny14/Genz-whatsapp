import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
    <h2 className="text-base font-bold text-white mb-2">{title}</h2>
    <div className="space-y-2 text-sm text-blue-100/80 leading-relaxed">{children}</div>
  </section>
);

const TermsOfService = () => {
  const updated = 'August 2026';
  return (
    <div className="min-h-screen bg-[#0b141a] text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/settings"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Back to settings"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Terms of Service</h1>
            <p className="text-xs text-blue-100/60">Last updated: {updated}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold mb-1">⚠️ Beta software disclaimer</p>
            <p>
              GENZ WhatsApp is provided as a <strong>beta</strong> service. End-to-end encryption is
              <strong> not yet implemented</strong> — data is readable by the service. Features may
              change, and the service is provided "as is" without warranties of any kind. By using
              the app you accept these terms and the accompanying{' '}
              <Link to="/privacy-policy" className="text-[#00a884] underline">Privacy Policy</Link>.
            </p>
          </div>

          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using GENZ WhatsApp, you agree to be bound by these Terms and our
              Privacy Policy. If you do not agree, please do not use the app.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>You must be at least 13 years old to use the service. By registering, you confirm you meet this requirement and that the information you provide is accurate.</p>
          </Section>

          <Section title="3. Use of the Service">
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the service for lawful, personal purposes only.</li>
              <li>Do not send spam, malware, or unsolicited bulk messages.</li>
              <li>Do not attempt unauthorized access, interfere with other users, or disrupt the service.</li>
              <li>Do not share content that is illegal, defamatory, or infringes on others' rights — including child sexual abuse material (CSAM), which is escalated as an urgent report.</li>
              <li>Do not reverse engineer, scrape, or resell access to the service.</li>
            </ul>
          </Section>

          <Section title="4. Accounts and security">
            <p>
              You are responsible for safeguarding your account credentials and for all activity
              under your account. Enable two-factor authentication to protect your account. Notify
              us immediately if you suspect unauthorized access. We may suspend or terminate accounts
              that violate these Terms.
            </p>
          </Section>

          <Section title="5. Privacy and data">
            <p>
              We collect and process data as described in our{' '}
              <Link to="/privacy-policy" className="text-[#00a884] underline">Privacy Policy</Link>.
              Messages are stored and synced to provide seamless chat history across devices. Because
              end-to-end encryption is not yet enabled, treat the service as not suitable for
              communications requiring guaranteed confidentiality.
            </p>
          </Section>

          <Section title="6. Acceptable use and reporting">
            <p>
              If you encounter abuse, spam, or harmful content, use the in-app report feature. CSAM
              reports are automatically escalated to the highest priority for moderator review. We
              may remove content or accounts that violate these Terms.
            </p>
          </Section>

          <Section title="7. Intellectual property">
            <p>
              The GENZ WhatsApp name, branding, and interface are the property of the service
              operator. You retain ownership of the content you share, and you grant us a limited
              license to store and transmit it solely to operate the service.
            </p>
          </Section>

          <Section title="8. Termination">
            <p>
              You may delete your account at any time from Settings → Account. We may suspend or
              terminate access for violations of these Terms. Upon termination, your data is
              permanently erased from our systems.
            </p>
          </Section>

          <Section title="9. Disclaimer of warranties">
            <p>
              The service is provided "as is" and "as available" without warranties of any kind,
              express or implied. We do not warrant that the service will be uninterrupted,
              error-free, or secure. Beta features may change or be removed without notice.
            </p>
          </Section>

          <Section title="10. Limitation of liability">
            <p>
              To the maximum extent permitted by law, the service operator shall not be liable for
              indirect, incidental, special, consequential, or punitive damages, or for any loss of
              data, arising from your use of the service.
            </p>
          </Section>

          <Section title="11. Changes to these Terms">
            <p>
              We may update these Terms from time to time. Continued use of the app after changes
              are posted constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              Questions about these Terms? Contact support through the app (Settings → Help → Help center).
            </p>
          </Section>

          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-blue-100/50">
            <FileText size={14} className="text-[#00a884]" />
            <span>GENZ WhatsApp — Terms of Service · {updated}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
