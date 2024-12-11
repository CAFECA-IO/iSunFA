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
import SelectLanguageDropdown from '@/components/user_settings/select_language_dropdown';
import PhoneNumberInput from '@/components/user_settings/phone_number_input';

interface UserInfoFormProps {
  userSetting: IUserSetting | null;
}

const UserInfoForm: React.FC<UserInfoFormProps> = ({ userSetting: initialSetting }) => {
  const { t, i18n } = useTranslation(['setting', 'common']);
  const { userAuth } = useUserCtx();
  const { toastHandler } = useModalContext();
  const { trigger: updateUserSettingAPI } = APIHandler<IUserSetting>(APIName.USER_SETTING_UPDATE);

  const [userSetting, setUserSetting] = useState<IUserSetting | null>(initialSetting);
  const [isUpdateInput, setIsUpdateInput] = useState(false);
  const [formState, setFormState] = useState({
    firstName: initialSetting?.personalInfo.firstName || '',
    lastName: initialSetting?.personalInfo.lastName || '',
    country: (initialSetting?.personalInfo.country as LocaleKey) || (i18n.language as LocaleKey),
    phoneNumber: initialSetting?.personalInfo.phone || '',
    language: i18n.language as LocaleKey,
  });

  const updateUserSetting = async () => {
    if (!userSetting) return;

    try {
      const { success } = await updateUserSettingAPI({
        params: { userId: userAuth?.id },
        body: {
          ...userSetting,
          personalInfo: {
            ...userSetting.personalInfo,
            ...formState,
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
        setIsUpdateInput(false);
      } else {
        throw new Error();
      }
    } catch {
      toastHandler({
        id: ToastId.USER_SETTING_UPDATE_ERROR,
        type: ToastType.ERROR,
        content: t('setting:USER.UPDATE_ERROR'),
        closeable: true,
      });
    }
  };

  const handleInputChange = (field: keyof typeof formState, value: string | LocaleKey) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setIsUpdateInput(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateUserSetting();
  };

  const handleCancel = () => {
    setFormState({
      firstName: userSetting?.personalInfo.firstName || '',
      lastName: userSetting?.personalInfo.lastName || '',
      country: (userSetting?.personalInfo.country as LocaleKey) || (i18n.language as LocaleKey),
      phoneNumber: userSetting?.personalInfo.phone || '',
      language: i18n.language as LocaleKey,
    });
    setIsUpdateInput(false);
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
      <div className="grid grid-cols-2 gap-lv-7">
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-semibold text-input-text-primary"
            htmlFor="usersetting-firstname"
          >
            {t('setting:NORMAL.FIRST_NAME')}
          </label>
          <input
            id="usersetting-firstname"
            type="text"
            value={formState.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder={t('setting:NORMAL.EX_JOHN')}
            className="rounded-sm border border-input-stroke-input px-3 py-2 outline-none placeholder:text-input-text-input-placeholder"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-semibold text-input-text-primary"
            htmlFor="usersetting-lastname"
          >
            {t('setting:NORMAL.LAST_NAME')}
          </label>
          <input
            id="usersetting-lastname"
            type="text"
            value={formState.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder={t('setting:NORMAL.EX_DOE')}
            className="rounded-sm border border-input-stroke-input px-3 py-2 outline-none placeholder:text-input-text-input-placeholder"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <SelectCountryDropdown
          country={formState.country}
          onSelect={(value) => handleInputChange('country', value)}
        />
        <PhoneNumberInput
          countryCode={formState.country}
          onSelect={(value) => handleInputChange('country', value)}
          phoneNumber={formState.phoneNumber}
          onUpdate={(e) => handleInputChange('phoneNumber', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <SelectLanguageDropdown
          language={formState.language}
          onSelect={(value) => handleInputChange('language', value)}
        />
      </div>

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="secondaryBorderless"
          disabled={!isUpdateInput}
          onClick={handleCancel}
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
