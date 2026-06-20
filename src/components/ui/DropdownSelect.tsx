import React, { useCallback, useEffect, useId, useRef, useState, memo } from 'react';
import { createPortal } from 'react-dom';
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

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'top' | 'bottom';
};

const MENU_GAP = 8;
const VIEWPORT_MARGIN = 12;
const MENU_MAX_HEIGHT = 360;
const MENU_MIN_HEIGHT = 160;

const DropdownSelect = memo(function DropdownSelect({
  value,
  options,
  onChange,
  ariaLabel,
  icon: Icon,
  className = '',
  menuClassName = '',
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  const updateMenuPosition = useCallback(() => {
    if (typeof window === 'undefined' || !triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const availableWidth = Math.max(0, window.innerWidth - VIEWPORT_MARGIN * 2);
    const width = Math.min(rect.width, availableWidth);
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.left),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
    );
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;
    const placement = spaceBelow < MENU_MIN_HEIGHT && spaceAbove > spaceBelow ? 'top' : 'bottom';
    const availableHeight = placement === 'top' ? spaceAbove - MENU_GAP : spaceBelow - MENU_GAP;
    const maxHeight = Math.max(MENU_MIN_HEIGHT, Math.min(MENU_MAX_HEIGHT, availableHeight));
    const top =
      placement === 'top'
        ? Math.max(VIEWPORT_MARGIN, rect.top - maxHeight - MENU_GAP)
        : Math.min(window.innerHeight - VIEWPORT_MARGIN, rect.bottom + MENU_GAP);

    setMenuPosition({ top, left, width, maxHeight, placement });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
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

  useEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();

    const handleViewportChange = () => updateMenuPosition();

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, updateMenuPosition]);

  if (!selectedOption) {
    return null;
  }

  const menu = (
    <AnimatePresence>
      {isOpen && menuPosition ? (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: menuPosition.placement === 'top' ? -4 : 6, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: menuPosition.placement === 'top' ? -4 : 4, scale: 0.995 }}
          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className={`dropdown-menu is-portal is-${menuPosition.placement} ${menuClassName}`.trim()}
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            width: menuPosition.width,
            maxHeight: menuPosition.maxHeight,
            '--dropdown-menu-top': `${menuPosition.top}px`,
            '--dropdown-menu-left': `${menuPosition.left}px`,
            '--dropdown-menu-width': `${menuPosition.width}px`,
            '--dropdown-menu-max-height': `${menuPosition.maxHeight}px`,
          } as React.CSSProperties}
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
  );

  return (
    <div ref={rootRef} className={`dropdown-field ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={labelId}
        aria-label={ariaLabel}
        onClick={() => {
          if (!isOpen) {
            updateMenuPosition();
          }
          setIsOpen((current) => !current);
        }}
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
      {typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </div>
  );
});

DropdownSelect.displayName = 'DropdownSelect';

export default DropdownSelect;
