import React, { useEffect, useState, useCallback } from 'react';
import { IoSaveOutline } from 'react-icons/io5';
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
import SelectCountryDropdown from '@/components/general/user_settings/select_country_dropdown';
import SelectLanguageDropdown from '@/components/general/user_settings/select_language_dropdown';
import PhoneNumberInput from '@/components/general/user_settings/phone_number_input';
import { toConstantCase } from '@/lib/utils/common';

interface UserInfoFormProps {
  userSetting: IUserSetting | null;
  handleUsernameUpdate: (newName: string) => void;
  name: string;
}

const UserInfoForm: React.FC<UserInfoFormProps> = ({
  userSetting: initialSetting,
  handleUsernameUpdate,
  name,
}) => {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const { userAuth } = useUserCtx();
  const { toastHandler } = useModalContext();
  const { trigger: updateUserSettingAPI } = APIHandler<IUserSetting>(APIName.USER_SETTING_UPDATE);

  const [userSetting, setUserSetting] = useState<IUserSetting | null>(initialSetting);
  const [formState, setFormState] = useState(() => ({
    firstName: initialSetting?.personalInfo.firstName || '',
    lastName: initialSetting?.personalInfo.lastName || '',
    country: (initialSetting?.personalInfo.country as LocaleKey) || (i18n.language as LocaleKey),
    phoneNumber: initialSetting?.personalInfo.phone || '',
    language: i18n.language as LocaleKey,
  }));

  const isSaveDisabled =
    !formState.firstName ||
    !formState.lastName ||
    `${formState.firstName} ${formState.lastName}` === name;

  const handleInputChange = useCallback(
    (field: keyof typeof formState, value: string | LocaleKey) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const updateUserSetting = async () => {
    if (!userSetting) return;

    try {
      const { success } = await updateUserSettingAPI({
        params: { userId: userAuth?.id },
        body: {
          ...userSetting,
          personalInfo: { ...userSetting.personalInfo, ...formState },
        },
      });

      if (success) {
        toastHandler({
          id: ToastId.USER_SETTING_UPDATE_SUCCESS,
          type: ToastType.SUCCESS,
          content: t('settings:USER.UPDATE_SUCCESS'),
          closeable: true,
        });
        handleUsernameUpdate(`${formState.firstName} ${formState.lastName}`);
      } else {
        throw new Error('Failed to update user settings.');
      }
    } catch (error) {
      toastHandler({
        id: ToastId.USER_SETTING_UPDATE_ERROR,
        type: ToastType.ERROR,
        content: t('settings:USER.UPDATE_ERROR', { reason: (error as Error).message }),
        closeable: true,
      });
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateUserSetting();
  };

  const handleCancel = () => {
    if (userSetting) {
      setFormState({
        firstName: userSetting.personalInfo.firstName || '',
        lastName: userSetting.personalInfo.lastName || '',
        country: (userSetting.personalInfo.country as LocaleKey) || (i18n.language as LocaleKey),
        phoneNumber: userSetting.personalInfo.phone || '',
        language: i18n.language as LocaleKey,
      });
    }
  };

  useEffect(() => {
    if (initialSetting) {
      setUserSetting(initialSetting);
      setFormState({
        firstName: initialSetting.personalInfo.firstName || '',
        lastName: initialSetting.personalInfo.lastName || '',
        country: (initialSetting.personalInfo.country as LocaleKey) || (i18n.language as LocaleKey),
        phoneNumber: initialSetting.personalInfo.phone || '',
        language: i18n.language as LocaleKey,
      });
    }
  }, [initialSetting]);

  return (
    <form className="flex flex-col gap-lv-7" onSubmit={handleSubmit}>
      {/* Info: (20241218 - tzuhan) First and Last Name Inputs */}
      <div className="grid grid-cols-1 gap-lv-7 tablet:grid-cols-2">
        {['firstName', 'lastName'].map((field) => (
          <div key={field} className="flex flex-col gap-8px">
            <label
              htmlFor={`user-settings-${field}`}
              className="text-sm font-semibold text-input-text-primary"
            >
              {t(`settings:NORMAL.${toConstantCase(field)}`)}
            </label>
            <input
              id={`user-settings-${field}`}
              type="text"
              value={formState[field as 'firstName' | 'lastName']}
              onChange={(e) => handleInputChange(field as keyof typeof formState, e.target.value)}
              placeholder={t(`settings:NORMAL.EX_${field === 'firstName' ? 'JOHN' : 'DOE'}`)}
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-3 py-2 outline-none placeholder:text-input-text-input-placeholder"
            />
          </div>
        ))}
      </div>

      {/* Info: (20241218 - tzuhan) Country and Phone Inputs */}
      <div className="grid grid-cols-1 gap-lv-7 tablet:grid-cols-2">
        <SelectCountryDropdown
          countryCode={formState.country}
          onSelect={(value) => handleInputChange('country', value)}
        />
        <PhoneNumberInput
          countryCode={formState.country}
          phoneNumber={formState.phoneNumber}
          onSelect={(value) => handleInputChange('country', value)}
          onUpdate={(e) => handleInputChange('phoneNumber', e.target.value)}
        />
      </div>

      {/* Info: (20241218 - tzuhan) Language Dropdown */}
      <div className="grid grid-cols-2 gap-lv-7">
        <SelectLanguageDropdown
          language={formState.language}
          onSelect={(value) => handleInputChange('language', value)}
        />
      </div>

      {/* Info: (20241218 - tzuhan) Buttons */}
      <div className="flex justify-end gap-24px">
        <Button type="button" variant="secondaryBorderless" size="small" onClick={handleCancel}>
          {t('common:COMMON.CANCEL')}
        </Button>
        <Button type="submit" variant="default" size="small" disabled={isSaveDisabled}>
          {t('common:COMMON.SAVE')}
          <IoSaveOutline size={16} />
        </Button>
      </div>
    </form>
  );
};

export default UserInfoForm;
