import React from 'react';
import { User, Users, Globe } from 'lucide-react';

interface ScopeSelectorProps {
  value: 'personal' | 'team' | 'organization';
  onChange: (value: 'personal' | 'team' | 'organization') => void;
  disabled?: boolean;
}

const ScopeSelector: React.FC<ScopeSelectorProps> = ({ value, onChange, disabled = false }) => {
  const scopes = [
    {
      id: 'personal' as const,
      label: 'Personal',
      description: 'Only you',
      icon: User,
      color: 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30 hover:border-blue-400/50',
      activeColor: 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20 border-blue-400',
    },
    {
      id: 'team' as const,
      label: 'Team',
      description: 'Your team members',
      icon: Users,
      color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-400/50',
      activeColor: 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20 border-emerald-400',
    },
    {
      id: 'organization' as const,
      label: 'Organization',
      description: 'Everyone',
      icon: Globe,
      color: 'from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30 hover:border-purple-400/50',
      activeColor: 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/20 border-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {scopes.map((scope) => {
        const Icon = scope.icon;
        const isActive = value === scope.id;
        
        return (
          <button
            key={scope.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(scope.id)}
            className={`
              flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-300 select-none cursor-pointer
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${isActive 
                ? scope.activeColor 
                : `bg-card-bg border-subtle text-secondary hover:text-primary hover:bg-hover-bg`
              }
            `}
          >
            <Icon className={`w-5 h-5 mb-1.5 ${isActive ? 'scale-110' : ''} transition-transform`} />
            <span className="text-sm font-semibold tracking-wide">{scope.label}</span>
            <span className={`text-[10px] mt-0.5 opacity-80 ${isActive ? 'text-white/80' : 'text-muted'}`}>
              {scope.description}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ScopeSelector;
