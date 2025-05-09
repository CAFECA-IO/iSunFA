import { useTranslation } from 'next-i18next';
import { BiRightArrowAlt } from 'react-icons/bi';

const KYCButton = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation(['common', 'kyc']);
  return (
    <button
      type="button"
      className="flex items-center gap-8px rounded-xs bg-button-surface-strong-secondary px-32px py-14px text-lg font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover"
      onClick={onClick}
    >
      <p>{t('kyc:KYC.START_KYC')}</p>
      <div>
        <BiRightArrowAlt className="h-6 w-6 text-neutral-25" />
      </div>
    </button>
  );
};

export default KYCButton;
