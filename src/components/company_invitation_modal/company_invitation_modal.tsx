import React, { useState, useEffect } from 'react';
import { Button } from '@/components/button/button';
import { RxCross2 } from 'react-icons/rx';
import { IToastify, ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
// eslint-disable-next-line import/no-cycle
import { useGlobalCtx } from '@/contexts/global_context';
import { MessageType } from '@/interfaces/message_modal';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { IAdmin } from '@/interfaces/admin';
import { ICompany } from '@/interfaces/company';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useTranslation } from 'next-i18next';

interface ICompanyInvitationModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  toastHandler: (props: IToastify) => void;
}

const CompanyInvitationModal = ({
  isModalVisible,
  modalVisibilityHandler,
  toastHandler,
}: ICompanyInvitationModal) => {
  const { t } = useTranslation('common');
  const { userAuth, selectCompany } = useUserCtx();
  const [codeInput, setCodeInput] = useState<string>('');
  const [isCodeValid, setIsCodeValid] = useState<boolean>(true);
  const router = useRouter();

  const {
    data: adminData,
    trigger: addCompany,
    success,
  } = APIHandler<IAdmin>(APIName.COMPANY_ADD_BY_INVITATION_CODE);

  const { messageModalVisibilityHandler, messageModalDataHandler } = useGlobalCtx();

  useEffect(() => {
    if (success && adminData) {
      const company = adminData.company as ICompany;
      // Info: (20240613 - Julian) Reset modal and redirect to dashboard
      if (company) {
        selectCompany(company);
        setCodeInput('');
        modalVisibilityHandler();
        // Info: (20240515 - Julian) Toastify
        const companyName = company.name;
        toastHandler({
          id: ToastId.INVITATION_SUCCESS,
          type: ToastType.SUCCESS,
          content: (
            <p>
              {t('COMPANY_INVITATION_MODAL.CONGRATULATIONS_YOU')}&apos;
              {t('COMPANY_INVITATION_MODAL.VE_SUCCESSFULLY_JOINED_THE')}{' '}
              <span className="font-semibold">{companyName}</span>
              {t('COMPANY_INVITATION_MODAL.TEAM')}
            </p>
          ),
          closeable: true,
        });
        router.push(ISUNFA_ROUTE.DASHBOARD);
      }
    } else if (success === false) {
      // Info: (20240516 - Julian) Error handling
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        title: 'Invitation Code Expiry',
        subMsg: 'Oops! This verification code has expired.',
        content: 'Please verify again or contact the company administrator.',
        submitBtnStr: t('COMMON.CLOSE'),
        submitBtnFunction: messageModalVisibilityHandler,
      });
      messageModalVisibilityHandler();
    }
  }, [success, adminData]);

  const changeCodeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCodeInput(e.target.value);
  };

  const cancelBtnClickHandler = () => {
    setCodeInput('');
    setIsCodeValid(true);
    modalVisibilityHandler();
  };

  const submitBtnClickHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Info: (20240515 - Julian) Verify invitation code
    const codeRegex = /^[A-Za-z0-9]{8}$/;
    setIsCodeValid(codeRegex.test(codeInput));

    // Info: (20240515 - Julian) Check if the code is valid
    if (codeRegex.test(codeInput)) {
      addCompany({ params: { userId: userAuth?.id }, body: { invitation: codeInput } });
    }
  };

  const isDisplayedCompanyInvitationModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <form
        onSubmit={submitBtnClickHandler}
        className="relative mx-auto flex w-350px flex-col items-center gap-y-24px rounded-lg bg-white py-16px shadow-lg shadow-black/80"
      >
        {/* Info: (20240515 - Julian) Title */}
        <div className="flex justify-center px-20px">
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold leading-8 text-navyBlue2">
              {t('COMPANY_INVITATION_MODAL.INVITATION CODE')}
            </h2>
            <p className="text-xs font-normal leading-tight tracking-tight text-lightGray5">
              {t('COMPANY_INVITATION_MODAL.ENTER_YOUR_COMPANY_INVITATION_CODE')}
            </p>
          </div>
          <button
            type="button"
            onClick={cancelBtnClickHandler}
            className="absolute right-3 top-3 flex items-center justify-center text-darkBlue2"
          >
            <RxCross2 size={20} />
          </button>
        </div>
        <div className="flex w-full flex-col justify-center gap-8px px-20px py-10px">
          {/* Info: (20240515 - Julian) Invitation Code */}
          <div
            className={`inline-flex w-full items-center gap-12px divide-x rounded-sm border px-12px shadow ${isCodeValid ? 'divide-lightGray3 border-lightGray3 text-darkBlue2' : 'divide-surface-state-error-dark border-surface-state-error-dark text-text-state-error'}`}
          >
            <p className={isCodeValid ? 'text-lightGray4' : 'text-input-text-error'}>
              {t('COMPANY_INVITATION_MODAL.INVITATION CODE')}
            </p>
            <input
              id="invitationCodeInput"
              type="text"
              placeholder={t('COMPANY_INVITATION_MODAL.ENTER_CODE')}
              value={codeInput}
              onChange={changeCodeHandler}
              required
              className="w-full flex-1 px-12px py-10px outline-none placeholder:text-lightGray4"
            />
          </div>
          <p
            className={`text-right text-surface-state-error ${isCodeValid ? 'opacity-0' : 'opacity-100'}`}
          >
            {t('COMPANY_INVITATION_MODAL.FORMAT_ERROR')}
          </p>
        </div>
        <div className="flex w-full justify-end gap-3 whitespace-nowrap px-20px text-sm font-medium leading-5 tracking-normal">
          <button
            type="button"
            onClick={cancelBtnClickHandler}
            className="rounded-sm px-4 py-2 text-secondaryBlue hover:text-primaryYellow"
          >
            {t('REPORTS_HISTORY_LIST.CANCEL')}
          </button>
          <Button type="submit" variant={'tertiary'}>
            {t('CONTACT_US.SUBMIT')}
          </Button>
        </div>
      </form>
    </div>
  ) : null;

  return <div className="font-barlow">{isDisplayedCompanyInvitationModal}</div>;
};

export default CompanyInvitationModal;
