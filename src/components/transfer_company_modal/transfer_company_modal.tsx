// Deprecated: (20250324 - Liz) 這好像是 Alpha 版本的元件
import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/button/button';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
// import APIHandler from '@/lib/utils/api_handler';
// import { APIName } from '@/constants/api_connection';
// import { useUserCtx } from '@/contexts/user_context';
// import { IAdmin } from '@/interfaces/admin';
import { useTranslation } from 'next-i18next';

interface ITransferCompanyModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const TransferCompanyModal = ({
  isModalVisible,
  modalVisibilityHandler,
}: ITransferCompanyModal) => {
  const { t } = useTranslation(['common', 'kyc']);
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();
  const inputRef = useRef<HTMLInputElement>(null);

  // const { connectedAccountBook } = useUserCtx();

  // Info: (20240729 - Liz) API Handler
  // const { trigger: transferOwner } = APIHandler<IAdmin[]>(APIName.TRANSFER_OWNER); // Info: (20250326 - Tzuhan) This Api is deprecated and should be removed

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSubmit = (newOwnerId: string) => {
    /** Info: (20250326 - Tzuhan) This Api is deprecated and should be removed
    if (!connectedAccountBook?.id) return;
    transferOwner({
      params: { companyId: connectedAccountBook?.id },
      body: {
        newOwnerId,
      },
    })
      .then((res) => {
        if (res.data?.length ?? 0) {
          messageModalDataHandler({
            messageType: MessageType.SUCCESS,
            title: t('kyc:KYC.TRANSFER_OWNER'),
            content: t('kyc:KYC.TRANSFER_OWNER_SUCCESSFULLY'),
            submitBtnStr: t('common:COMMON.OK'),
            hideCloseBtn: true,
            submitBtnFunction: () => {
              // Info: (20240729 - Liz) reload this page to get the latest data and hide the UI
              window.location.reload();
            },
          });
        } else {
          messageModalDataHandler({
            messageType: MessageType.ERROR,
            title: t('kyc:KYC.TRANSFER_OWNER'),
            content: t('kyc:KYC.TRANSFER_OWNER_FAILED'),
            submitBtnStr: t('common:COMMON.OK'),
            hideCloseBtn: true,
            submitBtnFunction: () => {
              messageModalVisibilityHandler();
            },
          });
        }
        messageModalVisibilityHandler();
      })
      .catch(() => {
        messageModalDataHandler({
          messageType: MessageType.ERROR,
          title: t('kyc:KYC.TRANSFER_OWNER'),
          content: t('kyc:KYC.TRANSFER_OWNER_FAILED'),
          submitBtnStr: t('common:COMMON.OK'),
          hideCloseBtn: true,
          submitBtnFunction: () => {
            messageModalVisibilityHandler();
          },
        });
        messageModalVisibilityHandler();
      });
      */
  };

  const saveClickHandler = async () => {
    if (inputRef.current) {
      // TODO: (20240717 - Shirley) [Beta] send API request
      if (inputRef.current.value === '') {
        modalVisibilityHandler();
        return;
      }

      const newOwnerId = inputRef.current.value;
      modalVisibilityHandler();

      // TODO: (20240717 - Shirley) [Beta] validate the userId
      messageModalDataHandler({
        messageType: MessageType.WARNING,
        title: t('kyc:KYC.TRANSFER_COMPANY'),
        content: (
          <div className="flex w-full flex-col gap-2">
            <p className="text-text-neutral-secondary">
              {t('kyc:KYC.TRANSFER_THE_ADMINISTRATION_TO')}
            </p>
            <p className="text-text-neutral-primary">{inputRef.current.value}</p>
          </div>
        ), // TODO: (20240717 - Shirley) [Beta] message color
        // content: `Are you sure you want to transfer the company to \n\n${inputRef.current.value}.`,
        backBtnStr: t('common:COMMON.CANCEL'),
        submitBtnStr: t('common:COMMON.TRANSFER'),
        submitBtnFunction: () => handleSubmit(newOwnerId),
      });

      inputRef.current.value = '';
      messageModalVisibilityHandler();
    }
  };

  useEffect(() => {
    if (!isModalVisible) {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [isModalVisible]);

  const isDisplayedRegisterModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative mx-auto flex w-320px flex-col items-center rounded-md bg-card-surface-primary px-0 pb-5 pt-2 shadow-lg shadow-black/80 lg:w-500px">
        <div className="flex gap-2.5 py-4 pl-10 pr-5">
          <div className="w-full text-center text-xl font-bold text-card-text-primary">
            {t('kyc:KYC.TRANSFER_COMPANY')}
          </div>
          <div className="absolute right-3 top-3">
            <Button
              variant={'secondaryBorderless'}
              size={'extraSmall'}
              onClick={modalVisibilityHandler}
              className="flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#314362"
                  fillRule="evenodd"
                  d="M6.224 6.22a.75.75 0 011.06 0l10.5 10.5a.75.75 0 11-1.06 1.061l-10.5-10.5a.75.75 0 010-1.06z"
                  clipRule="evenodd"
                ></path>
                <path
                  fill="#314362"
                  fillRule="evenodd"
                  d="M17.784 6.22a.75.75 0 010 1.061l-10.5 10.5a.75.75 0 01-1.06-1.06l10.5-10.5a.75.75 0 011.06 0z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </Button>
          </div>
        </div>

        <div className="w-full border-t border-stroke-neutral-quaternary pb-4"></div>

        <div className="flex w-full flex-col justify-center px-8 py-2.5">
          <div className="flex flex-col justify-start gap-2">
            <div className="text-divider-text-lv-1">
              <p>{t('kyc:KYC.TRANSFER_COMPANY_TO')}</p>
            </div>
            <div className="flex gap-0 rounded-sm border border-solid border-input-stroke-input shadow-sm">
              <div className="flex flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  className="mx-2 w-full bg-input-surface-input-background px-1 py-2.5 text-base text-input-text-input-filled placeholder:text-input-text-input-placeholder focus:outline-none"
                  placeholder={t('kyc:KYC.USER_ID')}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full items-end justify-end px-8 py-4 text-sm font-medium">
          <div className="flex w-full gap-3">
            <Button
              variant={'secondaryOutline'}
              onClick={modalVisibilityHandler}
              className="flex-1 rounded-xs"
            >
              {t('common:COMMON.CANCEL')}
            </Button>
            <Button variant={'tertiary'} onClick={saveClickHandler} className="flex-1 rounded-xs">
              {t('kyc:KYC.TRANSFER')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
  return <div> {isDisplayedRegisterModal}</div>;
};

export default TransferCompanyModal;
