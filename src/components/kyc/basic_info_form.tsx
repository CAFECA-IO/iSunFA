import { BasicInfoKeys, IBasicInfo } from '@/interfaces/kyc_basic_info';
import Image from 'next/image';
import { useState } from 'react';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { CountryOptions } from '@/constants/kyc';
import { useTranslation } from 'next-i18next';

// Info: (20240719 - Liz) 根據 Country Options 對應到國家的國旗。P.S.目前國旗的下拉選單不會傳值給後端，因為在下一個表單的第一個欄位已有國家選項，會傳那個給後端(可搜尋 id="country-menu")
const countryFlagMap: Record<CountryOptions, string> = {
  [CountryOptions.DEFAULT]: '',
  [CountryOptions.TAIWAN]: '/flags/tw.svg',
  [CountryOptions.UNITED_STATES]: '/flags/us.svg',
  [CountryOptions.HONG_KONG]: '/flags/hk.svg',
  [CountryOptions.CHINA]: '/flags/cn.svg',
};

// Info: (20240719 - Liz) 翻譯對應的 country 選項
const countryTranslationMap: { [key in CountryOptions]: string } = {
  [CountryOptions.DEFAULT]: 'KYC.COUNTRY_DEFAULT',
  [CountryOptions.TAIWAN]: 'KYC.COUNTRY_TAIWAN',
  [CountryOptions.UNITED_STATES]: 'KYC.COUNTRY_UNITED_STATES',
  [CountryOptions.CHINA]: 'KYC.COUNTRY_CHINA',
  [CountryOptions.HONG_KONG]: 'KYC.COUNTRY_HONG_KONG',
};

const BasicInfoForm = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  data,
  onChange,
}: {
  data: IBasicInfo;
  onChange: (key: BasicInfoKeys, value: string) => void;
}) => {
  const { t } = useTranslation('common');
  // Info: (20240719 - Liz) 狀態管理
  const [countryFlag, setCountryFlag] = useState<CountryOptions>(CountryOptions.TAIWAN);

  // Info: (20240719 - Liz) OuterClick Hook
  const {
    targetRef: countryFlagMenuRef,
    componentVisible: isCountryFlagMenuOpen,
    setComponentVisible: setIsCountryFlagMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  // Info: (20240719 - Liz) 開啟/關閉下拉選單
  const countryFlagMenuOpenHandler = () => setIsCountryFlagMenuOpen(!isCountryFlagMenuOpen);

  // Info: (20240719 - Liz) 下拉選單選項
  const countryFlagDropmenu = Object.values(CountryOptions).map((country) => {
    const selectionClickHandler = () => {
      setCountryFlag(country); // Info: (20240719 - Liz) 這裡的值不用回傳後端，所以不用 onChange
      setIsCountryFlagMenuOpen(false);
    };

    return (
      <li
        key={country}
        onClick={selectionClickHandler}
        className={`flex w-full cursor-pointer items-center gap-8px px-3 py-2 text-navyBlue2 hover:text-primaryYellow ${country === CountryOptions.DEFAULT ? 'hidden' : ''}`}
      >
        <Image
          src={countryFlagMap[country]}
          width={16}
          height={16}
          alt={country}
          className="h-16px w-16px rounded-full object-cover"
        />
        <p>{t(countryTranslationMap[country])}</p>
      </li>
    );
  });

  // Info: (20240717 - Liz) Input Handlers
  const legalCompanyNameInputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(BasicInfoKeys.LEGAL_COMPANY_NAME, e.target.value);
  };
  const zipCodeInputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(BasicInfoKeys.ZIP_CODE, e.target.value);
  };
  const streetInputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(BasicInfoKeys.STREET, e.target.value);
  };
  const keyCompanyRepresentativesInputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(BasicInfoKeys.KEY_COMPANY_REPRESENTATIVES_NAME, e.target.value);
  };

  const cityInputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(BasicInfoKeys.CITY, e.target.value);
  };

  return (
    <section className="flex w-600px flex-col gap-40px">
      {/* Legal Company Name */}
      <div className="space-y-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">Legal Company Name</h6>
        <input
          id="legal-company-name"
          type="text"
          placeholder="example"
          required
          className="w-full cursor-pointer rounded-sm border border-lightGray3 bg-white p-10px outline-none placeholder:text-input-text-input-placeholder"
          onChange={legalCompanyNameInputHandler}
        />
      </div>

      {/* ===== City & Zip Code ===== */}
      <div className="flex gap-20px">
        {/*  Country & City  */}
        <div className="flex flex-1 flex-col gap-8px">
          <h6 className="text-sm font-semibold text-input-text-primary">Company Address</h6>

          <div className="relative flex rounded-sm border border-lightGray3 bg-white p-10px">
            {/* Country */}
            <div
              id="country-flag-menu"
              onClick={countryFlagMenuOpenHandler}
              className={`group mr-16px flex cursor-pointer items-center gap-8px px-12px text-input-text-input-placeholder ${isCountryFlagMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'text-navyBlue2'} items-center bg-white hover:text-primaryYellow`}
            >
              {/* // Info: (20240719 - Liz) 不拿後端回傳的值，因為這裡 country 不傳給後端 */}
              <Image
                src={countryFlagMap[countryFlag]}
                width={16}
                height={16}
                alt={countryFlag}
                className="h-16px w-16px rounded-full object-cover"
              ></Image>
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
              {/* Info: Dropmenu */}
              <div
                className={`absolute left-0 top-50px grid w-fit grid-cols-1 shadow-dropmenu ${isCountryFlagMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
              >
                <ul
                  ref={countryFlagMenuRef}
                  className="z-10 flex w-full flex-col items-start bg-white p-8px"
                >
                  {countryFlagDropmenu}
                </ul>
              </div>
            </div>

            {/* City */}
            <input
              id="city"
              type="text"
              placeholder="City"
              required
              className="w-full cursor-pointer bg-white outline-none placeholder:text-input-text-input-placeholder"
              onChange={cityInputHandler}
            />
          </div>
        </div>

        {/* Zip Code */}
        <div className="flex flex-1 flex-col items-start gap-8px">
          <h6 className="text-sm font-semibold text-input-text-primary">Zip Code</h6>
          <input
            id="zip-code"
            type="text"
            placeholder="Zip Code"
            required
            className="w-full cursor-pointer rounded-sm border border-lightGray3 bg-white p-10px outline-none placeholder:text-input-text-input-placeholder"
            onChange={zipCodeInputHandler}
          />
        </div>
      </div>

      {/* ===== Street ===== */}
      <div>
        <input
          id="street"
          type="text"
          placeholder="Street Address"
          required
          className="w-full cursor-pointer rounded-sm border border-lightGray3 bg-white p-10px outline-none placeholder:text-input-text-input-placeholder"
          onChange={streetInputHandler}
        />
      </div>

      {/* ===== Key Company Representative’s Name ===== */}
      <div className="space-y-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">
          Key Company Representative’s Name
        </h6>
        <input
          id="key-company-representatives-name"
          type="text"
          placeholder="example"
          required
          className="w-full cursor-pointer rounded-sm border border-lightGray3 bg-white p-10px outline-none placeholder:text-input-text-input-placeholder"
          onChange={keyCompanyRepresentativesInputHandler}
        />
      </div>
    </section>
  );
};

export default BasicInfoForm;
