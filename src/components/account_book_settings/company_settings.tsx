import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import CreateAccountBookModal from '@/components/beta/account_books_page/create_account_book_modal';
import AccountBookListModal from '@/components/account_book_settings/account_book_list_modal';

interface CompanySettingsProps {}

const CompanySettings: React.FC<CompanySettingsProps> = () => {
  const { t } = useTranslation(['setting', 'common']);

  const [isCreateAccountBookModalOpen, setIsCreateAccountBookModalOpen] = useState(false);
  const [isAccountBookListModalOpen, setIsAccountBookListModalOpen] = useState(false);

  const toggleCreateAccountBookModal = () => {
    setIsCreateAccountBookModalOpen((prev) => !prev);
  };

  const toggleAccountBookListModal = () => {
    setIsAccountBookListModalOpen((prev) => !prev);
  };

  return (
    <div className="flex flex-col">
      {isCreateAccountBookModalOpen && (
        <CreateAccountBookModal modalVisibilityHandler={toggleCreateAccountBookModal} />
      )}
      {isAccountBookListModalOpen && (
        <AccountBookListModal toggleModal={toggleAccountBookListModal} />
      )}
      <div id="company-setting-section" className="mb-lv-7 flex items-center gap-4">
        <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
        <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
          <Image src="/icons/asset_management_icon.svg" width={16} height={16} alt="company_icon" />
          <p>{t('setting:NORMAL.ACCOUNT_BOOK_SETTINGS')}</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-4" />
      </div>
      <button
        id="setting-add-company"
        type="button"
        className="group mb-lv-7 inline-flex items-center justify-start whitespace-nowrap rounded-xs border-none font-medium text-text-neutral-link hover:text-button-text-primary-hover focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:text-button-text-disable disabled:opacity-100"
        onClick={toggleCreateAccountBookModal}
      >
        <p className="flex gap-2">
          <Image src="/icons/plus.svg" width={16} height={16} alt="notice_icon" />
          <span>{t('setting:NORMAL.ADD_AN_ACCOUNT_BOOK')}</span>
        </p>
      </button>
      <button
        id="setting-list-company"
        type="button"
        className="group inline-flex items-center justify-start whitespace-nowrap rounded-xs border-none font-medium text-text-neutral-link hover:text-button-text-primary-hover focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:text-button-text-disable disabled:opacity-100"
        onClick={toggleAccountBookListModal}
      >
        <p className="flex gap-2">
          <Image src="/icons/notification-text.svg" width={16} height={16} alt="notice_icon" />
          <span>{t('setting:NORMAL.VIEW_ACCOUNT_BOOK_LIST')}</span>
        </p>
      </button>
    </div>
  );
};

export default CompanySettings;
