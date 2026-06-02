import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Winner's Circle",
  description: "Terms of Service for the Winner's Circle member portal and mobile apps.",
};

const EFFECTIVE_DATE = "June 2, 2026";
const CONTACT_EMAIL = "support@neuluma.com";
const COMPANY = "Neu Luma LLC";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-neutral-800">
      <h1 className="mb-2 text-3xl font-semibold">Terms of Service</h1>
      <p className="mb-8 text-sm text-neutral-500">Effective {EFFECTIVE_DATE}</p>

      <section className="space-y-4 leading-relaxed">
        <p>
          These Terms govern your use of the Winner&apos;s Circle member portal and
          mobile applications (the &ldquo;Service&rdquo;) operated by {COMPANY}. By
          creating an account or using the Service, you agree to these Terms.
        </p>

        <h2 className="mt-8 text-xl font-semibold">1. Eligibility</h2>
        <p>You must be at least 18 years old and able to enter into a binding contract.</p>

        <h2 className="mt-8 text-xl font-semibold">2. Membership and Payments</h2>
        <p>
          Paid memberships are billed in advance on a recurring basis through Stripe and
          renew automatically until cancelled. You can cancel at any time through your
          account; access continues until the end of the paid period.
        </p>

        <h2 className="mt-8 text-xl font-semibold">3. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Violate any law or third-party right.</li>
          <li>Harass, threaten, or harm other members.</li>
          <li>Share another member&apos;s personal information without consent.</li>
          <li>Attempt to disrupt, reverse-engineer, or scrape the Service.</li>
          <li>Use the Service to send spam or unsolicited marketing.</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">4. Content</h2>
        <p>
          You retain ownership of content you post. You grant us a non-exclusive,
          worldwide license to host, display, and distribute that content as needed to
          operate the Service. You are responsible for what you post.
        </p>

        <h2 className="mt-8 text-xl font-semibold">5. Termination</h2>
        <p>
          We may suspend or terminate accounts that violate these Terms. You may close
          your account at any time.
        </p>

        <h2 className="mt-8 text-xl font-semibold">6. Disclaimer</h2>
        <p>
          The Service is provided &ldquo;as is.&rdquo; To the maximum extent permitted by
          law, we disclaim all warranties, express or implied, including merchantability,
          fitness for a particular purpose, and non-infringement. Content shared in the
          community is for informational purposes and is not professional advice.
        </p>

        <h2 className="mt-8 text-xl font-semibold">7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, {COMPANY}&apos;s aggregate liability is
          limited to the amount you paid us in the 12 months preceding the claim. We are
          not liable for indirect, incidental, or consequential damages.
        </p>

        <h2 className="mt-8 text-xl font-semibold">8. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of your principal place of
          residence within the United States, without regard to conflict-of-laws rules.
        </p>

        <h2 className="mt-8 text-xl font-semibold">9. Changes</h2>
        <p>
          We may update these Terms; continued use of the Service after we post the
          updates constitutes acceptance.
        </p>

        <h2 className="mt-8 text-xl font-semibold">10. Contact</h2>
        <p>
          Questions? Email{" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </main>
  );
}
