import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';

export type DropdownOption = {
  value: string;
  label: string;
  hint?: string;
};

type DropdownSelectProps = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  icon?: LucideIcon;
  className?: string;
  menuClassName?: string;
};

export default function DropdownSelect({
  value,
  options,
  onChange,
  ariaLabel,
  icon: Icon,
  className = '',
  menuClassName = '',
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (!selectedOption) {
    return null;
  }

  return (
    <div ref={rootRef} className={`dropdown-field ${className}`.trim()}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={labelId}
        aria-label={ariaLabel}
        onClick={() => setIsOpen((current) => !current)}
        className={`dropdown-trigger ${isOpen ? 'is-open' : ''}`}
      >
        {Icon ? (
          <span className="dropdown-trigger-icon" aria-hidden="true">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span id={labelId} className="dropdown-label">
            {selectedOption.label}
          </span>
          {selectedOption.hint ? <span className="dropdown-hint">{selectedOption.hint}</span> : null}
        </span>
        <ChevronDown className={`dropdown-chevron ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`dropdown-menu ${menuClassName}`.trim()}
          >
            <div className="dropdown-menu-inner" role="listbox" aria-label={ariaLabel}>
              {options.map((option) => {
                const isActive = option.value === selectedOption.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`dropdown-option ${isActive ? 'is-active' : ''}`}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    <span className="dropdown-option-copy">
                      <span className="dropdown-option-label">{option.label}</span>
                      {option.hint ? <span className="dropdown-option-hint">{option.hint}</span> : null}
                    </span>
                    {isActive ? <Check className="h-4 w-4 text-[color:var(--color-accent)]" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
