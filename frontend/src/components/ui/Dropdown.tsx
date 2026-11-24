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

export function Select<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  disabled = false,
  size = 'sm',
  variant = 'pill',
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
    xs: 'h-7 px-3 text-[11px] gap-1.5',
    sm: 'h-8 px-3.5 text-xs gap-2',
    md: 'h-9 px-4 text-xs gap-2.5',
  };

  const variantClasses = {
    pill: 'bg-[#171717] border-[#262626] hover:border-[#404040] hover:bg-[#1f1f1f]',
    default: 'bg-[#171717] border-[#262626] hover:border-[#404040] hover:bg-[#1f1f1f]',
    subtle: 'bg-transparent border-[#262626] hover:border-[#404040] hover:bg-[#171717]',
    ghost: 'bg-transparent border-transparent hover:bg-[#171717] text-[#a3a3a3] hover:text-white',
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left font-sans">
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-between rounded-full border text-white transition-colors cursor-pointer select-none ${
          variantClasses[variant] || variantClasses.pill
        } ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <span className="flex items-center gap-2 truncate">
          {icon && <span className="text-[#a3a3a3]">{icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#737373] transition-transform duration-200 ml-1.5 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 min-w-[180px] max-w-[280px] rounded-2xl bg-[#171717] border border-[#262626] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
        >
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1f1f1f] text-white font-medium'
                      : 'text-[#a3a3a3] hover:text-white hover:bg-[#1f1f1f]'
                  } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {opt.icon && <span className="text-[#a3a3a3]">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#22c55e] shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
