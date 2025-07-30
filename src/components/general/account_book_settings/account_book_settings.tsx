import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import AccountBookInfoModal from '@/components/beta/account_books_page/account_book_info_modal';
import AccountBookListModal from '@/components/general/account_book_settings/account_book_list_modal';

const AccountBookSettings = () => {
  const { t } = useTranslation(['settings']);

  const [isCreateAccountBookModalOpen, setIsCreateAccountBookModalOpen] = useState<boolean>(false);
  const [isAccountBookListModalOpen, setIsAccountBookListModalOpen] = useState<boolean>(false);

  const openCreateAccountBookModal = () => setIsCreateAccountBookModalOpen(true);
  const closeCreateAccountBookModal = () => setIsCreateAccountBookModalOpen(false);
  const openAccountBookListModal = () => setIsAccountBookListModalOpen(true);
  const closeToggleAccountBookListModal = () => setIsAccountBookListModalOpen(false);

  return (
    <main className="flex flex-col gap-40px">
      <section className="flex items-center gap-16px">
        <div className="flex items-center gap-8px">
          <Image src="/icons/asset_management_icon.svg" width={16} height={16} alt="company_icon" />
          <span className="text-sm font-medium text-divider-text-lv-2">
            {t('settings:NORMAL.ACCOUNT_BOOK_SETTINGS')}
          </span>
        </div>
        <hr className="flex-auto border-t border-divider-stroke-lv-4" />
      </section>

      <section className="flex flex-col items-start gap-24px">
        <button
          type="button"
          className="text-sm font-semibold text-link-text-primary hover:text-link-text-primary-hover disabled:text-link-text-disable"
          onClick={openCreateAccountBookModal}
        >
          {t('settings:NORMAL.ADD_AN_ACCOUNT_BOOK')}
        </button>

        <button
          type="button"
          className="text-sm font-semibold text-link-text-primary hover:text-link-text-primary-hover disabled:text-link-text-disable"
          onClick={openAccountBookListModal}
        >
          {t('settings:NORMAL.VIEW_ACCOUNT_BOOK_LIST')}
        </button>
      </section>

      {/* Info: (20250417 - Liz) modals */}
      {isCreateAccountBookModalOpen && (
        <AccountBookInfoModal closeAccountBookInfoModal={closeCreateAccountBookModal} />
      )}
      {isAccountBookListModalOpen && (
        <AccountBookListModal closeToggleAccountBookListModal={closeToggleAccountBookListModal} />
      )}
    </main>
  );
};

export default AccountBookSettings;
