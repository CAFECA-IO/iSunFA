import { IContactInfo } from '@/interfaces/kyc_contact_info';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { ContactInfoKeys, AreaCodeOptions } from '@/constants/kyc';
import { useTranslation } from 'next-i18next';

// Info: (20240718 - Liz) 根據 Area Code 對應到國家的國旗
const areaCodeFlagMap: Record<AreaCodeOptions, string> = {
  [AreaCodeOptions.TAIWAN]: '/flags/tw.svg',
  [AreaCodeOptions.UNITED_STATES]: '/flags/us.svg',
  [AreaCodeOptions.HONG_KONG]: '/flags/hk.svg',
  [AreaCodeOptions.CHINA]: '/flags/cn.svg',
};

const ContactInfoForm = ({
  data,
  onChange,
}: {
  data: IContactInfo;
  onChange: (key: ContactInfoKeys, value: string) => void;
}) => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);

  // Info: (20240718 - Liz) OuterClick Hook
  const {
    targetRef: areaCodeMenuRef,
    componentVisible: isAreaCodeMenuOpen,
    setComponentVisible: setIsAreaCodeMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  // Info: (20240718 - Liz) 開啟/關閉下拉選單
  const areaCodeMenuOpenHandler = () => setIsAreaCodeMenuOpen(!isAreaCodeMenuOpen);

  // Info: (20240718 - Liz) 下拉選單選項
  const areaCodeDropmenu = Object.values(AreaCodeOptions).map((areaCode) => {
    const selectionClickHandler = () => {
      onChange(ContactInfoKeys.AREA_CODE, areaCode);
      setIsAreaCodeMenuOpen(false);
    };

    return (
      <li
        key={areaCode}
        onClick={selectionClickHandler}
        className={`flex w-full cursor-pointer items-center gap-8px px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover`}
      >
        <Image
          src={areaCodeFlagMap[areaCode]}
          width={16}
          height={16}
          alt={areaCode}
          className="h-16px w-16px rounded-full object-cover"
        />
        <p>{areaCode}</p>
      </li>
    );
  });

  // Info: (20240718 - Liz) Input Handlers
  const keyContactPersonInputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(ContactInfoKeys.KEY_CONTACT_PERSON, e.target.value);
  };

  const contactNumberInputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(ContactInfoKeys.CONTACT_NUMBER, e.target.value);
  };

  const emailAddressInputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(ContactInfoKeys.EMAIL_ADDRESS, e.target.value);
  };

  const companyWebsiteInputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(ContactInfoKeys.COMPANY_WEBSITE, e.target.value);
  };

  return (
    <section className="flex flex-col gap-40px md:w-600px">
      {/* Info: (20240718 - Liz) ===== Key Contact Person ===== */}
      <div className="space-y-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">
          {t('kyc:KYC.KEY_CONTACT_PERSON')}
        </h6>
        <input
          id="keyContactPerson"
          type="text"
          placeholder={t('kyc:KYC.EXAMPLE')}
          required
          className="w-full cursor-pointer rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none placeholder:text-input-text-input-placeholder"
          onChange={keyContactPersonInputHandler}
          value={data[ContactInfoKeys.KEY_CONTACT_PERSON]}
        />
      </div>

      {/* Info: (20240718 - Liz) ===== Area Code & Contact Number ===== */}
      <div className="flex flex-col gap-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">
          {t('kyc:KYC.CONTACT_NUMBER')}
        </h6>

        <div className="relative flex rounded-sm bg-input-surface-input-background">
          {/* Info: (20240718 - Liz) ----- Area Code */}
          <div
            id="areaCode"
            onClick={areaCodeMenuOpenHandler}
            className={`group flex w-120px cursor-pointer items-center gap-8px rounded-l-sm border border-input-stroke-input text-input-text-input-placeholder ${isAreaCodeMenuOpen ? 'border-input-stroke-input-hover hover:text-input-text-highlight' : 'text-input-text-input-filled'} items-center px-10px hover:text-input-text-highlight`}
          >
            <Image
              src={areaCodeFlagMap[data[ContactInfoKeys.AREA_CODE]]}
              width={16}
              height={16}
              alt={data[ContactInfoKeys.AREA_CODE]}
              className="h-16px w-16px rounded-full object-cover"
            ></Image>
            <p className="w-36px">{data[ContactInfoKeys.AREA_CODE]}</p>
            <div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M2.97162 5.22162C3.26452 4.92873 3.73939 4.92873 4.03228 5.22162L8.00195 9.19129L11.9716 5.22162C12.2645 4.92873 12.7394 4.92873 13.0323 5.22162C13.3252 5.51452 13.3252 5.98939 13.0323 6.28228L8.53228 10.7823C8.23939 11.0752 7.76452 11.0752 7.47162 10.7823L2.97162 6.28228C2.67873 5.98939 2.67873 5.51452 2.97162 5.22162Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            {/* Info: (20240718 - Liz) Dropmenu */}
            <div
              className={`absolute left-0 top-50px grid w-fit grid-cols-1 shadow-dropmenu ${isAreaCodeMenuOpen ? 'grid-rows-1 border-dropdown-stroke-menu' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
            >
              <ul
                ref={areaCodeMenuRef}
                className="z-10 flex w-full flex-col items-start bg-dropdown-surface-menu-background-primary p-8px"
              >
                {areaCodeDropmenu}
              </ul>
            </div>
          </div>

          {/* Info: (20240718 - Liz) ----- Contact Number */}
          <input
            id="contactNumber"
            type="text"
            placeholder={t('kyc:KYC.EXAMPLE')}
            required
            className="w-full cursor-pointer rounded-r-sm border border-l-0 border-input-stroke-input bg-transparent p-10px outline-none placeholder:text-input-text-input-placeholder"
            onChange={contactNumberInputHandler}
            value={data[ContactInfoKeys.CONTACT_NUMBER]}
          />
        </div>
      </div>

      {/* Info: (20240718 - Liz) ===== Email Address ===== */}
      <div className="flex flex-col gap-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">
          {t('kyc:KYC.EMAIL_ADDRESS')}
        </h6>
        <div className="flex rounded-sm bg-input-surface-input-background">
          <div className="flex items-center rounded-l-sm border border-input-stroke-input px-12px">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M2.75195 3.50195C2.33774 3.50195 2.00195 3.83774 2.00195 4.25195V11.752C2.00195 12.1662 2.33774 12.502 2.75195 12.502H13.252C13.6662 12.502 14.002 12.1662 14.002 11.752V4.25195C14.002 3.83774 13.6662 3.50195 13.252 3.50195H2.75195ZM1.00195 4.25195C1.00195 3.28545 1.78545 2.50195 2.75195 2.50195H13.252C14.2185 2.50195 15.002 3.28545 15.002 4.25195V11.752C15.002 12.7185 14.2185 13.502 13.252 13.502H2.75195C1.78545 13.502 1.00195 12.7185 1.00195 11.752V4.25195Z"
                fill="#314362"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.1073 4.69501C3.27683 4.47703 3.59097 4.43777 3.80895 4.6073L8.00198 7.86855L12.195 4.6073C12.413 4.43777 12.7271 4.47703 12.8967 4.69501C13.0662 4.91298 13.0269 5.22712 12.8089 5.39665L8.30895 8.89665C8.12839 9.03708 7.87556 9.03708 7.69501 8.89665L3.19501 5.39665C2.97703 5.22712 2.93777 4.91298 3.1073 4.69501Z"
                fill="#314362"
              />
            </svg>
          </div>
          <input
            id="emailAddress"
            type="text"
            placeholder={t('kyc:KYC.EXAMPLE')}
            required
            className="w-full cursor-pointer rounded-r-sm border border-l-0 border-input-stroke-input bg-transparent p-10px outline-none placeholder:text-input-text-input-placeholder"
            onChange={emailAddressInputHandler}
            value={data[ContactInfoKeys.EMAIL_ADDRESS]}
          />
        </div>
      </div>

      {/* Info: (20240718 - Liz) ===== Company Website (Optional) ===== */}
      <div className="flex flex-col gap-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">
          {t('kyc:KYC.COMPANY_WEBSITE_OPTIONAL')}
        </h6>
        <div className="flex rounded-sm bg-input-surface-input-background">
          <p className="flex items-center rounded-l-sm border border-r border-input-stroke-input px-12px text-input-text-input-placeholder">
            http://
          </p>
          <input
            id="website"
            type="text"
            placeholder={t('kyc:KYC.EXAMPLE')}
            required
            className="w-full cursor-pointer rounded-r-sm border border-l-0 border-input-stroke-input bg-transparent p-10px outline-none placeholder:text-input-text-input-placeholder"
            onChange={companyWebsiteInputHandler}
            value={data[ContactInfoKeys.COMPANY_WEBSITE]}
          />
        </div>
      </div>
    </section>
  );
};

export default ContactInfoForm;
