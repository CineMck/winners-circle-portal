import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS Terms & Opt-In Policy | Winner's Circle",
  description:
    "SMS messaging program terms, opt-in policy, and opt-out instructions for The Winners Circle member portal.",
};

const EFFECTIVE_DATE = "July 6, 2026";
const COMPANY = "Neu Luma LLC";
const CONTACT_EMAIL = "privacy@neuluma.com";

export default function SmsPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-neutral-800">
      <h1 className="mb-2 text-3xl font-semibold">SMS Terms &amp; Opt-In Policy</h1>
      <p className="mb-8 text-sm text-neutral-500">Effective {EFFECTIVE_DATE}</p>

      <section className="space-y-4 leading-relaxed">
        <h2 className="mt-8 text-xl font-semibold">Program Description</h2>
        <p>
          The Winners Circle (operated by {COMPANY}) sends text messages to members and
          event registrants who have opted in. Messages include live-call reminders,
          event announcements, membership updates, and occasional promotional offers
          related to The Winners Circle mastermind community.
        </p>

        <h2 className="mt-8 text-xl font-semibold">How You Opt In</h2>
        <p>Consent is collected exclusively through the following methods:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Account signup.</strong> When creating an account at
            winnerscircleportal.com/signup and providing a phone number, users may check
            an optional box labeled: <em>&ldquo;Text me updates from The Winners Circle
            (call reminders, announcements). Msg &amp; data rates may apply. Reply STOP
            anytime to opt out.&rdquo;</em> The box is unchecked by default.
          </li>
          <li>
            <strong>Profile settings.</strong> Signed-in members can enable or disable
            the same consent at any time from Profile → Settings → Text Updates.
          </li>
          <li>
            <strong>Event registration.</strong> When registering for a live mastermind
            call at winnerscircleportal.com/real-estate, registrants may check an
            optional SMS-reminder consent box. The box is unchecked by default.
          </li>
        </ul>
        <p>
          Consent to receive text messages is <strong>not</strong> a condition of
          purchasing any membership, good, or service. We never send marketing texts to
          anyone who has not opted in through one of the methods above.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Message Frequency &amp; Rates</h2>
        <p>
          Message frequency varies (typically 1&ndash;8 messages per month). Message and
          data rates may apply according to your mobile carrier plan.
        </p>

        <h2 className="mt-8 text-xl font-semibold">How to Opt Out</h2>
        <p>
          Reply <strong>STOP</strong> to any message to unsubscribe at any time. After
          texting STOP, you will receive one final confirmation message and no further
          texts. You can also disable text updates in Profile → Settings, or email us at{" "}
          {CONTACT_EMAIL}. Reply <strong>HELP</strong> for help or contact{" "}
          {CONTACT_EMAIL}.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Privacy</h2>
        <p>
          Phone numbers and SMS consent status are used solely to deliver the messages
          described above. <strong>No mobile information will be shared with third
          parties or affiliates for marketing or promotional purposes.</strong> Text
          messaging originator opt-in data and consent will not be shared with any third
          parties, except for vendors and aggregators that enable message delivery (e.g.
          Twilio). See our{" "}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>{" "}
          for full details.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Contact</h2>
        <p>
          {COMPANY} · The Winners Circle · {CONTACT_EMAIL}
        </p>
      </section>
    </main>
  );
}
