import React, { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { IoCloseOutline } from 'react-icons/io5';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ICompanySetting } from '@/interfaces/company_setting';
import { ICompanyAndRole } from '@/interfaces/company';
import { Button } from '@/components/button/button';
import { LocaleKey } from '@/constants/normal_setting';
import SelectCountryDropdown from '@/components/user_settings/select_country_dropdown';
import PhoneNumberInput from '@/components/user_settings/phone_number_input';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { ISUNFA_ROUTE } from '@/constants/url';

interface AccountBookEditModalProps {
  companyAndRole: ICompanyAndRole;
  toggleModal: () => void;
}

const AccountBookEditModal: React.FC<AccountBookEditModalProps> = ({
  companyAndRole,
  toggleModal,
}) => {
  const { t } = useTranslation(['setting', 'common', 'account_book']);
  const router = useRouter();
  const [companyName, setCompanyName] = React.useState('');
  const [businessTaxId, setBusinessTaxId] = React.useState('');
  const [taxSerialNumber, setTaxSerialNumber] = React.useState('');
  const [representativeName, setRepresentativeName] = React.useState('');
  const [companyAddress, setCompanyAddress] = React.useState('');
  const [country, setCountry] = React.useState<LocaleKey>(LocaleKey.en);
  const [countryCode, setCountryCode] = React.useState<LocaleKey>(LocaleKey.en);
  const [phoneNumber, setPhoneNumber] = React.useState<string | undefined>('');
  const { toastHandler, messageModalVisibilityHandler, messageModalDataHandler } =
    useModalContext();
  const { trigger: getCompanySettingAPI } = APIHandler<ICompanySetting>(
    APIName.COMPANY_SETTING_GET
  );
  const { trigger: updateAccountBookSettingAPI } = APIHandler(APIName.COMPANY_SETTING_UPDATE);
  const { trigger: deleteAccountBookAPI } = APIHandler(APIName.COMPANY_DELETE);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (companyAndRole) {
      try {
        const res = await updateAccountBookSettingAPI({
          params: {
            companyId: companyAndRole.company.id,
          },
          body: {
            companyName,
            companyTaxId: businessTaxId,
            taxSerialNumber,
            representativeName,
            address: companyAddress,
            country,
            countryCode,
            phone: phoneNumber,
          },
        });

        const { success } = res;
        if (success) {
          toastHandler({
            id: ToastId.ACCOUNT_BOOK_SETTING_UPDATE_SUCCESS,
            type: ToastType.SUCCESS,
            content: t('account_book:EDIT.UPDATE_SUCCESS'),
            closeable: true,
          });
          toggleModal();
        }
      } catch (err) {
        toastHandler({
          id: ToastId.ACCOUNT_BOOK_SETTING_UPDATE_ERROR,
          type: ToastType.ERROR,
          content: (err as Error).message,
          closeable: true,
        });
      }
    }
  };

  const procedureOfDelete = () => {
    if (!companyAndRole) return;
    messageModalVisibilityHandler();
    deleteAccountBookAPI({
      params: {
        companyId: companyAndRole.company.id,
      },
    });

    router.push(ISUNFA_ROUTE.DASHBOARD);
  };

  const deleteCompanyClickHandler = () => {
    if (!companyAndRole) return;
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('account_book:DELETE.TITLE'),
      content: t('account_book:DELETE.WARNING'),
      backBtnStr: t('common:COMMON.CANCEL'),
      submitBtnStr: t('setting:SETTINGS.REMOVE'),
      submitBtnFunction: procedureOfDelete,
    });
    messageModalVisibilityHandler();
  };

  const getCompanySetting = async () => {
    if (companyAndRole) {
      try {
        const res = await getCompanySettingAPI({
          params: { companyId: companyAndRole.company.id },
        });
        const { success, data } = res;
        if (success && data) {
          setCompanyName(data.companyName);
          setBusinessTaxId(data.companyTaxId);
          setTaxSerialNumber(data.taxSerialNumber);
          setRepresentativeName(data.representativeName);
          setCompanyAddress(data.address);
          setCountry(data.country as LocaleKey); // Info: (202411007 - Tzuhan)  需跟後端確認是否可以直接轉型
          setCountryCode(LocaleKey.en); // ToDo: (202411007 - Tzuhan) 需跟後端確認是否有 countryCode
          setPhoneNumber(data.phone);
        }
      } catch (err) {
        toastHandler({
          id: ToastId.COMPANY_SETTING_GET_ERROR,
          type: ToastType.ERROR,
          content: (err as Error).message,
          closeable: true,
        });
      }
    }
  };

  useEffect(() => {
    getCompanySetting();
  }, []);

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="ml-250px flex max-h-90vh flex-col gap-lv-5 overflow-y-hidden rounded-lg bg-surface-neutral-surface-lv2 p-lv-7">
        <section className="flex items-center justify-between">
          <Button variant="secondaryBorderless" className="p-0" type="button" onClick={toggleModal}>
            <Image width={20} height={20} src="/icons/back.svg" alt="language icon" />
            <p>{t('account_book:EDIT.BACK')}</p>
          </Button>
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {companyAndRole.company.name}
          </h1>
          <Button variant="secondaryBorderless" className="p-0" onClick={toggleModal}>
            <IoCloseOutline size={24} />
          </Button>
        </section>
        <section className="flex flex-col gap-lv-5">
          <div className="flex items-center gap-4">
            <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
            <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
              <Image
                src="/icons/asset_management_icon.svg"
                width={16}
                height={16}
                alt="building_icon"
              />
              <p>{t('account_book:EDIT.INFO')}</p>
            </div>
            <hr className="flex-1 border-divider-stroke-lv-4" />
          </div>
        </section>
        <form className="flex flex-col gap-lv-7" onSubmit={handleSubmit}>
          <div className="grid grid-cols-3 gap-lv-7">
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('account_book:EDIT.COMPANY_NAME')}
              </p>
              <input
                id="company-name-input"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t('account_book:PLACEHOLDER.ENTER_NAME')}
                className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
              />
            </div>
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('account_book:EDIT.BUSINESS_TAX_ID')}
              </p>
              <input
                id="company-tax-id-input"
                type="text"
                value={businessTaxId}
                onChange={(e) => setBusinessTaxId(e.target.value)}
                placeholder={t('account_book:PLACEHOLDER.ENTER_NUMBER')}
                className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
              />
            </div>
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('account_book:EDIT.TAX_SERIAL_NUMBER')}
              </p>
              <input
                id="company-tax-serial-number-input"
                type="text"
                value={taxSerialNumber}
                onChange={(e) => setTaxSerialNumber(e.target.value)}
                placeholder={t('account_book:PLACEHOLDER.ENTER_NUMBER')}
                className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-lv-7">
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('account_book:EDIT.COMPANY_REPRESENTATIVE_NAME')}
              </p>
              <input
                id="company-representative-name-input"
                type="text"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                placeholder={t('account_book:PLACEHOLDER.ENTER_NAME')}
                className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
              />
            </div>
            <SelectCountryDropdown country={country} onSelect={setCountry} />
            <PhoneNumberInput
              countryCode={countryCode}
              onSelect={setCountryCode}
              phoneNumber={phoneNumber}
              onUpdate={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-lv-7">
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('account_book:EDIT.COMPANY_ADDRESS')}
              </p>
              <input
                id="company-address-input"
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder={t('account_book:PLACEHOLDER.ENTER_FULL_ADDRESS')}
                className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-lv-7">
            <Button
              id="setting-remove-company"
              type="button"
              variant="errorBorderless"
              className="justify-start p-0"
            >
              <p className="flex cursor-pointer gap-2" onClick={deleteCompanyClickHandler}>
                <Image src="/icons/trash.svg" width={16} height={16} alt="notice_icon" />
                <span>{t('account_book:EDIT.DELETE_THIS_ACCOUNT_BOOK')}</span>
              </p>
            </Button>
          </div>
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="secondaryBorderless">
              {t('common:COMMON.CANCEL')}
            </Button>
            <Button type="submit" variant="default">
              {t('common:COMMON.SAVE')}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default AccountBookEditModal;
