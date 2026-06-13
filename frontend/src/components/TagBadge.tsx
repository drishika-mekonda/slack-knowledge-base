import React from 'react';

interface TagBadgeProps {
  tag: string;
}

const TagBadge: React.FC<TagBadgeProps> = ({ tag }) => {
  // Simple hashing to get consistent styled colors for tags
  const getColorClass = (text: string) => {
    const sum = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'bg-rose-500/10 text-rose-400 border-rose-500/20',
      'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    ];
    return colors[sum % colors.length];
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getColorClass(tag)}`}>
      {tag}
    </span>
  );
};

export default TagBadge;
