import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/button/button';
// eslint-disable-next-line import/no-cycle
import { useGlobalCtx } from '@/contexts/global_context';
import { MessageType } from '@/interfaces/message_modal';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { IAdmin } from '@/interfaces/admin';

interface ITransferCompanyModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const TransferCompanyModal = ({
  isModalVisible,
  modalVisibilityHandler,
}: ITransferCompanyModal) => {
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();
  const inputRef = useRef<HTMLInputElement>(null);

  const { selectedCompany } = useUserCtx();

  // API Handler
  const { trigger: transferOwner } = APIHandler<IAdmin[]>(APIName.TRANSFER_OWNER);

  const handleSubmit = (newOwnerId: string) => {
    if (!selectedCompany?.id) return;
    transferOwner({
      params: { companyId: selectedCompany?.id },
      body: {
        newOwnerId,
      },
    })
      .then((res) => {
        if (res.data?.length ?? 0) {
          messageModalDataHandler({
            messageType: MessageType.SUCCESS,
            title: 'Transfer Owner',
            content: 'Transfer owner successfully',
            submitBtnStr: 'OK',
            hideCloseBtn: true,
            submitBtnFunction: () => {
              // Info: (20240729 - Liz) reload this page to get the latest data and hide the UI
              window.location.reload();
            },
          });
        } else {
          messageModalDataHandler({
            messageType: MessageType.ERROR,
            title: 'Transfer Owner',
            content: 'Transfer owner failed',
            submitBtnStr: 'OK',
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
          title: 'Transfer Owner',
          content: 'Transfer owner failed',
          submitBtnStr: 'OK',
          hideCloseBtn: true,
          submitBtnFunction: () => {
            messageModalVisibilityHandler();
          },
        });
        messageModalVisibilityHandler();
      });
  };

  const saveClickHandler = async () => {
    if (inputRef.current) {
      // TODO: send API request (20240717 - Shirley)
      if (inputRef.current.value === '') {
        modalVisibilityHandler();
        return;
      }

      const newOwnerId = inputRef.current.value;
      modalVisibilityHandler();

      // TODO: validate the userId (20240717 - Shirley)
      // TODO: show message modal (20240717 - Shirley)
      messageModalDataHandler({
        messageType: MessageType.WARNING,
        title: 'Transfer company',
        content: (
          <div className="flex w-full flex-col gap-2">
            <p className="text-text-neutral-secondary">
              Are you sure you want to transfer the administration to
            </p>
            <p className="text-text-neutral-primary">{inputRef.current.value}</p>
          </div>
        ), // TODO: message color (20240717 - Shirley)
        // content: `Are you sure you want to transfer the company to \n\n${inputRef.current.value}.`, // TODO: message color (20240717 - Shirley)
        backBtnStr: 'Cancel',
        submitBtnStr: 'Transfer',
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
      <div className="relative mx-auto flex w-320px flex-col items-center rounded-md bg-white px-0 pb-5 pt-2 shadow-lg shadow-black/80 sm:px-3 lg:w-500px">
        <div className="flex gap-2.5 bg-white py-4 pl-10 pr-5">
          <div className="flex w-full flex-1 flex-col justify-center text-center">
            <div className="px-0">
              <div className="text-xl font-bold text-card-text-primary">Transfer Company</div>
            </div>
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
          </div>{' '}
        </div>

        <div className="w-full border-t pb-4"></div>

        <div className="flex w-full flex-col justify-center bg-white px-5 py-2.5">
          <div className="flex flex-col justify-start gap-2">
            <div className="text-divider-text-lv-1">
              <p>Transfer company to ...</p>
            </div>
            <div className="flex gap-0 rounded-sm border border-solid border-lightGray3 bg-white shadow-sm">
              <div className="flex flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  className="mx-2 w-full bg-input-surface-input-background px-1 py-2.5 text-base text-navyBlue2 placeholder:text-input-text-input-placeholder focus:outline-none"
                  placeholder="User ID"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full items-end justify-end bg-white px-5 py-4 text-sm font-medium">
          <div className="flex w-full gap-3">
            {/* TODO: button component (20240409 - Shirley) */}
            <Button
              variant={'secondaryOutline'}
              onClick={modalVisibilityHandler}
              className="flex-1 rounded-xs"
            >
              Cancel
            </Button>
            <Button variant={'tertiary'} onClick={saveClickHandler} className="flex-1 rounded-xs">
              Transfer
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
  return <div> {isDisplayedRegisterModal}</div>;
};

export default TransferCompanyModal;
