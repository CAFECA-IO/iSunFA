import { Dispatch, SetStateAction, useState } from 'react';
import { IoCloseOutline, IoChevronDown, IoChevronUp, IoSaveOutline } from 'react-icons/io5';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { WORK_TAG, IAccountBookWithTeam } from '@/interfaces/account_book';
import loggerFront from '@/lib/utils/logger_front';

interface ChangeTagModalProps {
  accountBookToChangeTag: IAccountBookWithTeam;
  setAccountBookToChangeTag: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setRefreshKey?: Dispatch<SetStateAction<number>>;
  getAccountBookListByTeamId?: () => Promise<void>;
}

const ChangeTagModal = ({
  accountBookToChangeTag,
  setAccountBookToChangeTag,
  setRefreshKey,
  getAccountBookListByTeamId,
}: ChangeTagModalProps) => {
  const { t } = useTranslation(['account_book']);
  const { updateAccountBookTag } = useUserCtx();

  const [tag, setTag] = useState<WORK_TAG>(accountBookToChangeTag.tag);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen((prevState) => !prevState);
  };

  const closeChangeTagModal = () => {
    setAccountBookToChangeTag(undefined);
  };

  // Info: (20241113 - Liz) 打 API 變更公司的 tag
  const handleChangeTag = async () => {
    // Info: (20241114 - Liz) 防止重複點擊
    if (isLoading) return;

    // Info: (20241104 - Liz) 開始 API 請求時設為 loading 狀態
    setIsLoading(true);

    try {
      const success = await updateAccountBookTag({
        accountBookId: accountBookToChangeTag.id.toString(),
        tag,
      });

      if (!success) {
        loggerFront.log('變更公司標籤失敗');
        return;
      }

      // Info: (20241113 - Liz) 更新公司成功後清空表單並關閉 modal
      setTag(WORK_TAG.ALL);
      closeChangeTagModal();

      if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20241114 - Liz) This is a workaround to refresh the account book list after creating a new account book (if use filterSection)

      if (getAccountBookListByTeamId) await getAccountBookListByTeamId();
    } catch (error) {
      loggerFront.error('ChangeTagModal handleChangeTag error:', error);
    } finally {
      // Info: (20241104 - Liz) API 回傳後解除 loading 狀態
      setIsLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-90vw flex-col rounded-lg bg-surface-neutral-surface-lv2 tablet:w-400px">
        <section className="relative flex items-center justify-center px-20px py-16px">
          <h1 className="text-center text-xl font-bold text-card-text-primary">
            {t('account_book:ACCOUNT_BOOKS_PAGE_BODY.CHANGE_WORK_TAG')}
          </h1>
          <button
            type="button"
            onClick={closeChangeTagModal}
            className="absolute right-20px text-icon-surface-single-color-primary"
          >
            <IoCloseOutline size={24} />
          </button>
        </section>

        <section className="flex flex-col gap-lv-5 px-lv-7 py-lv-4">
          {/* Info: (20241025 - Liz) Company Name */}
          <div className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('account_book:INFO.COMPANY_NAME')}
            </h4>
            <input
              disabled
              type="text"
              placeholder="Enter number"
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
              value={accountBookToChangeTag.name}
            />
          </div>

          {/* Info: (20241112 - Liz) Work Tag / Company Tag */}
          <div className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('account_book:INFO.WORK_TAG')}
            </h4>

            <div className="relative flex">
              <button
                type="button"
                className="flex flex-auto items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM"
                onClick={toggleDropdown}
              >
                <p className="px-12px py-10px text-base font-medium">
                  {t(`account_book:WORK_TAG.${tag.toUpperCase()}`)}
                </p>

                <div className="px-12px py-10px">
                  {isDropdownOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute inset-0 top-full z-10 flex h-max w-full translate-y-8px flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                  {Object.values(WORK_TAG).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setTag(item);
                        toggleDropdown();
                      }}
                      className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                    >
                      {t(`account_book:WORK_TAG.${item.toUpperCase()}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="flex justify-end gap-12px px-40px py-16px">
          <button
            type="button"
            onClick={closeChangeTagModal}
            className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
          >
            {t('account_book:ACCOUNT_BOOKS_PAGE_BODY.CANCEL')}
          </button>

          <button
            type="button"
            onClick={handleChangeTag}
            disabled={isLoading}
            className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            <span>{t('account_book:ACCOUNT_BOOKS_PAGE_BODY.SAVE')}</span>
            <IoSaveOutline size={16} />
          </button>
        </section>
      </div>
    </main>
  );
};

export default ChangeTagModal;
