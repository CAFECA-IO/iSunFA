import React from 'react';
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
  const loginDevice = userActionLogs ? userActionLogs.data[0].userAgent : '';
  const loginIP = userActionLogs ? userActionLogs.data[0].ipAddress : '';

  return (
    <>
      <UserInfo
        userId={userAuth?.id ?? 1}
        username={userAuth?.name ?? ''}
        email={userAuth?.email ?? ''}
        loginDevice={loginDevice}
        loginIP={loginIP}
        imageId={userAuth?.imageId ?? ''}
        userActionLogs={userActionLogs}
      />
      <UserInfoForm userSetting={userSetting} />
    </>
  );
};

export default UserSettings;
