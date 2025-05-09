import { IContactInfo } from '@/interfaces/kyc_contact_info';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { ContactInfoKeys, AreaCodeOptions } from '@/constants/kyc';
import { useTranslation } from 'next-i18next';
import { BsChevronDown } from 'react-icons/bs';
import { MdOutlineEmail } from 'react-icons/md';

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
  const { t } = useTranslation(['common', 'kyc']);

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
              <BsChevronDown w-4 h-4 />
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
            <MdOutlineEmail className="h-4 w-4 text-neutral-500" />
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
