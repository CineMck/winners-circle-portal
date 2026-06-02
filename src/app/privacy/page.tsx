import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Winner's Circle",
  description: "Privacy policy for the Winner's Circle member portal and mobile apps.",
};

const EFFECTIVE_DATE = "June 2, 2026";
const CONTACT_EMAIL = "privacy@neuluma.com";
const COMPANY = "Neu Luma LLC";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-neutral-800">
      <h1 className="mb-2 text-3xl font-semibold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-neutral-500">Effective {EFFECTIVE_DATE}</p>

      <section className="space-y-4 leading-relaxed">
        <p>
          {COMPANY} (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates
          the Winner&apos;s Circle member portal and the Winner&apos;s Circle mobile
          applications (collectively, the &ldquo;Service&rdquo;). This Privacy Policy
          explains what information we collect, how we use it, and the choices you have.
        </p>

        <h2 className="mt-8 text-xl font-semibold">1. Information We Collect</h2>
        <p>We collect the following categories of information:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Account information.</strong> Name, email address, and password hash
            you provide when you create an account. We use Supabase as our authentication
            and database provider.
          </li>
          <li>
            <strong>Membership and billing information.</strong> When you subscribe, our
            payment processor Stripe collects and processes your payment method. We
            receive transaction metadata (last four digits, brand, status), but we do not
            store full card numbers.
          </li>
          <li>
            <strong>Content you submit.</strong> Profile details, posts, comments, and
            any messages you share within the portal.
          </li>
          <li>
            <strong>Device and usage information.</strong> Device type, operating system,
            app version, IP address, log timestamps, and pages viewed, used to operate and
            secure the Service.
          </li>
          <li>
            <strong>Push notification tokens.</strong> If you enable notifications, we
            store a device-specific token so we can deliver alerts. You can revoke this in
            your device settings at any time.
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">2. How We Use Information</h2>
        <ul className="ml-6 list-disc space-y-2">
          <li>To provide, maintain, and improve the Service.</li>
          <li>To process your membership, payments, and renewals.</li>
          <li>To send transactional messages about your account, billing, and the community.</li>
          <li>To respond to support requests and enforce our Terms of Service.</li>
          <li>To detect, prevent, and address fraud, abuse, or security incidents.</li>
          <li>To comply with legal obligations.</li>
        </ul>
        <p>We do not sell your personal information.</p>

        <h2 className="mt-8 text-xl font-semibold">3. Service Providers</h2>
        <p>We share data only with vendors who help us run the Service:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li><strong>Supabase</strong> — authentication, database, file storage.</li>
          <li><strong>Stripe</strong> — payment processing.</li>
          <li><strong>Railway</strong> — application hosting.</li>
          <li><strong>Apple and Google</strong> — app distribution and, if you opt in, push notification delivery.</li>
        </ul>
        <p>
          Each provider processes data under its own published terms and is contractually
          required to safeguard your information.
        </p>

        <h2 className="mt-8 text-xl font-semibold">4. Data Retention</h2>
        <p>
          We retain your account information while your membership is active and for up
          to 24 months after cancellation for billing, tax, and dispute-resolution
          purposes. You can request earlier deletion by emailing us at the address below.
        </p>

        <h2 className="mt-8 text-xl font-semibold">5. Your Rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, port,
          or delete your personal information, or to object to or restrict certain
          processing. To exercise these rights, contact us at{" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2 className="mt-8 text-xl font-semibold">6. Children&apos;s Privacy</h2>
        <p>
          The Service is intended for users 18 years of age and older. We do not knowingly
          collect personal information from children under 13. If we learn we have
          collected such information, we will delete it.
        </p>

        <h2 className="mt-8 text-xl font-semibold">7. Security</h2>
        <p>
          We use industry-standard safeguards including TLS in transit, encryption at
          rest via our hosting providers, and role-based access controls. No system is
          fully secure; please use a strong, unique password and notify us of any
          suspected unauthorized access.
        </p>

        <h2 className="mt-8 text-xl font-semibold">8. International Transfers</h2>
        <p>
          We operate in the United States and our providers may store data in the U.S.
          and other countries. By using the Service, you consent to the transfer of your
          information to these locations.
        </p>

        <h2 className="mt-8 text-xl font-semibold">9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will post
          the new effective date at the top and, for material changes, notify you within
          the Service or by email.
        </p>

        <h2 className="mt-8 text-xl font-semibold">10. Contact</h2>
        <p>
          Questions about this policy? Email{" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </main>
  );
}
