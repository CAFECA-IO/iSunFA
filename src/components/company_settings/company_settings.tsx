import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { Button } from '@/components/button/button';
import CreateCompanyModal from '@/components/beta/my_company_list_page/create_company_modal';
import CompanyListModal from '@/components/company_settings/company_list_modal';

interface CompanySettingsProps {}

const CompanySettings: React.FC<CompanySettingsProps> = () => {
  const { t } = useTranslation(['setting', 'common']);

  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [isCompanyListModalOpen, setIsCompanyListModalOpen] = useState(false);

  const toggleCreateCompanyModal = () => {
    setIsCreateCompanyModalOpen((prev) => !prev);
  };

  const toggleCompanyListModal = () => {
    setIsCompanyListModalOpen((prev) => !prev);
  };

  return (
    <div className="flex flex-col">
      <CreateCompanyModal
        toggleModal={toggleCreateCompanyModal}
        isModalOpen={isCreateCompanyModalOpen}
      />
      {isCompanyListModalOpen && <CompanyListModal toggleModal={toggleCompanyListModal} />}
      <div id="company-setting-section" className="mb-lv-7 flex items-center gap-4">
        <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
        <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
          <Image src="/icons/asset_management_icon.svg" width={16} height={16} alt="company_icon" />
          <p>{t('setting:NORMAL.COMPANY_SETTING')}</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-4" />
      </div>
      <Button
        id="setting-add-company"
        type="button"
        variant="linkBorderless"
        className="mb-lv-7 justify-start p-0"
        onClick={toggleCreateCompanyModal}
      >
        <p className="flex gap-2">
          <Image src="/icons/plus.svg" width={16} height={16} alt="notice_icon" />
          <span>{t('setting:NORMAL.ADD_A_COMPANY')}</span>
        </p>
      </Button>
      <Button
        id="setting-add-company"
        type="button"
        variant="linkBorderless"
        className="justify-start p-0"
        onClick={toggleCompanyListModal}
      >
        <p className="flex gap-2">
          <Image src="/icons/notification-text.svg" width={16} height={16} alt="notice_icon" />
          <span>{t('setting:NORMAL.VIEW_ALL_COMPANIES')}</span>
        </p>
      </Button>
    </div>
  );
};

export default CompanySettings;
