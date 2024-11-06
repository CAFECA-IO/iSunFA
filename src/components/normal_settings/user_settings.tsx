import React from 'react';
import { useUserCtx } from '@/contexts/user_context';
import { DEFAULT_AVATAR_URL } from '@/constants/display';
import { LocaleKey } from '@/constants/normal_setting';
import UserInfo from '@/components/normal_settings/user_info';
import UserInfoForm from '@/components/normal_settings/user_info_form';

interface UserSettingsProps {}

const UserSettings: React.FC<UserSettingsProps> = () => {
  const { userAuth } = useUserCtx();
  const username = userAuth?.name ?? 'Joyce';
  const email = userAuth?.email ?? 'Test01@gmail.com';
  const loginDevice = 'Macos Chrome';
  const loginIP = '211.22.118.145';
  const imageId = userAuth?.imageId ?? DEFAULT_AVATAR_URL;

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [country, setCountry] = React.useState<LocaleKey | null>(null);
  const [language, setLanguage] = React.useState<LocaleKey>(LocaleKey.en);
  const [countryCode, setCountryCode] = React.useState<LocaleKey>(LocaleKey.en);
  const [phoneNumber, setPhoneNumber] = React.useState('');

  return (
    <>
      <UserInfo
        username={username}
        email={email}
        loginDevice={loginDevice}
        loginIP={loginIP}
        imageId={imageId}
      />
      <UserInfoForm
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
      />
    </>
  );
};

export default UserSettings;
