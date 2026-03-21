'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, GraduationCap, Eye, EyeOff } from 'lucide-react';
import { ConceptGraphIcon } from '@/components/svg/ConceptGraphIcon';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, error } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      // Route based on role detected from email
      if (email.includes('student')) {
        router.push('/student');
      } else {
        router.push('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'instructor' | 'student') => {
    setLoading(true);
    try {
      await login(
        role === 'instructor' ? 'smith@umich.edu' : 'student@umich.edu',
        'demo'
      );
      router.push(role === 'instructor' ? '/dashboard' : '/student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00274C] via-[#0a3260] to-[#1B365D] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 text-white text-2xl font-semibold">
            <ConceptGraphIcon size={32} className="text-white" />
            PreReq
          </div>
          <p className="text-white/50 text-sm mt-2">Sign in to your account</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#4A5568] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@umich.edu"
                className="w-full px-4 py-2.5 border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00274C]/20 focus:border-[#00274C] text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A5568] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00274C]/20 focus:border-[#00274C] text-sm pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#4A5568]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Sign In
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#E2E8F0]" />
            <span className="text-xs text-[#94A3B8]">or try a demo</span>
            <div className="flex-1 h-px bg-[#E2E8F0]" />
          </div>

          {/* Demo buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDemoLogin('instructor')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors text-sm font-medium text-[#00274C]"
            >
              <ShieldCheck className="w-4 h-4 text-[#FFCB05]" />
              Instructor Demo
            </button>
            <button
              onClick={() => handleDemoLogin('student')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors text-sm font-medium text-[#00274C]"
            >
              <GraduationCap className="w-4 h-4 text-[#3B82F6]" />
              Student Demo
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          Students can also access reports via tokenized links shared by instructors.
        </p>
      </div>
    </div>
  );
}
