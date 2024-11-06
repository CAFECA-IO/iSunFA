import { CompanyTag } from '@/constants/company';
import React from 'react';
import { LuFileCheck } from 'react-icons/lu';
import { RiCheckboxMultipleLine, RiCoinsFill } from 'react-icons/ri';

interface WorkTagProps {
  type: CompanyTag;
}
const WorkTag = ({ type }: WorkTagProps) => {
  let backgroundColor = '';
  let textColor = '';
  let icon = null;

  switch (type) {
    case CompanyTag.FINANCIAL:
      backgroundColor = 'bg-badge-surface-strong-secondary';
      textColor = 'text-badge-text-invert';
      icon = <RiCoinsFill size={16} />;
      break;

    case CompanyTag.TAX:
      backgroundColor = 'bg-badge-surface-strong-primary';
      textColor = 'text-badge-text-invert';
      icon = <RiCheckboxMultipleLine size={16} />;
      break;

    case CompanyTag.ALL:
      backgroundColor = 'bg-badge-surface-soft-secondary';
      textColor = 'text-badge-text-secondary-solid';
      icon = <LuFileCheck size={16} />;
      break;

    default:
      backgroundColor = 'bg-badge-surface-strong-secondary';
      textColor = 'text-badge-text-invert';
      icon = null;
      break;
  }

  return (
    <div
      className={`flex w-max items-center gap-1px rounded-full p-6px text-xs font-medium ${backgroundColor} ${textColor}`}
    >
      {icon}
      <p className="px-4px">{type}</p>
    </div>
  );
};

export default WorkTag;
