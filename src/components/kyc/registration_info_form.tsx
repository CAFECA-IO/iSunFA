import { IRegistrationInfo } from '@/interfaces/kyc_registration_info';
import { useState } from 'react';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { FaChevronDown } from 'react-icons/fa';
import { useTranslation } from 'next-i18next';
import {
  RegistrationInfoKeys,
  CountryOptions,
  LegalStructureOptions,
  IndustryOptions,
} from '@/constants/kyc';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';

// Info: (20240717 - Liz) 翻譯對應的 country 選項
const countryTranslationMap: { [key in CountryOptions]: string } = {
  [CountryOptions.DEFAULT]: 'kyc:KYC.COUNTRY_DEFAULT',
  [CountryOptions.TAIWAN]: 'kyc:KYC.COUNTRY_TAIWAN',
  [CountryOptions.UNITED_STATES]: 'kyc:KYC.COUNTRY_UNITED_STATES',
  [CountryOptions.CHINA]: 'kyc:KYC.COUNTRY_CHINA',
  [CountryOptions.HONG_KONG]: 'kyc:KYC.COUNTRY_HONG_KONG',
};

// Info: (20240717 - Liz) 翻譯對應的 legal structure 選項
const legalStructureTranslationMap: { [key in LegalStructureOptions]: string } = {
  [LegalStructureOptions.DEFAULT]: 'kyc:KYC.LEGAL_STRUCTURE_DEFAULT',
  [LegalStructureOptions.SOLE_PROPRIETORSHIP]: 'kyc:KYC.LEGAL_STRUCTURE_SOLE_PROPRIETORSHIP',
  [LegalStructureOptions.PARTNERSHIP]: 'kyc:KYC.LEGAL_STRUCTURE_PARTNERSHIP',
  [LegalStructureOptions.CORPORATION]: 'kyc:KYC.LEGAL_STRUCTURE_CORPORATION',
  [LegalStructureOptions.LIMITED_LIABILITY_COMPANY]:
    'kyc:KYC.LEGAL_STRUCTURE_LIMITED_LIABILITY_COMPANY',
};

// Info: (20240717 - Liz) 翻譯對應的 industry 選項
const industryTranslationMap: { [key in IndustryOptions]: string } = {
  [IndustryOptions.DEFAULT]: 'kyc:KYC.INDUSTRY_DEFAULT',
  [IndustryOptions.ACCOMMODATION_AND_FOOD_SERVICES]:
    'kyc:KYC.INDUSTRY_ACCOMMODATION_AND_FOOD_SERVICES',
  [IndustryOptions.ADMINISTRATIVE_AND_SUPPORT_SERVICES]:
    'kyc:KYC.INDUSTRY_ADMINISTRATIVE_AND_SUPPORT_SERVICES',
  [IndustryOptions.ARTS_AND_RECREATION_SERVICES]: 'kyc:KYC.INDUSTRY_ARTS_AND_RECREATION_SERVICES',
  [IndustryOptions.BASIC_METAL_PRODUCTION]: 'kyc:KYC.INDUSTRY_BASIC_METAL_PRODUCTION',
  [IndustryOptions.BUSINESS_FRANCHISES]: 'kyc:KYC.INDUSTRY_BUSINESS_FRANCHISES',
  [IndustryOptions.CHEMICAL_SUBSTANCE]: 'kyc:KYC.INDUSTRY_CHEMICAL_SUBSTANCE',
  [IndustryOptions.COMMERCE]: 'kyc:KYC.INDUSTRY_COMMERCE',
  [IndustryOptions.COMPUTER_AND_ELECTRONIC_PRODUCT]:
    'kyc:KYC.INDUSTRY_COMPUTER_AND_ELECTRONIC_PRODUCT',
  [IndustryOptions.CONSTRUCTION]: 'kyc:KYC.INDUSTRY_CONSTRUCTION',
  [IndustryOptions.EDUCATION]: 'kyc:KYC.INDUSTRY_EDUCATION',
  [IndustryOptions.FINANCE_AND_INSURANCE]: 'kyc:KYC.INDUSTRY_FINANCE_AND_INSURANCE',
  [IndustryOptions.FINANCIAL_SERVICES]: 'kyc:KYC.INDUSTRY_FINANCIAL_SERVICES',
  [IndustryOptions.FOOD_INDUSTRY]: 'kyc:KYC.INDUSTRY_FOOD_INDUSTRY',
  [IndustryOptions.HEALTHCARE_AND_SOCIAL_ASSISTANCE]:
    'kyc:KYC.INDUSTRY_HEALTHCARE_AND_SOCIAL_ASSISTANCE',
  [IndustryOptions.INFORMATION]: 'kyc:KYC.INDUSTRY_INFORMATION',
  [IndustryOptions.MINING]: 'kyc:KYC.INDUSTRY_MINING',
  [IndustryOptions.OTHER_SERVICE_ACTIVITIES]: 'kyc:KYC.INDUSTRY_OTHER_SERVICE_ACTIVITIES',
  [IndustryOptions.PERSONAL_SERVICES]: 'kyc:KYC.INDUSTRY_PERSONAL_SERVICES',
  [IndustryOptions.REAL_ESTATE_ACTIVITIES]: 'kyc:KYC.INDUSTRY_REAL_ESTATE_ACTIVITIES',
  [IndustryOptions.RETAIL]: 'kyc:KYC.INDUSTRY_RETAIL',
  [IndustryOptions.THEMATIC_REPORTS]: 'kyc:KYC.INDUSTRY_THEMATIC_REPORTS',
  [IndustryOptions.TRANSPORT_INDUSTRY]: 'kyc:KYC.INDUSTRY_TRANSPORT_INDUSTRY',
};

