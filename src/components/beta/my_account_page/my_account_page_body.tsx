import React, { useState } from 'react';
import Image from 'next/image';
import { FaPlus } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { IPaginatedData } from '@/interfaces/pagination';
import { ILoginDevice } from '@/interfaces/login_device';
import UserInfo from '@/components/general/user_settings/user_info';
import TeamList from '@/components/beta/my_account_page/team_list';
import CreateTeamModal from '@/components/beta/my_account_page/create_team_modal';
import { Button } from '@/components/button/button';

interface MyAccountPageBodyProps {
  loginDevices: IPaginatedData<ILoginDevice[]> | null;
}

const MyAccountPageBody: React.FC<MyAccountPageBodyProps> = ({ loginDevices }) => {
  const { t } = useTranslation(['team']);
  const { userAuth } = useUserCtx();

  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);

  const loginDevice = loginDevices?.data[0]?.userAgent ?? '';
  const loginIP = loginDevices?.data[0]?.ipAddress ?? '';

  const toggleCreateTeamModal = () => {
    setIsCreateTeamModalOpen((prev) => !prev);
  };

  return (
    <div className="flex flex-col gap-40px">
      {/* Info: (20250613 - Julian) Mobile title */}
      <div className="flex items-center gap-lv-2 tablet:hidden">
        <p className="text-base font-semibold text-text-neutral-secondary">
          {t('team:MY_ACCOUNT_PAGE.PAGE_TITLE')}
        </p>
      </div>
      {/* Info: (20250217 - Julian) 使用者資訊 */}
      <div className="flex items-center gap-lv-4">
        <div className="flex items-center gap-lv-2 text-sm font-medium text-divider-text-lv-2">
          <Image src="/icons/user-identifier-card.svg" width={16} height={16} alt="info_icon" />
          <p>{t('team:MY_ACCOUNT_PAGE.USER_INFO_TITLE')}</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-4" />
      </div>

      <UserInfo
        userId={userAuth?.id ?? 1}
        username={userAuth?.name ?? ''}
        email={userAuth?.email ?? ''}
        loginDevice={loginDevice}
        loginIP={loginIP}
        imageId={userAuth?.imageId ?? ''}
        loginDevices={loginDevices}
      />

      {/* Info: (20250217 - Julian) 我的團隊 */}
      <div className="flex items-center gap-lv-4">
        <div className="flex items-center gap-lv-2 text-sm font-medium text-divider-text-lv-2">
          <Image src="/icons/building.svg" width={16} height={16} alt="info_icon" />
          <p>{t('team:MY_ACCOUNT_PAGE.MY_TEAM_TITLE')}</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-4" />
      </div>

      {/* Info: (20250217 - Julian) 團隊清單 */}
      <div className="flex flex-col items-center gap-lv-4">
        <Button
          type="button"
          variant="tertiary"
          className="ml-auto"
          onClick={toggleCreateTeamModal}
        >
          <FaPlus /> {t('team:MY_ACCOUNT_PAGE.ADD_TEAM_BTN')}
        </Button>

        <TeamList />
      </div>

      {/* Info: (20250217 - Julian) 新增團隊視窗 */}
      {isCreateTeamModalOpen && <CreateTeamModal modalVisibilityHandler={toggleCreateTeamModal} />}
    </div>
  );
};

export default MyAccountPageBody;
