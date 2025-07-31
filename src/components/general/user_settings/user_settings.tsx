import React, { useState, useMemo, useEffect } from 'react';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';
import { IPaginatedData } from '@/interfaces/pagination';
import { IUserSetting } from '@/interfaces/user_setting';
import UserInfo from '@/components/general/user_settings/user_info';
import UserInfoForm from '@/components/general/user_settings/user_info_form';
import Image from 'next/image';
import { ILoginDevice } from '@/interfaces/login_device';

interface UserSettingsProps {
  userSetting: IUserSetting | null;
  loginDevices: IPaginatedData<ILoginDevice[]> | null;
}

const UserSettings: React.FC<UserSettingsProps> = ({ userSetting, loginDevices }) => {
  const { userAuth } = useUserCtx();
  const { t } = useTranslation(['settings']);

  // Info: (20241218 - tzuhan) 計算用戶名稱：優先使用 userSetting，否則使用 userAuth
  const getUserName = useMemo(() => {
    if (userSetting?.personalInfo?.firstName || userSetting?.personalInfo?.lastName) {
      return `${userSetting.personalInfo.firstName ?? ''} ${userSetting.personalInfo.lastName ?? ''}`.trim();
    }
    return userAuth?.name ?? '';
  }, [userSetting, userAuth]);

  const [name, setName] = useState<string>(getUserName);

  const loginDevice = loginDevices?.data[0]?.userAgent ?? '';
  const loginIP = loginDevices?.data[0]?.ipAddress ?? '';

  const handleUsernameUpdate = (newName: string) => {
    setName(newName);
  };

  useEffect(() => {
    setName(getUserName);
  }, [userSetting]);

  return (
    <main className="flex flex-col gap-40px">
      <section className="flex items-center gap-lv-4">
        <div className="flex items-center gap-lv-2">
          <Image src="/icons/user-identifier-card.svg" width={16} height={16} alt="info_icon" />
          <span className="text-sm font-medium text-divider-text-lv-2">
            {t('settings:NORMAL.USER_SETTINGS')}
          </span>
        </div>
        <hr className="flex-auto border-t border-divider-stroke-lv-4" />
      </section>

      <div className="mx-auto flex max-w-726px flex-col gap-lv-7">
        <UserInfo
          userId={userAuth?.id ?? 1}
          username={name}
          email={userAuth?.email ?? ''}
          loginDevice={loginDevice}
          loginIP={loginIP}
          imageId={userAuth?.imageId ?? ''}
          loginDevices={loginDevices}
        />
        <UserInfoForm
          name={name}
          userSetting={userSetting}
          handleUsernameUpdate={handleUsernameUpdate}
        />
      </div>
    </main>
  );
};

export default UserSettings;
