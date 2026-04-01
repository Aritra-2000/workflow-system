"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email"|"otp"|"done">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function requestOtp() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error('Failed to request OTP');
      setStep('otp');
      toast.success('OTP sent to your email!');
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Something went wrong';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      if (!res.ok) throw new Error('Invalid OTP');
      
      // Save the user's email to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('userEmail', email);
      }
      
      setStep('done');
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Something went wrong';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <main className="min-h-dvh bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-3xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
              {step === 'email' ? 'Welcome Back' : 'Verify Your Email'}
            </h1>
            <p className="text-gray-500 text-sm">
              {step === 'email' 
                ? 'Enter your email to receive a one-time password' 
                : `We sent a code to ${email}`
              }
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Email Step */}
          {step === 'email' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pl-11 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-gray-800 placeholder:text-gray-400"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    onKeyPress={(e) => e.key === 'Enter' && !loading && email.includes('@') && requestOtp()}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>
              </div>
              <button
                className="group w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
                onClick={requestOtp}
                disabled={loading || !email.includes('@')}
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    Send OTP
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  One-Time Password
                </label>
                <div className="relative">
                  <input
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pl-11 tracking-[0.5em] text-center text-2xl font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-gray-800"
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                    maxLength={6}
                    onKeyPress={(e) => e.key === 'Enter' && !loading && otp.length === 6 && verifyOtp()}
                    autoFocus
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Check your email for the 6-digit code
                </p>
              </div>
              <button
                className="group w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
                onClick={verifyOtp}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                    Verifying...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Verify & Sign In
                  </>
                )}
              </button>
              <button
                onClick={() => { setStep('email'); setOtp(''); setError(null); }}
                className="w-full text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors py-2"
              >
                ← Back to email
              </button>
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t-2 border-gray-100">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secured with passwordless authentication</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}