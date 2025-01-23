import { RiCheckboxMultipleLine, RiCoinsFill } from 'react-icons/ri';
import { LuFileCheck } from 'react-icons/lu';
import { COMPANY_TAG } from '@/constants/company';
import { useTranslation } from 'next-i18next';

interface WorkTagProps {
  tag: COMPANY_TAG;
}

const CompanyTag = ({ tag }: WorkTagProps) => {
  const { t } = useTranslation(['company']);

  let backgroundColor = '';
  let textColor = '';
  let icon = null;

  switch (tag) {
    case COMPANY_TAG.FINANCIAL:
      backgroundColor = 'bg-badge-surface-strong-secondary';
      textColor = 'text-badge-text-invert';
      icon = <RiCoinsFill size={16} />;
      break;

    case COMPANY_TAG.TAX:
      backgroundColor = 'bg-badge-surface-strong-primary';
      textColor = 'text-badge-text-invert';
      icon = <RiCheckboxMultipleLine size={16} />;
      break;

    case COMPANY_TAG.ALL:
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
      <p className="px-4px capitalize">{t(`company:TAG.${tag.toUpperCase()}`)}</p>
    </div>
  );
};

export default CompanyTag;
