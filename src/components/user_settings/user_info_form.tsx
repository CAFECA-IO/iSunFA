import React from 'react';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/button/button';
import { LocaleKey } from '@/constants/normal_setting';
import SelectCountryDropdown from '@/components/user_settings/select_country_dropdown';
import SelectLauguageDropdown from '@/components/user_settings/select_language_dropdown';
import PhoneNumberInput from '@/components/user_settings/phone_number_input';
import { useRouter } from 'next/router';

interface UserInfoFormProps {
  firstName: string | undefined;
  setFirstName: React.Dispatch<React.SetStateAction<string | undefined>>;
  lastName: string | undefined;
  setLastName: React.Dispatch<React.SetStateAction<string | undefined>>;
  country: LocaleKey | null;
  setCountry: React.Dispatch<React.SetStateAction<LocaleKey | null>>;
  language: LocaleKey;
  setLanguage: React.Dispatch<React.SetStateAction<LocaleKey>>;
  countryCode: LocaleKey;
  setCountryCode: React.Dispatch<React.SetStateAction<LocaleKey>>;
  phoneNumber: string | undefined;
  setPhoneNumber: React.Dispatch<React.SetStateAction<string | undefined>>;
  onSubmit: () => void;
}

const UserInfoForm: React.FC<UserInfoFormProps> = ({
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
  const { locale } = useRouter();
  const [updateInput, setUpdateInput] = React.useState(false);
  const [isCancelled, setIsCancelled] = React.useState(false);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Info: (202412009 - tzuhan) Prevent page refresh
    onSubmit();
  };

  React.useEffect(() => {
    if (!isCancelled) {
      if (!updateInput) setUpdateInput(true);
    } else {
      setIsCancelled(false);
    }
  }, [firstName, lastName, country, language, countryCode, phoneNumber]);

  const handelCancel = () => {
    setIsCancelled(true);
    setFirstName(undefined);
    setLastName(undefined);
    setCountry(null);
    setLanguage(locale as LocaleKey);
    setCountryCode(LocaleKey.en);
    setPhoneNumber(undefined);
    setUpdateInput(false);
  };

  return (
    <form className="flex flex-col gap-lv-7" onSubmit={handleSubmit}>
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
        <Button
          type="button"
          variant="secondaryBorderless"
          disabled={!updateInput}
          onClick={handelCancel}
        >
          {t('common:COMMON.CANCEL')}
        </Button>
        <Button type="submit" variant="default" disabled={!updateInput}>
          {t('common:COMMON.SAVE')}
        </Button>
      </div>
    </form>
  );
};

export default UserInfoForm;
