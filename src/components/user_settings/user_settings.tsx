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
  const loginDevice = userActionLogs ? userActionLogs.data[0].userAgent : '';
  const loginIP = userActionLogs ? userActionLogs.data[0].ipAddress : '';

  const [firstName, setFirstName] = useState<string | undefined>();
  const [lastName, setLastName] = useState<string | undefined>();
  const [country, setCountry] = useState<LocaleKey | null>(null);
  const [language, setLanguage] = useState<LocaleKey>(
    (userSetting?.personalInfo.language as LocaleKey) || LocaleKey.en
  );
  const [countryCode, setCountryCode] = useState<LocaleKey>(
    (userSetting?.personalInfo.country as LocaleKey) || LocaleKey.en
  ); // Info: (20241114 - tzuhan) @Jacky 這裡也需要提供 countryCode
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>();
  const { toastHandler } = useModalContext();
  const { trigger: updateUserSettingAPI } = APIHandler<IUserSetting>(APIName.USER_SETTING_UPDATE);

  const updateUseSetting = async () => {
    if (!userSetting) return;
    try {
      const { success } = await updateUserSettingAPI({
        params: { userId: userAuth?.id },
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
          id: ToastId.USER_SETTING_UPDATE_SUCCESS,
          type: ToastType.SUCCESS,
          content: t('setting:USER.UPDATE_SUCCESS'),
          closeable: true,
        });
      } else {
        throw new Error(t('setting:USER.UPDATE_ERROR'));
      }
    } catch (error) {
      toastHandler({
        id: ToastId.USER_SETTING_UPDATE_SUCCESS,
        type: ToastType.ERROR,
        content: t('setting:USER.UPDATE_ERROR'),
        closeable: true,
      });
    }
  };

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
