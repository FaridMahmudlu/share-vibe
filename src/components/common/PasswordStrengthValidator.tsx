import React, { useMemo } from 'react';

interface PasswordStrengthValidatorProps {
  password: string;
  onStrengthChange?: (isValid: boolean) => void;
}

export const PasswordStrengthValidator: React.FC<PasswordStrengthValidatorProps> = ({
  password,
  onStrengthChange
}) => {
  const { score, label, color, rules } = useMemo(() => {
    if (!password) {
      return {
        score: 0,
        label: 'Şifre girilmedi',
        color: 'bg-neutral-700',
        rules: { length: false, case: false, number: false, special: false }
      };
    }

    const rules = {
      length: password.length >= 8,
      case: /[a-z]/.test(password) && /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };

    let score = 0;
    if (rules.length) score++;
    if (rules.case) score++;
    if (rules.number) score++;
    if (rules.special) score++;

    // Prevent very simple passwords from scoring high (e.g. "12345678")
    const isRepeated = /(.)\1{3,}/.test(password);
    const isSequence = '1234567890qwertyuiopasdfghjklzxcvbnm'.includes(password.toLowerCase());
    if ((isRepeated || isSequence) && score > 1) {
      score = 1;
    }

    let label = 'Çok Zayıf';
    let color = 'bg-rose-500';

    if (score === 2) {
      label = 'Orta Derece';
      color = 'bg-amber-500';
    } else if (score === 3) {
      label = 'Güçlü';
      color = 'bg-emerald-500';
    } else if (score === 4) {
      label = 'Çok Güçlü';
      color = 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]';
    }

    const isValid = score >= 2;
    if (onStrengthChange) {
      onStrengthChange(isValid);
    }

    return { score, label, color, rules };
  }, [password, onStrengthChange]);

  if (!password) return null;

  return (
    <div className="mt-3 p-3.5 rounded-xl border border-white/[0.06] bg-black/10 backdrop-blur-sm space-y-2.5 text-xs text-cafe-100">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-white/70">Şifre Güvenliği:</span>
        <span className="font-bold text-white/90">{label}</span>
      </div>

      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex gap-1">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full flex-1 rounded-full transition-all duration-300 ${
              step <= score ? color : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-1 text-[11px] text-white/50">
        <div className="flex items-center gap-1.5">
          <span className={rules.length ? 'text-teal-400' : 'text-rose-400'}>
            {rules.length ? '✓' : '✗'}
          </span>
          <span>En az 8 karakter</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={rules.case ? 'text-teal-400' : 'text-rose-400'}>
            {rules.case ? '✓' : '✗'}
          </span>
          <span>Büyük ve küçük harf</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={rules.number ? 'text-teal-400' : 'text-rose-400'}>
            {rules.number ? '✓' : '✗'}
          </span>
          <span>Rakam (0-9)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={rules.special ? 'text-teal-400' : 'text-rose-400'}>
            {rules.special ? '✓' : '✗'}
          </span>
          <span>Özel karakter (!@#...)</span>
        </div>
      </div>
    </div>
  );
};
