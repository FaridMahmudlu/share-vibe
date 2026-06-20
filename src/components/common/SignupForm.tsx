import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/client';
import { z } from 'zod';

const signupInputSchema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta adresi giriniz.'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.'),
});

interface SignupFormProps {
  onSignupSuccess: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side Validation
    const validationResult = signupInputSchema.safeParse({ email, password });
    if (!validationResult.success) {
      setError(validationResult.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const signupFn = httpsCallable(functions, 'signup');
      await signupFn({ email, password });
      
      setSuccess('Hesabınız başarıyla oluşturuldu! Giriş yapabilirsiniz.');
      setEmail('');
      setPassword('');
      setTimeout(() => {
        onSignupSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('Kayıt hatası:', err);
      // Clean error message ensuring no stack traces or file paths are shown
      const cleanMessage = err.message || 'Kayıt işlemi sırasında beklenmeyen bir hata oluştu.';
      setError(cleanMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs font-semibold">
          {success}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-cafe-100/60 mb-2">
          E-posta Adresi
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="w-full bg-[#1b120d]/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-cafe-50 placeholder-cafe-100/30 focus:outline-none focus:border-[color:var(--color-accent)] transition-colors"
          placeholder="email@example.com"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-cafe-100/60 mb-2">
          Şifre
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          className="w-full bg-[#1b120d]/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-cafe-50 placeholder-cafe-100/30 focus:outline-none focus:border-[color:var(--color-accent)] transition-colors"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-4 inline-flex items-center justify-center rounded-xl bg-[color:var(--color-accent)] px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
      >
        {loading ? 'Kaydediliyor...' : 'Hesap Oluştur'}
      </button>
    </form>
  );
};

export default SignupForm;
