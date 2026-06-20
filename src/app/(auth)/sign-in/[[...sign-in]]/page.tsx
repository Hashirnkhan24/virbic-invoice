import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Sign in to your account</h2>
        <p className="text-sm text-slate-400 mt-1">Welcome back — pick up right where you left off.</p>
      </div>
      <SignIn />
    </div>
  );
}
