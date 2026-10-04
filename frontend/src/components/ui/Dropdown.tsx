import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'default' | 'subtle' | 'ghost' | 'pill';
  className?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  icon?: React.ReactNode;
  id?: string;
  name?: string;
}

/**
 * Clean, minimal select dropdown designed to taste-skill specifications.
 * Seamless dark mode, border accents, backdrop blur, and micro-animations.
 */
export function Select<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  disabled = false,
  size = 'sm',
  variant = 'default',
  className = '',
  menuClassName = '',
  align = 'left',
  icon,
  id,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const selectId = id || autoId;

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const sizeClasses = {
    xs: 'h-7 px-2 text-[11px] gap-1.5',
    sm: 'h-8 px-2.5 text-xs gap-2',
    md: 'h-9 px-3 text-xs gap-2.5',
  }[size];

  const variantClasses = {
    default:
      'bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
    subtle:
      'bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100',
    ghost:
      'bg-transparent hover:bg-zinc-900/60 border border-transparent hover:border-zinc-800 text-zinc-300 hover:text-zinc-100',
    pill:
      'bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-zinc-100 rounded-full',
  }[variant];

  const roundedClass = variant === 'pill' ? 'rounded-full' : 'rounded-lg';

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between font-sans font-medium transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed ${roundedClass} ${sizeClasses} ${variantClasses} ${
          isOpen ? 'border-zinc-600 ring-1 ring-zinc-700 bg-zinc-900 text-zinc-100' : ''
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0 pr-1">
          {icon && <span className="shrink-0 text-zinc-400">{icon}</span>}
          {selectedOption?.icon && (
            <span className="shrink-0 text-zinc-400">{selectedOption.icon}</span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0 ml-1">{selectedOption.badge}</span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ease-out ${
            isOpen ? 'rotate-180 text-zinc-200' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 mt-1.5 min-w-[160px] max-w-[320px] max-h-64 overflow-y-auto rounded-xl bg-zinc-950/95 backdrop-blur-md border border-zinc-800/90 p-1 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-in fade-in zoom-in-95 duration-150 focus:outline-none ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
        >
          {options.length === 0 ? (
            <div className="py-3 px-3 text-center text-xs text-zinc-500 font-mono">
              No options available
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  disabled={opt.disabled}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full group text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-100 flex items-center justify-between gap-3 cursor-pointer select-none ${
                    opt.disabled
                      ? 'opacity-40 cursor-not-allowed text-zinc-600'
                      : isSelected
                      ? 'bg-zinc-900 text-zinc-100 font-semibold shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    {opt.icon && (
                      <span className="shrink-0 text-zinc-400 group-hover:text-zinc-300">
                        {opt.icon}
                      </span>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 font-mono truncate">
                          {opt.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge && <span>{opt.badge}</span>}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  menuClassName?: string;
}

/**
 * Generic minimal dropdown container for custom menus (e.g. Header business switcher)
 */
export function DropdownMenu({
  trigger,
  children,
  align = 'right',
  className = '',
  menuClassName = '',
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <div onClick={() => setIsOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className={`absolute z-50 mt-1.5 rounded-xl bg-zinc-950/95 backdrop-blur-md border border-zinc-800/90 p-1.5 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
