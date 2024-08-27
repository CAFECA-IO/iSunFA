import Image from 'next/image';
import { RxCross2 } from 'react-icons/rx';
import { Button } from '@/components/button/button';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import { cn } from '@/lib/utils/common';

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
  const {
    title,
    subtitle,
    content,
    notes,
    hideCloseBtn,
    subMsg,
    submitBtnStr,
    submitBtnFunction,
    backBtnStr,
    backBtnFunction,
    messageType,
    submitBtnClassName,
    submitBtnVariant,
    submitBtnIcon,
  } = messageModalData;

  // Info: (20240514 - Julian) 如果沒有 backBtnFunction，則預設為關閉 modal
  const backBtnClickHandler = backBtnFunction || modalVisibilityHandler;

  // Info: (20240425 - Julian) 執行 submitBtnFunction 後，關閉 modal
  const submitClickHandler = () => {
    submitBtnFunction();
    modalVisibilityHandler();
  };

  const imgStr =
    messageType === MessageType.WARNING
      ? '/icons/warning.svg'
      : messageType === MessageType.SUCCESS
        ? '/icons/success.svg'
        : messageType === MessageType.ERROR
          ? '/icons/error.svg'
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
          ? 'border-errorRed3'
          : 'border-navyBlue';

  const titleColor =
    messageType === MessageType.WARNING
      ? 'text-primaryYellow6'
      : messageType === MessageType.SUCCESS
        ? 'text-surface-state-success'
        : messageType === MessageType.ERROR
          ? 'text-surface-state-error'
          : 'text-navyBlue2';

  const isBackBtn = backBtnStr ? (
    <Button
      className="px-16px py-8px"
      type="button"
      onClick={backBtnClickHandler}
      variant="tertiaryOutline"
    >
      {backBtnStr}
    </Button>
  ) : null;

  // Info: (20240515 - Shirley) 換行處理
  const displayedSubtitles = subtitle?.split('\n').map((line, index) => (
    // eslint-disable-next-line react/no-array-index-key
    <div key={index}>
      {line}
      {index < subtitle.split('\n').length - 1 && <br />}
    </div>
  ));

  // Info: (20240515 - Shirley) 換行處理
  const displayedContent =
    typeof content === 'string'
      ? content.split('\n').map((line, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={index} className="-mt-2">
            {line}
            {index < content.split('\n').length - 1}
          </div>
        ))
      : content;

  const isDisplayCross = !hideCloseBtn ? (
    <button
      type="button"
      onClick={modalVisibilityHandler}
      className="absolute right-12px top-12px text-lightGray5"
    >
      <RxCross2 size={20} />
    </button>
  ) : null;

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 font-barlow">
      <div
        className={`relative flex h-fit w-90vw flex-col gap-16px rounded-xs border-t-5px md:w-376px ${borderColor} bg-white px-32px py-16px`}
      >
        {isDisplayCross}
        <div className="mt-20px flex flex-col items-center gap-16px text-center">
          <h1 className={`text-xl font-bold ${titleColor}`}>{title}</h1>
          <h1 className={`text-base font-medium ${titleColor}`}>{displayedSubtitles}</h1>
          <Image src={imgStr} width={48} height={48} alt={imgAlt} />
          {/* Info: (20240507 - Julian) sub message (red color) */}
          <p className="text-base text-text-state-error">{subMsg}</p>
          {/* Info: (20240425 - Julian) common message (gray color) */}
          <div className="space-y-1 text-sm text-text-neutral-primary">{displayedContent}</div>
          <div className="text-sm font-semibold text-lightGray5">{notes}</div>
        </div>
        <div className="flex items-center justify-center gap-24px">
          {isBackBtn}
          <Button
            className={cn('px-16px py-8px', submitBtnClassName)}
            type="button"
            onClick={submitClickHandler}
            variant={submitBtnVariant ?? 'tertiary'}
          >
            <div className="flex items-center space-x-2">
              <span>{submitBtnStr}</span>
              {submitBtnIcon}
            </div>
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default MessageModal;
