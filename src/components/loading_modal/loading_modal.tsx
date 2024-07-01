import { LoadingSVG } from '@/components/loading_svg/loading_svg';
import { useTranslation } from 'next-i18next';

interface ILoadingModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const LoadingModal = ({ isModalVisible }: ILoadingModalProps) => {
  const { t } = useTranslation('common');
  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 font-barlow">
      <div
        className={`relative flex h-376px w-90vw items-center justify-center gap-16px rounded-xs bg-white px-32px py-16px md:w-376px`}
      >
        {t('LOADING_MODAL.LOADING')}
        <LoadingSVG />
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default LoadingModal;
