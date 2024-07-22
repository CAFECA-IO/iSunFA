import { useRouter } from 'next/router';
import { useGlobalCtx } from '@/contexts/global_context';
import { MessageType } from '@/interfaces/message_modal';
import { useTranslation } from 'next-i18next';

const BackButton = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();

  const handleBack = () => {
    router.back();
  };

  const leaveClickHandler = () => {
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('KYC.LEAVE_THIS_PAGE'),
      content: t('KYC.YOU_MIGHT_LOSE_PROGRESS_IF_YOU_LEAVE'),
      subMsg: t('KYC.ARE_YOU_SURE_YOU_WANT_TO_LEAVE_THIS_PAGE')},
      submitBtnStr: t('KYC.LEAVE_NOW'),
      submitBtnFunction: handleBack,
      backBtnStr: t('KYC.CANCEL'),
    });
    messageModalVisibilityHandler();
  };

  return (
    <button type="button" onClick={leaveClickHandler}>
      <div className="rounded-xs border border-button-stroke-secondary p-10px text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8.53293 2.80365C8.82583 3.09655 8.82583 3.57142 8.53293 3.86431L5.1466 7.25065H12.6693C13.0835 7.25065 13.4193 7.58644 13.4193 8.00065C13.4193 8.41486 13.0835 8.75065 12.6693 8.75065H5.1466L8.53293 12.137C8.82583 12.4299 8.82583 12.9048 8.53293 13.1976C8.24004 13.4905 7.76517 13.4905 7.47227 13.1976L2.80561 8.53098C2.51271 8.23809 2.51271 7.76321 2.80561 7.47032L7.47227 2.80365C7.76517 2.51076 8.24004 2.51076 8.53293 2.80365Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </button>
  );
};

export default BackButton;