const RegistrationInfoForm = ({
  data,
  onChange,
}: {
  data: IRegistrationInfo;
  onChange: (key: RegistrationInfoKeys, value: string) => void;
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
  const [selectedDate, setSelectedDate] = useState({
    startTimeStamp: +data[RegistrationInfoKeys.REGISTRATION_DATE],
    endTimeStamp: +data[RegistrationInfoKeys.REGISTRATION_DATE],
  });

  // Info: (20240717 - Liz) OuterClick Hook
  const {
    targetRef: countryMenuRef,
    componentVisible: isCountryMenuOpen,
    setComponentVisible: setIsCountryMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const {
    targetRef: legalStructureMenuRef,
    componentVisible: isLegalStructureMenuOpen,
    setComponentVisible: setIsLegalStructureMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const {
    targetRef: industryMenuRef,
    componentVisible: isIndustryMenuOpen,
    setComponentVisible: setIsIndustryMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  // Info: (20240717 - Liz) 開啟/關閉下拉選單
  const countryMenuOpenHandler = () => setIsCountryMenuOpen(!isCountryMenuOpen);

  const legalStructureMenuOpenHandler = () =>
    setIsLegalStructureMenuOpen(!isLegalStructureMenuOpen);

  const industryMenuOpenHandler = () => setIsIndustryMenuOpen(!isIndustryMenuOpen);

  // Info: (20240717 - Liz) 下拉選單選項
  const countryDropmenu = Object.values(CountryOptions).map((country: CountryOptions) => {
    const selectionClickHandler = () => {
      onChange(RegistrationInfoKeys.COUNTRY, country);
      setIsCountryMenuOpen(false);
    };
    return (
      <li
        key={country}
        onClick={selectionClickHandler}
        className={`w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow ${country === CountryOptions.DEFAULT ? 'hidden' : ''}`}
      >
        <p>{t(countryTranslationMap[country])}</p>
      </li>
    );
  });

  const legalStructureDropmenu = Object.values(LegalStructureOptions).map(
    (legalStructure: LegalStructureOptions) => {
      const selectionClickHandler = () => {
        onChange(RegistrationInfoKeys.LEGAL_STRUCTURE, legalStructure);
        setIsLegalStructureMenuOpen(false);
      };
      return (
        <li
          key={legalStructure}
          onClick={selectionClickHandler}
          className={`w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow ${legalStructure === LegalStructureOptions.DEFAULT ? 'hidden' : ''}`}
        >
          <p>{t(legalStructureTranslationMap[legalStructure])}</p>
        </li>
      );
    }
  );

  const industryDropmenu = Object.values(IndustryOptions).map((industry: IndustryOptions) => {
    const selectionClickHandler = () => {
      onChange(RegistrationInfoKeys.INDUSTRY, industry);
      setIsIndustryMenuOpen(false);
    };
    return (
      <li
        key={industry}
        onClick={selectionClickHandler}
        className={`w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow ${industry === IndustryOptions.DEFAULT ? 'hidden' : ''}`}
      >
        <p>{t(industryTranslationMap[industry])}</p>
      </li>
    );
  });

  // Info: (20240717 - Liz) Input Handlers
  const businessRegistrationNumberInputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(RegistrationInfoKeys.BUSINESS_REGISTRATION_NUMBER, e.target.value);
  };

  return (
    <section className="flex w-full flex-col gap-40px md:w-600px">
      {/* ===== Country ===== */}
      <div className="flex flex-col items-start gap-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">
          {t('kyc:KYC.WHICH_COUNTRY_IS_YOUR_COMPANY_REGISTERED_IN')} ?
        </h6>

        <div
          id="country-menu"
          onClick={countryMenuOpenHandler}
          className={`group relative flex w-full cursor-pointer ${isCountryMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-sm border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
        >
          <p
            className={`${data[RegistrationInfoKeys.COUNTRY] === CountryOptions.DEFAULT ? 'text-input-text-input-placeholder' : ''}`}
          >
            {t(countryTranslationMap[data[RegistrationInfoKeys.COUNTRY]])}
          </p>
          <FaChevronDown />
          {/* Info: Dropmenu */}
          <div
            className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isCountryMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
          >
            <ul
              ref={countryMenuRef}
              className="z-10 flex w-full flex-col items-start bg-white p-8px"
            >
              {countryDropmenu}
            </ul>
          </div>
        </div>
      </div>

      {/* ===== Legal Structure ===== */}
      <div className="flex flex-col items-start gap-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">
          {t('kyc:KYC.LEGAL_STRUCTURE')}
        </h6>

        <div
          id="legal-structure-menu"
          onClick={legalStructureMenuOpenHandler}
          className={`group relative flex w-full cursor-pointer ${isLegalStructureMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-sm border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
        >
          <p
            className={`${data[RegistrationInfoKeys.LEGAL_STRUCTURE] === LegalStructureOptions.DEFAULT ? 'text-input-text-input-placeholder' : ''}`}
          >
            {t(legalStructureTranslationMap[data[RegistrationInfoKeys.LEGAL_STRUCTURE]])}
          </p>
          <FaChevronDown />
          {/* Info: Dropmenu */}
          <div
            className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isLegalStructureMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
          >
            <ul
              ref={legalStructureMenuRef}
              className="z-10 flex w-full flex-col items-start bg-white p-8px"
            >
              {legalStructureDropmenu}
            </ul>
          </div>
        </div>
      </div>

      {/* ===== Business Registration Number ===== */}
      <div className="space-y-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">
          {t('kyc:KYC.BUSINESS_REGISTRATION_NUMBER')}{' '}
        </h6>
        <input
          id="business-registration-number"
          type="text"
          placeholder={t('kyc:KYC.EXAMPLE')}
          required
          className="w-full cursor-pointer rounded-sm border border-lightGray3 bg-white p-10px outline-none placeholder:text-input-text-input-placeholder"
          onChange={businessRegistrationNumberInputHandler}
          value={data[RegistrationInfoKeys.BUSINESS_REGISTRATION_NUMBER]}
        />
      </div>

      {/* ===== Registration Date ===== */}
      <div className="flex flex-col items-start gap-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">
          {t('kyc:KYC.REGISTRATION_DATE')}
        </h6>

        <div className="w-full">
          <DatePicker
            period={selectedDate}
            setFilteredPeriod={setSelectedDate}
            type={DatePickerType.TEXT_DATE}
            btnClassName="text-sm rounded-sm"
            onClose={(start) => onChange(RegistrationInfoKeys.REGISTRATION_DATE, start.toString())}
          />
        </div>
      </div>

      {/* ===== Industry ===== */}
      <div className="flex flex-col items-start gap-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">{t('kyc:KYC.INDUSTRY')}</h6>

        <div
          id="industry-menu"
          onClick={industryMenuOpenHandler}
          className={`group relative flex w-full cursor-pointer ${isIndustryMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-sm border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
        >
          <p
            className={`${data[RegistrationInfoKeys.INDUSTRY] === IndustryOptions.DEFAULT ? 'text-input-text-input-placeholder' : ''}`}
          >
            {t(industryTranslationMap[data[RegistrationInfoKeys.INDUSTRY]])}
          </p>
          <FaChevronDown />
          {/* Info: Dropmenu */}
          <div
            className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isIndustryMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
          >
            <ul
              ref={industryMenuRef}
              className="z-10 flex max-h-150px w-full flex-col items-start overflow-y-auto bg-white p-8px"
            >
              {industryDropmenu}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegistrationInfoForm;
