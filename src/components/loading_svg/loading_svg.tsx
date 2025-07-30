import { useTranslation } from 'next-i18next';
import { AiOutlineLoading, AiOutlineLoading3Quarters } from 'react-icons/ai';

export const LoadingSVG = () => {
  const { t } = useTranslation(['common']);
  return (
    <div role="status">
      <div className="relative flex animate-spin items-center justify-center">
        <div className="absolute -rotate-90 text-orange-500">
          <AiOutlineLoading size={20} />
        </div>
        <div className="absolute text-gray-200">
          <AiOutlineLoading3Quarters size={20} />
        </div>
      </div>
      <span className="sr-only">{t('common:COMMON.LOADING')}</span>
    </div>
  );
};
