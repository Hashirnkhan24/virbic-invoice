import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Create your free account</h2>
        <p className="text-sm text-slate-400 mt-1">Start sending professional invoices in minutes.</p>
      </div>
      <SignUp />
    </div>
  );
}
