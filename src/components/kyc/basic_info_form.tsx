import { CityOptions } from '@/constants/kyc';
import { BasicInfoKeys, IBasicInfo } from '@/interfaces/kyc_basic_info';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { FaChevronDown } from 'react-icons/fa';
import { useTranslation } from 'next-i18next';

// Info: (240717 - Liz) 翻譯對應的城市選項
const cityTranslationMap: { [key in CityOptions]: string } = {
  [CityOptions.DEFAULT]: 'KYC.CITY_DEFAULT',
  [CityOptions.GB]: 'KYC.CITY_GB',
  [CityOptions.US]: 'KYC.CITY_US',
  [CityOptions.TW]: 'KYC.CITY_TW',
};

const BasicInfoForm = ({
  data,
  onChange,
}: {
  data: IBasicInfo;
  onChange: (key: BasicInfoKeys, value: string) => void;
}) => {
  const { t } = useTranslation('common');

  const {
    targetRef: cityMenuRef,
    componentVisible: isCityMenuOpen,
    setComponentVisible: setIsCityMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  // Info: (240717 - Liz) 開啟/關閉下拉選單
  const cityMenuOpenHandler = () => setIsCityMenuOpen(!isCityMenuOpen);

  // Info: (240717 - Liz) 下拉選單選項
  const cityDropmenu = Object.values(CityOptions).map((city: CityOptions) => {
    const selectionClickHandler = () => {
      onChange(BasicInfoKeys.CITY, city);
      setIsCityMenuOpen(false);
    };

    return (
      <li
        key={city}
        onClick={selectionClickHandler}
        className={`w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow ${city === CityOptions.DEFAULT ? 'hidden' : ''}`}
      >
        <p>{t(cityTranslationMap[city])}</p>
      </li>
    );
  });

  // Info: (240717 - Liz) Input Handlers
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
        {/* City */}
        <div className="flex flex-1 flex-col items-start gap-8px">
          <h6 className="text-sm font-semibold text-input-text-primary">Company Address</h6>
          <div
            id="city-menu"
            onClick={cityMenuOpenHandler}
            className={`group relative flex w-full cursor-pointer ${isCityMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-sm border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
          >
            <p
              className={`${data[BasicInfoKeys.CITY] === CityOptions.DEFAULT ? 'text-input-text-input-placeholder' : ''}`}
            >
              {t(cityTranslationMap[data[BasicInfoKeys.CITY]])}
            </p>
            <FaChevronDown />
            {/* Info: Dropmenu */}
            <div
              className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isCityMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
            >
              <ul
                ref={cityMenuRef}
                className="z-10 flex w-full flex-col items-start bg-white p-8px"
              >
                {cityDropmenu}
              </ul>
            </div>
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
