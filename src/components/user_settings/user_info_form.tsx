import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import APIHandler from '@/lib/utils/api_handler';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';
import { IUserSetting } from '@/interfaces/user_setting';
import { LocaleKey } from '@/constants/normal_setting';
import { ToastId } from '@/constants/toast_id';
import { APIName } from '@/constants/api_connection';
import { Button } from '@/components/button/button';
import SelectCountryDropdown from '@/components/user_settings/select_country_dropdown';
import SelectLauguageDropdown from '@/components/user_settings/select_language_dropdown';
import PhoneNumberInput from '@/components/user_settings/phone_number_input';

interface UserInfoFormProps {
  userSetting: IUserSetting | null;
}

const UserInfoForm: React.FC<UserInfoFormProps> = ({ userSetting: settingData }) => {
  const { i18n, t } = useTranslation(['setting', 'common']);
  const { userAuth } = useUserCtx();
  const { toastHandler } = useModalContext();
  const { trigger: updateUserSettingAPI } = APIHandler<IUserSetting>(APIName.USER_SETTING_UPDATE);
  const [userSetting, setUserSetting] = useState<IUserSetting | null>(settingData);
  const [isUpdateInput, setIsUpdateInput] = React.useState(false);
  const [firstName, setFirstName] = useState<string | undefined>();
  const [lastName, setLastName] = useState<string | undefined>();
  const [country, setCountry] = useState<LocaleKey | undefined>(LocaleKey.en);
  const [countryCode, setCountryCode] = useState<LocaleKey | undefined>(LocaleKey.en);
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>();
  const [language, setLanguage] = useState<LocaleKey>(i18n.language as LocaleKey);

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Info: (202412009 - tzuhan) Prevent page refresh
    updateUseSetting();
  };

  const handelCancel = () => {
    setFirstName(userSetting?.personalInfo.firstName ?? undefined);
    setLastName(userSetting?.personalInfo.lastName ?? undefined);
    setCountry(
      userSetting?.personalInfo.country
        ? (userSetting?.personalInfo.country as LocaleKey)
        : undefined
    );
    setCountryCode(
      userSetting?.personalInfo.country
        ? (userSetting?.personalInfo.country as LocaleKey)
        : undefined
    );
    setPhoneNumber(userSetting?.personalInfo.phone ?? undefined);
    setLanguage(i18n.language as LocaleKey);
    setIsUpdateInput(false);
  };

  useEffect(() => {
    if (userSetting) {
      setUserSetting(userSetting);
      setFirstName(userSetting.personalInfo.firstName);
      setLastName(userSetting.personalInfo.lastName);
      setPhoneNumber(userSetting.personalInfo.phone);
      setLanguage(i18n.language as LocaleKey);
      setCountry(userSetting.personalInfo.country as LocaleKey);
      setCountryCode(userSetting.personalInfo.country as LocaleKey);
    }
  }, [userSetting]);

  const handleFirstNameUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirstName(e.target.value);
    if (e.target.value !== userSetting?.personalInfo.firstName) {
      setIsUpdateInput(true);
    } else {
      setIsUpdateInput(false);
    }
  };

  const handleLastNameUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value);
    if (e.target.value !== userSetting?.personalInfo.lastName) {
      setIsUpdateInput(true);
    } else {
      setIsUpdateInput(false);
    }
  };

  const handleCountryCodeSelect = (selected: LocaleKey | undefined) => {
    setCountryCode(selected);
    if (selected !== userSetting?.personalInfo.country) {
      setIsUpdateInput(true);
    } else {
      setIsUpdateInput(false);
    }
  };

  const handlePhoneNumberUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
    if (e.target.value !== userSetting?.personalInfo.phone) {
      setIsUpdateInput(true);
    } else {
      setIsUpdateInput(false);
    }
  };

  const handleCountrySelect = (selected: LocaleKey | undefined) => {
    setCountry(selected);
    if (selected !== userSetting?.personalInfo.country) {
      setIsUpdateInput(true);
    } else {
      setIsUpdateInput(false);
    }
  };

  const handleLanguageSelect = (selected: LocaleKey) => {
    setLanguage(selected);
    if (selected !== userSetting?.personalInfo.language) {
      setIsUpdateInput(true);
    } else {
      setIsUpdateInput(false);
    }
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
            onChange={handleFirstNameUpdate}
            placeholder={t('setting:NORMAL.EX_JOHN')}
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
            onChange={handleLastNameUpdate}
            placeholder={t('setting:NORMAL.EX_DOE')}
            className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-lv-7">
        <SelectCountryDropdown country={country} onSelect={handleCountrySelect} />
        <PhoneNumberInput
          countryCode={countryCode}
          onSelect={handleCountryCodeSelect}
          phoneNumber={phoneNumber}
          onUpdate={handlePhoneNumberUpdate}
        />
      </div>
      <div className="grid grid-cols-2 gap-lv-7">
        <SelectLauguageDropdown language={language} onSelect={handleLanguageSelect} />
      </div>
      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="secondaryBorderless"
          disabled={!isUpdateInput}
          onClick={handelCancel}
        >
          {t('common:COMMON.CANCEL')}
        </Button>
        <Button type="submit" variant="default" disabled={!isUpdateInput}>
          {t('common:COMMON.SAVE')}
        </Button>
      </div>
    </form>
  );
};

export default UserInfoForm;
