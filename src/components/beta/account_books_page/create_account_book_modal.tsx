import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IoCloseOutline, IoChevronDown, IoChevronUp, IoAdd } from 'react-icons/io5';
import { useUserCtx } from '@/contexts/user_context';
import { WORK_TAG } from '@/interfaces/account_book';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType, ToastPosition } from '@/interfaces/toastify';
import { ITeam } from '@/interfaces/team';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { IPaginatedData } from '@/interfaces/pagination';
import loggerFront from '@/lib/utils/logger_front';

interface CreateCompanyModalProps {
  closeCreateAccountBookModal: () => void;
  setRefreshKey?: React.Dispatch<React.SetStateAction<number>>;
  getAccountBookList?: () => void;
}

const CreateAccountBookModal = ({
  closeCreateAccountBookModal,
  setRefreshKey,
  getAccountBookList,
}: CreateCompanyModalProps) => {
  const { t } = useTranslation(['dashboard']);
  const { createAccountBook, userAuth } = useUserCtx();
  const { toastHandler } = useModalContext();

  const [companyName, setCompanyName] = useState<string>('');
  const [taxId, setTaxId] = useState<string>('');
  const [tag, setTag] = useState<WORK_TAG | null>(null);
  const [teamList, setTeamList] = useState<ITeam[] | null>(null);
  const [team, setTeam] = useState<ITeam | null>(null);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState<boolean>(false);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [companyNameError, setCompanyNameError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Info: (20250303 - Liz) 取得團隊清單 API
  const { trigger: getTeamListAPI } = APIHandler<IPaginatedData<ITeam[]>>(APIName.LIST_TEAM);

  const toggleTagDropdown = () => {
    setIsTagDropdownOpen((prevState) => !prevState);
    setIsTeamDropdownOpen(false);
  };

  const toggleTeamDropdown = () => {
    setIsTeamDropdownOpen((prevState) => !prevState);
    setIsTagDropdownOpen(false);
  };

  // Info: (20250312 - Liz) 打 API 建立帳本(原為公司)
  const handleSubmit = async () => {
    // Info: (20241114 - Liz) 防止重複點擊
    if (isLoading) return;

    // Info: (20250213 - Liz) 必填機制
    if (!companyName) {
      setCompanyNameError(t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.PLEASE_ENTER_THE_NAME'));
      return;
    }
    if (!tag) {
      setTagError(t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.PLEASE_SELECT_A_WORK_TAG'));
      return;
    }
    if (!team) {
      setTeamError(t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.PLEASE_SELECT_A_TEAM'));
      return;
    }

    // Info: (20241104 - Liz) 開始 API 請求時設為 loading 狀態
    setIsLoading(true);

    try {
      const { success, code, errorMsg } = await createAccountBook({
        name: companyName,
        taxId,
        tag,
        teamId: team.id, // Info: (20250312 - Liz) 選擇團隊
      });

      if (!success) {
        // Info: (20241114 - Liz) 新增帳本失敗時顯示錯誤訊息
        toastHandler({
          id: 'create-company-failed',
          type: ToastType.ERROR,
          content: (
            <p>
              {`${t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.CREATE_ACCOUNT_BOOK_FAILED')}!
              ${t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.ERROR_CODE')}: ${code}
              ${t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.ERROR_MESSAGE')}: ${errorMsg}`}
            </p>
          ),
          closeable: true,
          position: ToastPosition.TOP_CENTER,
        });
        return;
      }

      // Info: (20241114 - Liz) 新增帳本成功後清空表單並關閉 modal
      setCompanyName('');
      setTaxId('');
      setTag(WORK_TAG.ALL);
      closeCreateAccountBookModal();

      if (getAccountBookList) getAccountBookList(); // Info: (20241209 - Liz) 重新取得帳本清單

      if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20241114 - Liz) This is a workaround to refresh the account book list after creating a new account book (if use filterSection)
    } catch (error) {
      loggerFront.error('CreateAccountBookModal handleSubmit error:', error);
    } finally {
      // Info: (20241104 - Liz) API 回傳後解除 loading 狀態
      setIsLoading(false);
    }
  };

  // Info: (20250303 - Liz) 打 API 取得使用者的團隊清單
  useEffect(() => {
    if (!userAuth) return;
    const getTeamList = async () => {
      try {
        const { success, data } = await getTeamListAPI({
          params: { userId: userAuth.id },
          query: {
            canCreateAccountBookOnly: true,
            page: 1,
            pageSize: 999,
          },
        });

        if (success) {
          setTeamList(data?.data ?? []);
        }
      } catch (error) {
        loggerFront.error('CreateAccountBookModal getTeamList error:', error);
      }
    };

    getTeamList();
  }, [userAuth]);

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="overflow-hidden rounded-lg">
        <header className="flex items-center justify-between bg-surface-neutral-surface-lv2 px-40px pb-24px pt-40px">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.CREATE_NEW_ACCOUNT_BOOK')}
          </h1>
          <button type="button" onClick={closeCreateAccountBookModal}>
            <IoCloseOutline size={24} />
          </button>
        </header>

        <div className="max-h-65vh w-400px gap-24px overflow-y-auto bg-surface-neutral-surface-lv2 px-40px pb-40px">
          <main className="flex flex-col gap-40px">
            <section className="flex flex-col gap-40px">
              {/* // Info: (20250213 - Liz) Company Name */}
              <div className="flex flex-col gap-8px">
                <h4 className="font-semibold text-input-text-primary">
                  {t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.COMPANY_NAME')}
                  <span className="text-text-state-error"> *</span>
                </h4>
                <input
                  type="text"
                  placeholder={t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.ENTER_NAME')}
                  className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                {companyNameError && !companyName && (
                  <p className="text-right text-sm font-medium text-text-state-error">
                    {companyNameError}
                  </p>
                )}
              </div>

              {/* // Info: (20250213 - Liz) Business Tax Number */}
              <div className="flex flex-col gap-8px">
                <h4 className="font-semibold text-input-text-primary">
                  {t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.TAX_ID')}
                </h4>
                <input
                  type="text"
                  placeholder={t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.ENTER_TAX_ID')}
                  className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                />
              </div>

              {/* // Info: (20250213 - Liz) Work Tag 工作標籤 */}
              <div className="flex flex-col gap-8px">
                <h4 className="font-semibold text-input-text-primary">
                  {t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.WORK_TAG')}
                  <span className="text-text-state-error"> *</span>
                </h4>

                <div className="relative flex flex-col">
                  <button
                    type="button"
                    className="flex flex-auto items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM"
                    onClick={toggleTagDropdown}
                  >
                    <p className="px-12px py-10px text-base font-medium">
                      {tag ? (
                        t('dashboard:WORK_TAG.' + tag.toUpperCase())
                      ) : (
                        <span className="text-input-text-input-placeholder">
                          {t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.CHOOSE_WORK_TAG')}
                        </span>
                      )}
                    </p>

                    <div className="px-12px py-10px">
                      {isTagDropdownOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                    </div>
                  </button>

                  {tagError && !isTagDropdownOpen && (
                    <p className="text-right text-sm font-medium text-text-state-error">
                      {tagError}
                    </p>
                  )}

                  {isTagDropdownOpen && (
                    <div className="absolute inset-x-0 top-full z-10 mt-8px">
                      <div className="mb-20px flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                        {Object.values(WORK_TAG).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setTag(item);
                              toggleTagDropdown();
                              setTagError(null);
                            }}
                            className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                          >
                            {t('dashboard:WORK_TAG.' + item.toUpperCase())}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* // Info: (20250213 - Liz) Team 選擇團隊 */}
              <div className="flex flex-col gap-8px">
                <h4 className="font-semibold text-input-text-primary">
                  {t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.TEAM')}
                  <span className="text-text-state-error"> *</span>
                </h4>

                <div className="relative flex flex-col">
                  <button
                    type="button"
                    className="flex flex-auto items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM"
                    onClick={toggleTeamDropdown}
                  >
                    <p className="px-12px py-10px text-base font-medium">
                      {team ? (
                        team.name.value
                      ) : (
                        <span className="text-input-text-input-placeholder">
                          {t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.CHOOSE_TEAM')}
                        </span>
                      )}
                    </p>

                    <div className="px-12px py-10px">
                      {isTeamDropdownOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                    </div>
                  </button>

                  {teamError && !isTeamDropdownOpen && (
                    <p className="text-right text-sm font-medium text-text-state-error">
                      {teamError}
                    </p>
                  )}

                  {isTeamDropdownOpen && (
                    <div className="absolute inset-x-0 top-full z-10 mt-8px">
                      <div className="mb-20px flex flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                        {teamList &&
                          teamList.length > 0 &&
                          teamList.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setTeam(item);
                                toggleTeamDropdown();
                                setTeamError(null);
                              }}
                              className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                            >
                              {item.name.value}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="flex justify-end gap-12px">
              <button
                type="button"
                onClick={closeCreateAccountBookModal}
                className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
              >
                {t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.CANCEL')}
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
              >
                <p>{t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.ADD')}</p>
                <IoAdd size={16} />
              </button>
            </section>
          </main>
        </div>
      </div>
    </main>
  );
};

export default CreateAccountBookModal;
