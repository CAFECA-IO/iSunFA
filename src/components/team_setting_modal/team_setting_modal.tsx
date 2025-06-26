// Deprecated: (20241111 - Liz) 這是 Alpha 版本的元件
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/button/button';
import APIHandler from '@/lib/utils/api_handler';
import { useUserCtx } from '@/contexts/user_context';
import { APIName } from '@/constants/api_connection';
import { IAccountBook } from '@/interfaces/account_book';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';

interface ITeamSettingModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

// ToDo: (20240822 - Julian) [Beta] i18n
const TeamSettingModal = ({ isModalVisible, modalVisibilityHandler }: ITeamSettingModal) => {
  const { t } = useTranslation(['common', 'settings']);
  const { connectedAccountBook, connectAccountBook } = useUserCtx();
  const { toastHandler } = useModalContext();
  const [companyName, setCompanyName] = useState<string>(connectedAccountBook?.name ?? '');

  const {
    trigger: updateTeam,
    data: updatedTeam,
    isLoading: isUpdateTeamLoading,
    error: updateTeamError,
    code: updateTeamCode,
    success: updateTeamSuccess,
  } = APIHandler<IAccountBook>(APIName.UPDATE_ACCOUNT_BOOK); // Info: (20250423 - Shirley) rename company to account book✅ @Julian

  const saveClickHandler = async () => {
    if (companyName && connectedAccountBook && companyName !== connectedAccountBook.name) {
      updateTeam({
        params: {
          accountBookId: connectedAccountBook.id,
        },
        body: {
          name: companyName,
        },
      });

      setCompanyName('');
      modalVisibilityHandler();
    }
  };

  useEffect(() => {
    if (isUpdateTeamLoading) return;

    if (updateTeamSuccess && updatedTeam) {
      connectAccountBook(updatedTeam.id);
    } else if (updateTeamError) {
      toastHandler({
        id: `update_team-${updateTeamCode}`,
        type: ToastType.ERROR,
        content: <p>{t('settings:SETTINGS.FAIL_UPDATE_COMPANY_NAME', { updateTeamCode })}</p>,
        closeable: true,
      });
    }
  }, [updateTeamSuccess, updateTeamError, isUpdateTeamLoading]);

  useEffect(() => {
    if (isModalVisible) {
      setCompanyName(connectedAccountBook?.name ?? '');
    }
  }, [isModalVisible, connectedAccountBook]);

  const isDisplayedRegisterModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative mx-auto flex w-320px flex-col items-center rounded-md bg-surface-neutral-surface-lv2 pb-5 pt-2 shadow-lg shadow-black/80 lg:w-500px">
        <div className="py-4">
          <div className="text-xl font-bold text-card-text-primary">
            {t('common:COMMON.SETTINGS')}
          </div>
          <div className="absolute right-3 top-3">
            <Button
              variant={'secondaryBorderless'}
              size={'extraSmall'}
              onClick={modalVisibilityHandler}
              className="flex items-center justify-center"
            >
              <RxCross2 size={24} />
            </Button>
          </div>
        </div>

        <div className="w-full border-t border-stroke-neutral-quaternary pb-4"></div>

        <div className="flex w-full flex-col justify-center px-8 py-2.5">
          <div className="flex flex-col justify-start gap-2 text-divider-text-lv-1">
            <p>{t('common:COMMON.COMPANY_NAME')}</p>
            <div className="flex rounded-sm border border-solid border-input-stroke-input bg-input-surface-input-background shadow-sm">
              <div className="flex flex-1">
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  type="text"
                  className="mx-2 w-full bg-input-surface-input-background px-1 py-2.5 text-base placeholder:text-input-text-input-placeholder focus:outline-none"
                  placeholder={connectedAccountBook?.name ?? t('common:COMMON.YOUR_COMPANY_NAME')}
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
            <Button
              disabled={
                isUpdateTeamLoading ||
                !companyName ||
                !connectedAccountBook ||
                companyName === connectedAccountBook?.name
              }
              variant={'tertiary'}
              onClick={saveClickHandler}
              className="flex-1 rounded-xs"
            >
              {t('alpha:EDIT_BOOKMARK_MODAL.SAVE')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
  return <div>{isDisplayedRegisterModal}</div>;
};

export default TeamSettingModal;
