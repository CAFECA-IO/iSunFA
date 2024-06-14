import { LoadingSVG } from '@/components/loading_svg/loading_svg';

interface ILoadingModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const LoadingModal = ({ isModalVisible }: ILoadingModalProps) => {
  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 font-barlow">
      <div
        className={`relative flex h-376px w-90vw items-center justify-center gap-16px rounded-xs bg-white px-32px py-16px md:w-376px`}
      >
        It is loading, please wait...
        <LoadingSVG />
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default LoadingModal;
