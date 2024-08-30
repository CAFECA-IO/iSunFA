import React, { useEffect, useState } from 'react';
import { Button } from '@/components/button/button';
import APIHandler from '@/lib/utils/api_handler';
import { useUserCtx } from '@/contexts/user_context';
import { APIName } from '@/constants/api_connection';
import { ICompany } from '@/interfaces/company';
// eslint-disable-next-line import/no-cycle
import { useGlobalCtx } from '@/contexts/global_context';
import { ToastType } from '@/interfaces/toastify';

interface ITeamSettingModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

// ToDo: (20240822 - Julian) [Beta] i18n
const TeamSettingModal = ({ isModalVisible, modalVisibilityHandler }: ITeamSettingModal) => {
  const { selectedCompany, selectCompany } = useUserCtx();
  const { toastHandler } = useGlobalCtx();
  const [companyName, setCompanyName] = useState<string>(selectedCompany?.name ?? '');

  const {
    trigger: updateTeam,
    data: updatedTeam,
    isLoading: isUpdateTeamLoading,
    error: updateTeamError,
    code: updateTeamCode,
    success: updateTeamSuccess,
  } = APIHandler<ICompany>(APIName.COMPANY_UPDATE);

  const saveClickHandler = async () => {
    if (companyName && selectedCompany && companyName !== selectedCompany.name) {
      updateTeam({
        params: {
          companyId: selectedCompany.id,
        },
        body: {
          name: companyName,
          code: selectedCompany.code,
          regional: selectedCompany.regional,
        },
      });

      setCompanyName('');
      modalVisibilityHandler();
    }
  };

  useEffect(() => {
    if (isUpdateTeamLoading) return;

    if (updateTeamSuccess && updatedTeam) {
      selectCompany(updatedTeam);
    } else if (updateTeamError) {
      toastHandler({
        id: `update_team-${updateTeamCode}`,
        type: ToastType.ERROR,
        content: <p>Fail to update company name. Code: {updateTeamCode}</p>,
        closeable: true,
      });
    }
  }, [updateTeamSuccess, updateTeamError, isUpdateTeamLoading]);

  useEffect(() => {
    if (isModalVisible) {
      setCompanyName(selectedCompany?.name ?? '');
    }
  }, [isModalVisible, selectedCompany]);

  const isDisplayedRegisterModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative mx-auto flex w-320px flex-col items-center rounded-md bg-surface-neutral-surface-lv2 pb-5 pt-2 shadow-lg shadow-black/80 lg:w-500px">
        <div className="py-4">
          <div className="text-xl font-bold text-card-text-primary">Settings</div>
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
          <div className="flex flex-col justify-start gap-2 text-divider-text-lv-1">
            <p>Company Name</p>
            <div className="flex rounded-sm border border-solid border-input-stroke-input bg-input-surface-input-background shadow-sm">
              <div className="flex flex-1">
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  type="text"
                  className="mx-2 w-full bg-input-surface-input-background px-1 py-2.5 text-base placeholder:text-input-text-input-placeholder focus:outline-none"
                  placeholder={selectedCompany?.name ?? 'your company name'}
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
              Cancel
            </Button>
            <Button
              disabled={
                isUpdateTeamLoading ||
                !companyName ||
                !selectedCompany ||
                companyName === selectedCompany?.name
              }
              variant={'tertiary'}
              onClick={saveClickHandler}
              className="flex-1 rounded-xs"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
  return <div>{isDisplayedRegisterModal}</div>;
};

export default TeamSettingModal;
