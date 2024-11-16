import React, { useState } from 'react';
import { LocaleKey } from '@/constants/normal_setting';
import UserInfo from '@/components/user_settings/user_info';
import UserInfoForm from '@/components/user_settings/user_info_form';
import APIHandler from '@/lib/utils/api_handler';
import { IUserSetting } from '@/interfaces/user_setting';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { useTranslation } from 'react-i18next';
import { IPaginatedData } from '@/interfaces/pagination';
import { IUserActionLog } from '@/interfaces/user_action_log';

interface UserSettingsProps {
  userSetting: IUserSetting | null;
  userActionLogs: IPaginatedData<IUserActionLog[]> | null;
}

const UserSettings: React.FC<UserSettingsProps> = ({ userSetting, userActionLogs }) => {
  const { t } = useTranslation(['setting', 'common']);
  const { userAuth } = useUserCtx();
  const { id: userId, name: username, email, imageId } = userAuth!;
  const loginDevice = userActionLogs ? userActionLogs.data[0].userAgent : '';
  const loginIP = userActionLogs ? userActionLogs.data[0].ipAddress : '';

  const [firstName, setFirstName] = useState<string>(userSetting?.personalInfo.firstName || '');
  const [lastName, setLastName] = useState<string>(userSetting?.personalInfo.lastName || '');
  const [country, setCountry] = useState<LocaleKey | null>(null);
  const [language, setLanguage] = useState<LocaleKey>(
    (userSetting?.personalInfo.country as LocaleKey) || LocaleKey.en
  ); // Info: (20241114 - tzuhan) @Jacky 這裡也需要改成 LocalKey
  const [countryCode, setCountryCode] = useState<LocaleKey>(LocaleKey.en); // Info: (20241114 - tzuhan) @Jacky 這裡也需要提供 countryCode
  const [phoneNumber, setPhoneNumber] = useState<string>(userSetting?.personalInfo.phone || '');
  const { toastHandler } = useModalContext();
  const { trigger: updateUserSettingAPI } = APIHandler<IUserSetting>(APIName.USER_SETTING_UPDATE);

  const updateUseSetting = async () => {
    if (!userSetting) return;
    const { success } = await updateUserSettingAPI({
      params: { userId },
      body: {
        ...userSetting,
        notificationSetting: {
          ...userSetting.notificationSetting,
        },
        personalInfo: {
          ...userSetting.personalInfo,
          firstName,
          lastName,
          country,
          language,
          phone: phoneNumber,
        },
      },
    });
    if (success) {
      toastHandler({
        id: ToastId.USER_SETTING_UPDATE_SUCCESS, // ToDo:  (20241114 - tzuhan) 跟設計師確認更新成功或失敗的UI
        type: ToastType.SUCCESS,
        content: t('setting:USER.UPDATE_SUCCESS'),
        closeable: true,
      });
    }
  };

  return (
    <>
      <UserInfo
        userId={userId}
        username={username}
        email={email}
        loginDevice={loginDevice}
        loginIP={loginIP}
        imageId={imageId}
        userActionLogs={userActionLogs}
      />
      <UserInfoForm
        userSetting={userSetting}
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        country={country}
        setCountry={setCountry}
        language={language}
        setLanguage={setLanguage}
        countryCode={countryCode}
        setCountryCode={setCountryCode}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        onSubmit={updateUseSetting}
      />
    </>
  );
};

export default UserSettings;
