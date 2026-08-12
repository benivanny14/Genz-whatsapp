import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
    <h2 className="text-base font-bold text-white mb-2">{title}</h2>
    <div className="space-y-2 text-sm text-blue-100/80 leading-relaxed">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
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
            <h1 className="text-xl font-bold">Privacy Policy</h1>
            <p className="text-xs text-blue-100/60">Last updated: {updated}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold mb-1">⚠️ Important — End-to-end encryption</p>
            <p>
              GENZ WhatsApp is currently in beta. <strong>End-to-end encryption (E2EE) is not yet
              implemented</strong>. Messages, media and call metadata are stored and transmitted
              through our servers so we can sync your chat history across devices. Do not use the
              app to share information you require guaranteed end-to-end protection for.
            </p>
          </div>

          <Section title="1. Information we collect">
            <p>We collect information needed to operate the service, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account details: phone number, username, profile photo, and about text.</li>
              <li>Messaging data: conversations, messages, reactions, status updates, and media you share.</li>
              <li>Device and usage data: linked devices, online presence, call history, and settings.</li>
              <li>Technical logs: IP address, browser/device type, and error reports (via Sentry when enabled).</li>
            </ul>
          </Section>

          <Section title="2. How we use your information">
            <p>We use your information to provide, maintain and improve the service:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Delivering messages, calls, statuses, and notifications in real time.</li>
              <li>Syncing your chats and settings across your devices.</li>
              <li>Security: fraud detection, abuse reporting, and protecting against spam or misuse.</li>
              <li>Support: responding to help requests and troubleshooting.</li>
            </ul>
          </Section>

          <Section title="3. Data sharing">
            <p>We do not sell your personal data. We share data only as needed to run the service:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Media files are stored with our cloud storage provider (Cloudinary) in production.</li>
              <li>Abuse reports (including priority "urgent" CSAM reports) are visible to moderators and admins so they can act.</li>
              <li>We may disclose information where required by law or to protect the safety and rights of users.</li>
            </ul>
          </Section>

          <Section title="4. Data retention">
            <p>
              Messages and media are retained so your history syncs across devices. You can export
              your account information from Settings, and you may delete your account at any time
              from Settings → Account, which permanently erases your account and data. Online
              presence history older than 30 days is automatically pruned.
            </p>
          </Section>

          <Section title="5. Your choices">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Privacy settings:</strong> control who sees your last seen, online status, profile photo, about, status, and who can add you to groups.</li>
              <li><strong>Blocking:</strong> block or unblock contacts at any time.</li>
              <li><strong>Data export:</strong> request your account information from Settings → Account.</li>
              <li><strong>Deletion:</strong> delete your account from Settings → Account.</li>
            </ul>
          </Section>

          <Section title="6. Children's safety">
            <p>
              The service is not intended for children under 13. If you believe a child has used the
              service or that content involving a minor is being shared, report it immediately using
              the in-app report feature — reports flagged as child sexual abuse material (CSAM) are
              escalated as <strong>urgent</strong>.
            </p>
          </Section>

          <Section title="7. Security">
            <p>
              We apply industry-standard safeguards: password hashing, two-factor authentication,
              rate limiting, and access controls. However, no method of transmission or storage is
              100% secure. Because E2EE is not yet enabled, data is readable by the service — please
              keep this in mind when sharing sensitive information.
            </p>
          </Section>

          <Section title="8. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. Continued use of the app after
              changes are posted constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="9. Contact us">
            <p>
              For privacy questions or to exercise your data rights, contact support through the app
              (Settings → Help → Help center).
            </p>
          </Section>

          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-blue-100/50">
            <ShieldCheck size={14} className="text-[#00a884]" />
            <span>GENZ WhatsApp — Privacy Policy · {updated}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
