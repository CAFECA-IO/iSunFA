import { IRegistrationInfo } from '@/interfaces/kyc_registration_info';
import { useEffect, useState } from 'react';
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
import { default30DayPeriodInSec } from '@/constants/display';

// Info: (240717 - Liz) 翻譯對應的 country 選項
const countryTranslationMap: { [key in CountryOptions]: string } = {
  [CountryOptions.DEFAULT]: 'KYC.COUNTRY_DEFAULT',
  [CountryOptions.TAIWAN]: 'KYC.COUNTRY_TAIWAN',
  [CountryOptions.UNITED_STATES]: 'KYC.COUNTRY_UNITED_STATES',
  [CountryOptions.CHINA]: 'KYC.COUNTRY_CHINA',
  [CountryOptions.HONG_KONG]: 'KYC.COUNTRY_HONG_KONG',
};

// Info: (240717 - Liz) 翻譯對應的 legal structure 選項
const legalStructureTranslationMap: { [key in LegalStructureOptions]: string } = {
  [LegalStructureOptions.DEFAULT]: 'KYC.LEGAL_STRUCTURE_DEFAULT',
  [LegalStructureOptions.SOLE_PROPRIETORSHIP]: 'KYC.LEGAL_STRUCTURE_SOLE_PROPRIETORSHIP',
  [LegalStructureOptions.PARTNERSHIP]: 'KYC.LEGAL_STRUCTURE_PARTNERSHIP',
  [LegalStructureOptions.CORPORATION]: 'KYC.LEGAL_STRUCTURE_CORPORATION',
  [LegalStructureOptions.LIMITED_LIABILITY_COMPANY]:
    'KYC.LEGAL_STRUCTURE_LIMITED_LIABILITY_COMPANY',
};

// Info: (240717 - Liz) 翻譯對應的 industry 選項
const industryTranslationMap: { [key in IndustryOptions]: string } = {
  [IndustryOptions.DEFAULT]: 'KYC.INDUSTRY_DEFAULT',
  [IndustryOptions.ACCOMMODATION_AND_FOOD_SERVICES]: 'KYC.INDUSTRY_ACCOMMODATION_AND_FOOD_SERVICES',
  [IndustryOptions.ADMINISTRATIVE_AND_SUPPORT_SERVICES]:
    'KYC.INDUSTRY_ADMINISTRATIVE_AND_SUPPORT_SERVICES',
  [IndustryOptions.ARTS_AND_RECREATION_SERVICES]: 'KYC.INDUSTRY_ARTS_AND_RECREATION_SERVICES',
  [IndustryOptions.BASIC_METAL_PRODUCTION]: 'KYC.INDUSTRY_BASIC_METAL_PRODUCTION',
  [IndustryOptions.BUSINESS_FRANCHISES]: 'KYC.INDUSTRY_BUSINESS_FRANCHISES',
  [IndustryOptions.CHEMICAL_SUBSTANCE]: 'KYC.INDUSTRY_CHEMICAL_SUBSTANCE',
  [IndustryOptions.COMMERCE]: 'KYC.INDUSTRY_COMMERCE',
  [IndustryOptions.COMPUTER_AND_ELECTRONIC_PRODUCT]: 'KYC.INDUSTRY_COMPUTER_AND_ELECTRONIC_PRODUCT',
  [IndustryOptions.CONSTRUCTION]: 'KYC.INDUSTRY_CONSTRUCTION',
  [IndustryOptions.EDUCATION]: 'KYC.INDUSTRY_EDUCATION',
  [IndustryOptions.FINANCE_AND_INSURANCE]: 'KYC.INDUSTRY_FINANCE_AND_INSURANCE',
  [IndustryOptions.FINANCIAL_SERVICES]: 'KYC.INDUSTRY_FINANCIAL_SERVICES',
  [IndustryOptions.FOOD_INDUSTRY]: 'KYC.INDUSTRY_FOOD_INDUSTRY',
  [IndustryOptions.HEALTHCARE_AND_SOCIAL_ASSISTANCE]:
    'KYC.INDUSTRY_HEALTHCARE_AND_SOCIAL_ASSISTANCE',
  [IndustryOptions.INFORMATION]: 'KYC.INDUSTRY_INFORMATION',
  [IndustryOptions.MINING]: 'KYC.INDUSTRY_MINING',
  [IndustryOptions.OTHER_SERVICE_ACTIVITIES]: 'KYC.INDUSTRY_OTHER_SERVICE_ACTIVITIES',
  [IndustryOptions.PERSONAL_SERVICES]: 'KYC.INDUSTRY_PERSONAL_SERVICES',
  [IndustryOptions.REAL_ESTATE_ACTIVITIES]: 'KYC.INDUSTRY_REAL_ESTATE_ACTIVITIES',
  [IndustryOptions.RETAIL]: 'KYC.INDUSTRY_RETAIL',
  [IndustryOptions.THEMATIC_REPORTS]: 'KYC.INDUSTRY_THEMATIC_REPORTS',
  [IndustryOptions.TRANSPORT_INDUSTRY]: 'KYC.INDUSTRY_TRANSPORT_INDUSTRY',
};

const RegistrationInfoForm = ({
  data,
  onChange,
}: {
  data: IRegistrationInfo;
  onChange: (key: RegistrationInfoKeys, value: string) => void;
}) => {
  const { t } = useTranslation('common');
  const [selectedDate, setSelectedDate] = useState(default30DayPeriodInSec);

  useEffect(() => {
    // 當 selectedDate 變動時觸發 onChange
    onChange(RegistrationInfoKeys.REGISTRATION_DATE, selectedDate.startTimeStamp.toString());
  }, [selectedDate]);

  // Info: (240717 - Liz) OuterClick Hook
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

  // Info: (240717 - Liz) 開啟/關閉下拉選單
  const countryMenuOpenHandler = () => setIsCountryMenuOpen(!isCountryMenuOpen);

  const legalStructureMenuOpenHandler = () =>
    setIsLegalStructureMenuOpen(!isLegalStructureMenuOpen);

  const industryMenuOpenHandler = () => setIsIndustryMenuOpen(!isIndustryMenuOpen);

  // Info: (240717 - Liz) 下拉選單選項
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

  // Info: (240717 - Liz) Input Handlers
  const businessRegistrationNumberInputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(RegistrationInfoKeys.BUSINESS_REGISTRATION_NUMBER, e.target.value);
  };

  return (
    <section className="flex flex-col gap-40px md:w-600px">
      {/* ===== Country ===== */}
      <div className="flex flex-col items-start gap-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">
          Which country is your Company registered in ?
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
        <h6 className="text-sm font-semibold text-input-text-primary">Legal Structure</h6>

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
          Business Registration Number
        </h6>
        <input
          id="business-registration-number"
          type="text"
          placeholder="example"
          required
          className="w-full cursor-pointer rounded-sm border border-lightGray3 bg-white p-10px outline-none placeholder:text-input-text-input-placeholder"
          onChange={businessRegistrationNumberInputHandler}
        />
      </div>

      {/* ===== Registration Date ===== */}
      <div className="flex flex-col items-start gap-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">Registration Date </h6>

        <div className="w-full">
          <DatePicker
            period={selectedDate}
            setFilteredPeriod={setSelectedDate}
            type={DatePickerType.TEXT_DATE}
            btnClassName="text-sm rounded-sm"
          />
        </div>
      </div>

      {/* ===== Industry ===== */}
      <div className="flex flex-col items-start gap-8px">
        <h6 className="text-sm font-semibold text-input-text-primary">Industry </h6>

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
