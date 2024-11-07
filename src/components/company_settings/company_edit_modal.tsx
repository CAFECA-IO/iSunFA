import React, { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { IoCloseOutline } from 'react-icons/io5';
// import { useModalContext } from '@/contexts/modal_context';
// import { ToastId } from '@/constants/toast_id';
// import { ToastType } from '@/interfaces/toastify';
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

interface CompanyEditModalProps {
  company: ICompanyAndRole;
  toggleModal: () => void;
}

const CompanyEditModal: React.FC<CompanyEditModalProps> = ({ company, toggleModal }) => {
  const { t } = useTranslation(['setting', 'common', 'company']);
  const [companyName, setCompanytName] = React.useState('');
  const [bussinessTaxId, setBussinessTaxId] = React.useState('');
  const [taxSerialNumer, setTaxSerialNumer] = React.useState('');
  const [representativeName, setRepresentativeName] = React.useState('');
  const [companyAddress, setCompanyAddress] = React.useState('');
  const [country, setCountry] = React.useState<LocaleKey | null>(null);
  const [countryCode, setCountryCode] = React.useState<LocaleKey>(LocaleKey.en);
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const { toastHandler } = useModalContext();
  const { trigger: getCompanySetting } = APIHandler<ICompanySetting>(APIName.COMPANY_SETTING_GET);
  const { trigger: updateCompanySetting } = APIHandler(APIName.COMPANY_SETTING_UPDATE);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (company) {
      updateCompanySetting({
        params: {
          companyId: company.company.id,
        },
        body: {
          companyName,
          companyTaxId: bussinessTaxId,
          taxSerialNumber: taxSerialNumer,
          representativeName,
          address: companyAddress,
          country,
          countryCode,
          phone: phoneNumber,
        },
      })
        .then((res) => {
          const { success } = res;
          if (success) {
            toastHandler({
              id: ToastId.COMPANY_SETTING_UPDATE_SUCCESS,
              type: ToastType.SUCCESS,
              content: t('company:EDIT.UPDATE_SUCCESS'),
              closeable: true,
            });
            toggleModal();
          }
        })
        .catch((err) => {
          toastHandler({
            id: ToastId.COMPANY_SETTING_UPDATE_ERROR,
            type: ToastType.ERROR,
            content: err.message,
            closeable: true,
          });
        });
    }
  };

  useEffect(() => {
    if (company) {
      getCompanySetting({ params: { companyId: company.company.id } })
        .then((res) => {
          const { success, data } = res;
          if (success && data) {
            setCompanytName(data.companyName);
            setBussinessTaxId(data.companyTaxId);
            setTaxSerialNumer(data.taxSerialNumber);
            setRepresentativeName(data.representativeName);
            setCompanyAddress(data.address);
            setCountry(data.country);
            setCountryCode(data.countryCode);
            setPhoneNumber(data.phone);
          }
        })
        .catch((err) => {
          toastHandler({
            id: ToastId.COMPANY_SETTING_GET_ERROR,
            type: ToastType.ERROR,
            content: err.message,
            closeable: true,
          });
        });
    }
  }, []);

  return (
    <main className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="ml-250px flex max-h-90vh flex-col gap-lv-5 overflow-y-hidden rounded-lg bg-surface-neutral-surface-lv2 p-lv-7">
        <section className="flex items-center justify-between">
          <Button variant="secondaryBorderless" className="p-0" type="button" onClick={toggleModal}>
            <Image width={20} height={20} src="/icons/back.svg" alt="language icon" />
            <p>{t('company:EDIT.BACK')}</p>
          </Button>
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {company.company.name}
          </h1>
          <Button variant="secondaryBorderless" className="p-0" onClick={toggleModal}>
            <IoCloseOutline size={24} />
          </Button>
        </section>
        <section className="flex flex-col gap-lv-5">
          <div id="company-setting-list" className="flex items-center gap-4">
            <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
            <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
              <Image
                src="/icons/asset_management_icon.svg"
                width={16}
                height={16}
                alt="company_icon"
              />
              <p>{t('company:EDIT.INFO')}</p>
            </div>
            <hr className="flex-1 border-divider-stroke-lv-4" />
          </div>
        </section>
        <form className="flex flex-col gap-lv-7" onSubmit={handleSubmit}>
          <div className="grid grid-cols-3 gap-lv-7">
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('company:EDIT.NAME')}
              </p>
              <input
                id="comany-name-input"
                type="text"
                value={companyName}
                onChange={(e) => setCompanytName(e.target.value)}
                placeholder={t('common:PLACEHOLDER.ENTER_NAME')}
                className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
              />
            </div>
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('company:EDIT.BUSSINESS_TAX_ID')}
              </p>
              <input
                id="company-tax-id-input"
                type="text"
                value={bussinessTaxId}
                onChange={(e) => setBussinessTaxId(e.target.value)}
                placeholder={t('common:PLACEHOLDER.ENTER_NUMBER')}
                className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
              />
            </div>
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('company:EDIT.TAX_SERIAL_NUMBER')}
              </p>
              <input
                id="company-tax-serial-number-input"
                type="text"
                value={taxSerialNumer}
                onChange={(e) => setTaxSerialNumer(e.target.value)}
                placeholder={t('common:PLACEHOLDER.ENTER_NUMBER')}
                className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-lv-7">
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('company:EDIT.COMPANY_REPRESENTATIVE_NAME')}
              </p>
              <input
                id="comany-representative-name-input"
                type="text"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                placeholder={t('common:PLACEHOLDER.ENTER_NAME')}
                className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder`}
              />
            </div>
            <SelectCountryDropdown country={country} setCountry={setCountry} />
            <PhoneNumberInput
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
            />
          </div>
          <div className="grid grid-cols-1 gap-lv-7">
            <div className="flex flex-col gap-8px">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('company:EDIT.COMPANY_ADDRESS')}
              </p>
              <input
                id="comany-address-input"
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder={t('common:PLACEHOLDER.ENTER_FULL_ADDRESS')}
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
              <p className="flex gap-2">
                <Image src="/icons/trash.svg" width={16} height={16} alt="notice_icon" />
                <span>{t('company:EDIT.REMOVE_THIS_COMPANY')}</span>
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

export default CompanyEditModal;
