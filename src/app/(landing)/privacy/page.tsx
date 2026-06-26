import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, HelpCircle, FileText, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - Virbic',
  description: 'Learn how Virbic collects, uses, and protects your personal and business data when using our invoicing and WhatsApp services.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'June 26, 2026';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200">
      {/* Top Banner / Header */}
      <div className="border-b border-slate-200/80 dark:border-slate-900 bg-white dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-emerald-500 transition-colors gap-1.5"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
            Back to Home
          </Link>
          <div className="flex items-center gap-1.5 font-extrabold text-sm text-slate-900 dark:text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Virbic
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Page Title Header */}
        <div className="text-center mb-16">
          <div className="inline-flex p-3 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-4 border border-emerald-500/20">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Core Layout with Sidebar Summary and Main Text */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Quick Info Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-900 shadow-sm sticky top-24">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight mb-4 flex items-center gap-2">
                <Lock className="w-4.5 h-4.5 text-emerald-500" />
                Privacy Highlights
              </h3>
              <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Zero-spam policy</strong>: We strictly respect WhatsApp opt-outs (reply STOP to unsubscribe).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Secure Screenshots</strong>: Submitted payment proofs are encrypted and reviewed strictly for verification.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>No selling data</strong>: We never sell or share your business data to external marketers.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Main Privacy Body */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl border border-slate-200/60 dark:border-slate-900 shadow-sm space-y-8">
            
            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-emerald-500 font-mono">1.</span> Information We Collect
              </h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                When you register, create invoices, or submit payment verifications on Virbic, we process specific personal and business details to deliver our services. This includes:
              </p>
              <ul className="list-disc list-inside pl-4 text-xs md:text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
                <li><strong>Account Registration Data</strong>: Name, email address, and profile picture (retrieved via Clerk Authentication).</li>
                <li><strong>Business & Invoicing Profiles</strong>: Business name, billing address, GSTIN, PAN, bank account details, and UPI ID.</li>
                <li><strong>Client Contact Details</strong>: Name, email, and phone number of clients added to your registry.</li>
                <li><strong>Payment Verification Evidence</strong>: Screenshots of transaction completions and UTR reference numbers submitted by clients.</li>
                <li><strong>WhatsApp Message Activity</strong>: Inbound text messages, replies, and receipts sent/received using the Meta Cloud API.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-emerald-500 font-mono">2.</span> How We Use Your Data
              </h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                We collect and process your information solely to facilitate seamless invoicing, including:
              </p>
              <ul className="list-disc list-inside pl-4 text-xs md:text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
                <li>Generating customized tax-compliant invoices and portals.</li>
                <li>Delivering invoice payment links to clients automatically via WhatsApp and Email.</li>
                <li>Processing client payment confirmation screenshots using automated AI-OCR parsing.</li>
                <li>Dispatching payment receipts and notifying freelancers when proofs are submitted or approved.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-emerald-500 font-mono">3.</span> Webhooks & Third-Party Processors
              </h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                To run our platform integrations, we transmit data to specialized third-party services. We ensure these partners adhere to strict confidentiality guidelines:
              </p>
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-900 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <p><strong>Meta Platforms, Inc. (WhatsApp Business API)</strong>: Sends outbound notifications, receives inbound media webhooks, and downloads invoice screenshots for OCR parsing.</p>
                <p><strong>Clerk Inc.</strong>: Manages secure user authentication, signup flows, and account credentials.</p>
                <p><strong>Razorpay Software Ltd.</strong>: Handles secure client credit/debit card payments, UPI transfers, and payment gateway webhooks.</p>
                <p><strong>Resend Inc. (SMTP)</strong>: Delivers automated onboarding, receipt emails, and reminder updates.</p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-emerald-500 font-mono">4.</span> Opt-Out Policy (WhatsApp Compliance)
              </h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                In strict compliance with Meta Policy and local regulations regarding unsolicited communications, clients receive messages only for pending payments they owe. Clients can instantly opt out of WhatsApp notifications by replying with <strong>"STOP"</strong>. Once opted out, automated delivery to that phone number is immediately suspended.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-emerald-500 font-mono">5.</span> Security & Retention
              </h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                All client-submitted screenshots, PDF invoices, and account credentials are saved using secure, SSL-encrypted transport protocols. We retain your information as long as your Virbic account remains active or to comply with accounting, legal, and financial reporting standards.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-emerald-500 font-mono">6.</span> Your Rights & Contact Details
              </h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                You retain complete control of your data. You may request copies, modifications, or complete deletion of your personal details, business profiles, and history at any time.
              </p>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                For questions, support, or privacy-related requests, please contact us at:
                <span className="block font-bold text-slate-900 dark:text-white mt-1.5">Email: support@virbic.com</span>
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
