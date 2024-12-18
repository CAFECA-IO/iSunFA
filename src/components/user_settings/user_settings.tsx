import React, { useState, useMemo, useEffect } from 'react';
import { useUserCtx } from '@/contexts/user_context';
import { IPaginatedData } from '@/interfaces/pagination';
import { IUserSetting } from '@/interfaces/user_setting';
import { IUserActionLog } from '@/interfaces/user_action_log';
import UserInfo from '@/components/user_settings/user_info';
import UserInfoForm from '@/components/user_settings/user_info_form';

interface UserSettingsProps {
  userSetting: IUserSetting | null;
  userActionLogs: IPaginatedData<IUserActionLog[]> | null;
}

const UserSettings: React.FC<UserSettingsProps> = ({ userSetting, userActionLogs }) => {
  const { userAuth } = useUserCtx();

  // Info: (20241218 - tzuhan) 計算用戶名稱：優先使用 userSetting，否則使用 userAuth
  const getUserName = useMemo(() => {
    if (userSetting?.personalInfo?.firstName || userSetting?.personalInfo?.lastName) {
      return `${userSetting.personalInfo.firstName ?? ''} ${userSetting.personalInfo.lastName ?? ''}`.trim();
    }
    return userAuth?.name ?? '';
  }, [userSetting, userAuth]);

  const [name, setName] = useState<string>(getUserName);

  const loginDevice = userActionLogs?.data[0]?.userAgent ?? '';
  const loginIP = userActionLogs?.data[0]?.ipAddress ?? '';

  const handleUsernameUpdate = (newName: string) => {
    setName(newName);
  };

  useEffect(() => {
    setName(getUserName);
  }, [userSetting]);

  return (
    <>
      <UserInfo
        userId={userAuth?.id ?? 1}
        username={name}
        email={userAuth?.email ?? ''}
        loginDevice={loginDevice}
        loginIP={loginIP}
        imageId={userAuth?.imageId ?? ''}
        userActionLogs={userActionLogs}
      />
      <UserInfoForm
        name={name}
        userSetting={userSetting}
        handleUsernameUpdate={handleUsernameUpdate}
      />
    </>
  );
};

export default UserSettings;
