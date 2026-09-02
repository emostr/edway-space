'use client';

import { Icon } from './Icon';

export interface Tab {
  value: string;
  label: string;
  icon?: string;
  badge?: string | number | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  tabs: Tab[];
  className?: string;
}

export function Tabs({ value, onChange, tabs, className = '' }: Props) {
  return (
    <div className={`flex items-stretch gap-1 border-b border-line overflow-x-auto ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            value === tab.value ? 'text-ink' : 'text-muted hover:text-ink'
          }`}
          onClick={() => onChange(tab.value)}
        >
          {tab.icon ? <Icon name={tab.icon} size={16} /> : null}
          {tab.label}
          {tab.badge !== null && tab.badge !== undefined ? (
            <span className="text-[10px] font-bold bg-surface-3 text-muted px-1.5 py-0.5">{tab.badge}</span>
          ) : null}
          {value === tab.value ? (
            <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent" />
          ) : null}
        </button>
      ))}
    </div>
  );
}
