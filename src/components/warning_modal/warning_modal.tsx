/* eslint-disable */
import Image from 'next/image';
import { RxCross2 } from 'react-icons/rx';
import { Button } from '../button/button';
import { IWaringModal } from '../../interfaces/warning_modal';

interface IWaringModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  warningModalData: IWaringModal;
}

const WarningModal = ({
  isModalVisible,
  modalVisibilityHandler,
  warningModalData,
}: IWaringModalProps) => {
  const { title, content, warningMsg, modalSubmitBtn, submitBtnFunction } = warningModalData;

  // Info: (20240425 - Julian) 執行 submitBtnFunction 後，關閉 modal
  const submitClickHandler = () => {
    submitBtnFunction();
    modalVisibilityHandler();
  };

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-376px relative flex h-fit flex-col gap-16px rounded-xs border-t-5px border-warningYellow bg-white px-32px py-16px">
        <button
          type="button"
          onClick={modalVisibilityHandler}
          className="absolute right-12px top-12px text-lightGray5"
        >
          <RxCross2 size={20} />
        </button>
        <div className="mt-20px flex flex-col items-center gap-16px text-center">
          <h1 className="text-xl font-bold text-primaryYellow6">{title}</h1>
          <Image src="/icons/warning.svg" width={48} height={48} alt="warning_icon" />
          {/* Info: (20240425 - Julian) common message (gray color) */}
          <p className="text-lightGray5">{content}</p>
          {/* Info: (20240425 - Julian) warning message (red color) */}
          <p className="text-lightRed">{warningMsg}</p>
        </div>
        <div className="flex items-center justify-center gap-24px">
          <Button
            className="px-16px py-8px"
            type="button"
            onClick={modalVisibilityHandler}
            variant={null}
          >
            Cancel
          </Button>
          <Button
            className="px-16px py-8px"
            type="button"
            onClick={submitClickHandler}
            variant="tertiary"
          >
            {modalSubmitBtn}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default WarningModal;
