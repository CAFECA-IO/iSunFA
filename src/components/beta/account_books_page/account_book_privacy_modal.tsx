import { Dispatch, SetStateAction, useState } from 'react';
import { ACCOUNT_BOOK_UPDATE_ACTION, IAccountBookForUserWithTeam } from '@/interfaces/account_book';
import { IoCloseOutline, IoSaveOutline } from 'react-icons/io5';
import { useTranslation } from 'next-i18next';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';

interface AccountBookPrivacyModalProps {
  accountBookToChangePrivacy: IAccountBookForUserWithTeam;
  setAccountBookToChangePrivacy: Dispatch<SetStateAction<IAccountBookForUserWithTeam | undefined>>;
}

const AccountBookPrivacyModal = ({
  accountBookToChangePrivacy,
  setAccountBookToChangePrivacy,
}: AccountBookPrivacyModalProps) => {
  const { t } = useTranslation(['account_book']);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Info: (20250313 - Liz) 變更帳本隱私權 API
  const { trigger: changeAccountBookPrivacyAPI } = APIHandler<IAccountBookForUserWithTeam>(
    APIName.UPDATE_ACCOUNT_BOOK
  );

  const closeAccountBookPrivacyModal = () => {
    setAccountBookToChangePrivacy(undefined);
  };

  // Info: (20250313 - Liz) 打 API 變更帳本隱私權
  const handleSubmit = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { success } = await changeAccountBookPrivacyAPI({
        params: { accountBookId: accountBookToChangePrivacy.company.id },
        body: {
          action: ACCOUNT_BOOK_UPDATE_ACTION.UPDATE_VISIBILITY,
          isPrivate,
        },
      });

      if (!success) {
        // Deprecated: (20250313 - Liz)
        // eslint-disable-next-line no-console
        console.error('打 API 變更帳本隱私權失敗');
      }
      closeAccountBookPrivacyModal();
    } catch (error) {
      // Deprecated: (20250313 - Liz)
      // eslint-disable-next-line no-console
      console.error('打 API 變更帳本隱私權失敗', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col gap-24px rounded-lg bg-surface-neutral-surface-lv2 p-40px">
        <section className="flex items-center">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {t('account_book:ACCOUNT_BOOK_PRIVACY_MODAL.CHANGE_ACCOUNT_BOOK_PRIVACY')}
          </h1>
          <button type="button" onClick={closeAccountBookPrivacyModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>

        <div className="flex flex-col gap-40px">
          {/* // Info: (20250227 - Liz) Account Book View (Privacy) */}
          <section className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.ACCOUNT_BOOK_PRIVACY')}
            </h4>
            <div className="flex items-center gap-40px">
              <button
                type="button"
                className={`group flex items-center gap-8px ${!isPrivate && 'pointer-events-none'}`}
                onClick={() => setIsPrivate(false)}
              >
                <span
                  className={`flex h-16px w-16px items-center justify-center rounded-full border border-checkbox-stroke-unselected bg-checkbox-surface-unselected disabled:border-checkbox-stroke-disable disabled:bg-checkbox-surface-disable group-hover:border-checkbox-stroke-unselected group-hover:bg-checkbox-surface-hover`}
                >
                  {!isPrivate && (
                    <span className="h-10px w-10px rounded-full bg-checkbox-surface-selected"></span>
                  )}
                </span>
                {t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.PUBLIC')}
              </button>

              <button
                type="button"
                className={`group flex items-center gap-8px ${isPrivate && 'pointer-events-none'}`}
                onClick={() => setIsPrivate(true)}
              >
                <span
                  className={`flex h-16px w-16px items-center justify-center rounded-full border border-checkbox-stroke-unselected bg-checkbox-surface-unselected disabled:border-checkbox-stroke-disable disabled:bg-checkbox-surface-disable group-hover:border-checkbox-stroke-unselected group-hover:bg-checkbox-surface-hover`}
                >
                  {isPrivate && (
                    <span className="h-10px w-10px rounded-full bg-checkbox-surface-selected"></span>
                  )}
                </span>
                {t('dashboard:CREATE_ACCOUNT_BOOK_MODAL.PRIVATE')}
              </button>
            </div>
          </section>

          <section className="flex justify-end gap-12px">
            <button
              type="button"
              onClick={closeAccountBookPrivacyModal}
              className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
            >
              {t('account_book:ACCOUNT_BOOK_TRANSFER_MODAL.CANCEL')}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            >
              <span>{t('account_book:ACCOUNT_BOOKS_PAGE_BODY.SAVE')}</span>
              <IoSaveOutline size={16} />
            </button>
          </section>
        </div>
      </div>
    </main>
  );
};

export default AccountBookPrivacyModal;
