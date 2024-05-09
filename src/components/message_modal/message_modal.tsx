/* eslint-disable */
import Image from 'next/image';
import { RxCross2 } from 'react-icons/rx';
import { Button } from '../button/button';
import { IMessageModal, MessageType } from '../../interfaces/message_modal';

interface IMessageModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  messageModalData: IMessageModal;
}

const MessageModal = ({
  isModalVisible,
  modalVisibilityHandler,
  messageModalData,
}: IMessageModalProps) => {
  const { title, content, subMsg, submitBtnStr, submitBtnFunction, messageType } = messageModalData;

  // Info: (20240425 - Julian) 執行 submitBtnFunction 後，關閉 modal
  const submitClickHandler = () => {
    submitBtnFunction();
    modalVisibilityHandler();
  };

  // ToDo: (20240507 - Julian) warning message (red color)
  const imgStr =
    messageType === MessageType.WARNING
      ? '/icons/warning.svg'
      : messageType === MessageType.SUCCESS
        ? '/icons/success.svg'
        : messageType === MessageType.ERROR
          ? ''
          : '/icons/info.svg';
  const imgAlt =
    messageType === MessageType.WARNING
      ? 'warning_icon'
      : messageType === MessageType.SUCCESS
        ? 'success_icon'
        : messageType === MessageType.ERROR
          ? 'error_icon'
          : 'info_icon';

  const borderColor =
    messageType === MessageType.WARNING
      ? 'border-warningYellow'
      : messageType === MessageType.SUCCESS
        ? 'border-successGreen3'
        : messageType === MessageType.ERROR
          ? 'border-errorRed'
          : 'border-navyBlue';

  const titleColor =
    messageType === MessageType.WARNING
      ? 'text-primaryYellow6'
      : messageType === MessageType.SUCCESS
        ? 'text-lightGreen'
        : messageType === MessageType.ERROR
          ? 'text-errorRed'
          : 'text-navyBlue2';

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className={`w-376px relative flex h-fit flex-col gap-16px rounded-xs border-t-5px ${borderColor} bg-white px-32px py-16px`}
      >
        <button
          type="button"
          onClick={modalVisibilityHandler}
          className="absolute right-12px top-12px text-lightGray5"
        >
          <RxCross2 size={20} />
        </button>
        <div className="mt-20px flex flex-col items-center gap-16px text-center">
          <h1 className={`text-xl font-bold ${titleColor}`}>{title}</h1>
          <Image src={imgStr} width={48} height={48} alt={imgAlt} />
          {/* Info: (20240425 - Julian) common message (gray color) */}
          <p className="text-lightGray5">{content}</p>
          {/* Info: (20240507 - Julian) sub message (red color) */}
          <p className="text-lightRed">{subMsg}</p>
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
            {submitBtnStr}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default MessageModal;
