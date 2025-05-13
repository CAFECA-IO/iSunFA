import { useRouter } from 'next/router';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { useTranslation } from 'next-i18next';
import { ISUNFA_ROUTE } from '@/constants/url';
import { BiLeftArrowAlt } from 'react-icons/bi';

const LeaveButton = () => {
  const { t } = useTranslation(['common', 'kyc']);
  const router = useRouter();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();

  const handleBack = () => {
    router.push(ISUNFA_ROUTE.COMPANY_INFO);
  };

  const leaveClickHandler = () => {
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('kyc:KYC.LEAVE_THIS_PAGE'),
      content: t('kyc:KYC.YOU_MIGHT_LOSE_PROGRESS_IF_YOU_LEAVE'),
      subMsg: `${t('kyc:KYC.ARE_YOU_SURE_YOU_WANT_TO_LEAVE_THIS_PAGE')} ?`,
      submitBtnStr: t('kyc:KYC.LEAVE_NOW'),
      submitBtnFunction: handleBack,
      backBtnStr: t('common:COMMON.CANCEL'),
    });
    messageModalVisibilityHandler();
  };

  return (
    <button type="button" onClick={leaveClickHandler}>
      <div className="rounded-xs border border-button-stroke-secondary p-10px text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover">
        <BiLeftArrowAlt className="h-4 w-4" />
      </div>
    </button>
  );
};

export default LeaveButton;
