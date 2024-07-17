/* eslint-disable @typescript-eslint/no-unused-vars */
import { CityOptions } from '@/constants/kyc';
import { BasicInfoKeys, IBasicInfo } from '@/interfaces/kyc_basic_info';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { useTranslation } from 'next-i18next';

const cityTypeMap: { [key in CityOptions]: string } = {
  [CityOptions.DEFAULT]: 'KYC.DEFAULT',
  [CityOptions.GB]: 'KYC.GB',
  [CityOptions.US]: 'KYC.US',
  [CityOptions.TW]: 'KYC.TW',
};

const BasicInfoForm = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  data,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // 開啟/關閉下拉選單
  const cityMenuOpenHandler = () => setIsCityMenuOpen(!isCityMenuOpen);

  // 下拉選單選項
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
        <p>{t(cityTypeMap[city])}</p>
      </li>
    );
  });

  return (
    <section className="flex w-600px flex-col border-4 border-lime-400">
      <div>
        <p>Legal Company Name</p>
        <input type="text" placeholder="example" required className="w-full" />
      </div>

      <div className="flex gap-20px">
        {/* ===== Info: City ===== */}
        <div className="flex flex-1 flex-col items-start gap-8px">
          <p className="text-sm font-semibold text-navyBlue2">Company Address</p>
          <div
            id="city-type-menu"
            onClick={cityMenuOpenHandler}
            className={`group relative flex h-46px w-full cursor-pointer ${isCityMenuOpen ? 'border-primaryYellow text-primaryYellow' : 'border-lightGray3 text-navyBlue2'} items-center justify-between rounded-sm border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
          >
            <p
              className={`${data[BasicInfoKeys.CITY] === CityOptions.DEFAULT ? 'text-input-text-input-placeholder' : ''}`}
            >
              {t(cityTypeMap[data[BasicInfoKeys.CITY]])}
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

        {/* ===== Info: Zip Code ===== */}
        <div className="flex flex-1 flex-col items-start gap-8px">
          <p className="text-sm font-semibold text-navyBlue2">Zip Code</p>
          <input
            id="zip-code"
            name="zip-code"
            type="text"
            placeholder="Zip Code"
            required
            className="w-full cursor-pointer rounded-sm border border-lightGray3 bg-white p-10px outline-none"
          />
        </div>
      </div>

      <div>
        <input type="text" placeholder="Street Address" required className="w-full" />
      </div>

      <div>
        <p>Key Company Representative’s Name</p>
        <input type="text" placeholder="example" required className="w-full" />
      </div>
    </section>
  );
};

export default BasicInfoForm;
