'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ConceptGraphIcon } from '@/components/svg/ConceptGraphIcon';
import { useAuth } from '@/lib/auth-context';

export default function TokenAccessPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const { loginWithToken, error } = useAuth();
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    if (!token) return;
    loginWithToken(token)
      .then(() => {
        router.push('/student');
      })
      .catch(() => {
        setValidating(false);
      });
  }, [token, loginWithToken, router]);

  if (validating && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a3260] to-[#1B365D] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 text-white text-xl font-semibold mb-8">
            <ConceptGraphIcon size={28} className="text-white" />
            PreReq
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#E8EEF4] flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-7 h-7 text-[#00274C] animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-[#00274C] mb-2">Validating your access link</h2>
            <p className="text-sm text-[#4A5568]">Please wait while we verify your credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a3260] to-[#1B365D] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center gap-2.5 text-white text-xl font-semibold mb-8">
          <ConceptGraphIcon size={28} className="text-white" />
          PreReq
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#FEF2F2] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-[#DC2626]" />
          </div>
          <h2 className="text-lg font-semibold text-[#00274C] mb-2">Invalid Access Link</h2>
          <p className="text-sm text-[#4A5568] mb-6">
            {error || 'This link is invalid or has expired. Please contact your instructor for a new link.'}
          </p>
          <button
            onClick={() => router.push('/login')}
            className="btn-primary"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}
