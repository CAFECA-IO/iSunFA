import React from 'react';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/button/button';
import { LocaleKey } from '@/constants/normal_setting';
import SelectCountryDropdown from '@/components/user_settings/select_country_dropdown';
import SelectLauguageDropdown from '@/components/user_settings/select_language_dropdown';
import PhoneNumberInput from '@/components/user_settings/phone_number_input';
import { IUserSetting } from '@/interfaces/user_setting';

interface UserInfoFormProps {
  userSetting: IUserSetting | null;
  firstName: string;
  setFirstName: React.Dispatch<React.SetStateAction<string>>;
  lastName: string;
  setLastName: React.Dispatch<React.SetStateAction<string>>;
  country: LocaleKey | null;
  setCountry: React.Dispatch<React.SetStateAction<LocaleKey | null>>;
  language: LocaleKey;
  setLanguage: React.Dispatch<React.SetStateAction<LocaleKey>>;
  countryCode: LocaleKey;
  setCountryCode: React.Dispatch<React.SetStateAction<LocaleKey>>;
  phoneNumber: string;
  setPhoneNumber: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => void;
}

const UserInfoForm: React.FC<UserInfoFormProps> = ({
  userSetting,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  country,
  setCountry,
  language,
  setLanguage,
  countryCode,
  setCountryCode,
  phoneNumber,
  setPhoneNumber,
  onSubmit,
}) => {
  const { t } = useTranslation(['setting', 'common']);
  return (
    <form className="flex flex-col gap-lv-7" onSubmit={onSubmit}>
      <div className="grid grid-cols-2 gap-lv-7">
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('setting:NORMAL.FIRST_NAME')}
          </p>
          <input
            id="note-input"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t('setting:NORMAL.FIRST_NAME')}
            className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
          />
        </div>
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('setting:NORMAL.LAST_NAME')}
          </p>
          <input
            id="note-input"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t('setting:NORMAL.LAST_NAME')}
            className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-lv-7">
        <SelectCountryDropdown country={country} setCountry={setCountry} />

        <PhoneNumberInput
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
        />
      </div>
      <div className="grid grid-cols-2 gap-lv-7">
        <SelectLauguageDropdown language={language} setLanguage={setLanguage} />
      </div>
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="secondaryBorderless">
          {t('common:COMMON.CANCEL')}
        </Button>
        <Button type="submit" variant="default" disabled={!userSetting}>
          {t('common:COMMON.SAVE')}
        </Button>
      </div>
    </form>
  );
};

export default UserInfoForm;
