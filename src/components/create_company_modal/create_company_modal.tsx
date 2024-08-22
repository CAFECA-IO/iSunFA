import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/button/button';
import { RxCross2 } from 'react-icons/rx';
// eslint-disable-next-line import/no-cycle
import { useGlobalCtx } from '@/contexts/global_context';
import { useUserCtx } from '@/contexts/user_context';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { FaChevronDown } from 'react-icons/fa';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { ICompany } from '@/interfaces/company';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import { MessageType } from '@/interfaces/message_modal';
import { DEFAULT_DISPLAYED_USER_NAME } from '@/constants/display';
import { IRole } from '@/interfaces/role';
import { useTranslation } from 'next-i18next';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';

interface ICreateCompanyModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

// ToDo: (20240514 - Julian) Replace with actual country list
const countryList = [
  {
    name: 'Taiwan',
    icon: '/currencies/twd.svg',
  },
  {
    name: 'England',
    icon: '/currencies/gb.svg',
  },
];

const CreateCompanyModal = ({ isModalVisible, modalVisibilityHandler }: ICreateCompanyModal) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();
  const { username, selectCompany } = useUserCtx();
  const {
    targetRef: menuRef,
    componentVisible: isMenuOpen,
    setComponentVisible: setIsMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    trigger: createCompany,
    data: companyAndRole,
    success: createCompanySuccess,
    error: createCompanyError,
    code: createCompanyCode,
  } = APIHandler<{ company: ICompany; role: IRole }>(APIName.COMPANY_ADD);

  const [nameValue, setNameValue] = useState<string>('');
  const [registrationNumberValue, setRegistrationNumberValue] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>(countryList[0].name);

  const selectedCountryIcon =
    countryList.find((country) => country.name === selectedCountry)?.icon ?? '';

  const openCountryMenu = () => setIsMenuOpen(!isMenuOpen);

  const changeNameHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameValue(e.target.value);
  };
  const changeRegistrationNumberHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Info: (20240801 - Julian) 只允許輸入數字
    const valueOnlyNumber = e.target.value.replace(/[^0-9]/g, '');
    setRegistrationNumberValue(valueOnlyNumber);
  };

  const resetValues = () => {
    setNameValue('');
    setRegistrationNumberValue('');
    setIsMenuOpen(false);
  };

  const cancelBtnClickHandler = () => {
    modalVisibilityHandler();
    resetValues();
  };

  useEffect(() => {
    if (createCompanySuccess && companyAndRole) {
      // Info: (20240520 - Julian) 如果成功，將公司名稱傳入 user context，並導向 dashboard
      selectCompany(companyAndRole.company);
      modalVisibilityHandler();
      resetValues();
      router.push(ISUNFA_ROUTE.DASHBOARD);
    } else if (createCompanyError) {
      if (createCompanyCode === STATUS_CODE[STATUS_MESSAGE.DUPLICATE_COMPANY]) {
        messageModalDataHandler({
          messageType: MessageType.WARNING,
          title: t('COMPANY_BASIC_INFO.EXISTED_COMPANY'),
          subMsg: t('COMPANY_BASIC_INFO.COMPANY_ALREADY_REGISTERED'),
          // Info: (20240805 - Anna) content: `If you are the owner of this company,
          // Info: (20240805 - Anna) please complete KYC to get access back. Error code: ${createCompanyCode}`,
          content: t('COMPANY_BASIC_INFO.PLEASE_COMPLETE_KYC', { code: createCompanyCode }),
          submitBtnStr: t('COMPANY_BASIC_INFO.GO_KYC'),
          submitBtnFunction: () => {
            // Info: (20240807 - Anna) 隱藏 create company modal
            modalVisibilityHandler();
            messageModalVisibilityHandler();
            router.push(ISUNFA_ROUTE.KYC);
          },
          backBtnStr: t('REPORTS_HISTORY_LIST.CANCEL'),
        });
        messageModalVisibilityHandler();
      } else if (createCompanyCode === STATUS_CODE[STATUS_MESSAGE.DUPLICATE_COMPANY_KYC_DONE]) {
        messageModalDataHandler({
          messageType: MessageType.ERROR,
          title: 'Verified Company',
          subMsg: 'This company has already been registered and verified.',
          content: `Please check the information again, or contact with us. Error code: ${createCompanyCode}`,
          submitBtnStr: t('COMMON.CLOSE'),
          submitBtnFunction: messageModalVisibilityHandler,
        });
        messageModalVisibilityHandler();
      } else {
        // Info: (20240520 - Julian) 如果失敗，顯示錯誤訊息
        messageModalDataHandler({
          messageType: MessageType.ERROR,
          title: 'Create Company Failed',
          subMsg: 'Please try again later',
          content: `Error code: ${createCompanyCode}`,
          submitBtnStr: t('COMMON.CLOSE'),
          submitBtnFunction: messageModalVisibilityHandler,
        });
        messageModalVisibilityHandler();
      }
    }
  }, [createCompanySuccess, createCompanyError, createCompanyCode]);

  const confirmClickHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    createCompany({
      header: {
        userid: username || DEFAULT_DISPLAYED_USER_NAME,
      },
      body: {
        name: nameValue,
        code: registrationNumberValue,
        regional: selectedCountry,
      },
    });
  };

  const displayCountryMenu = countryList.map((country) => {
    const countryClickHandler = () => {
      setSelectedCountry(country.name);
      setIsMenuOpen(false);
    };
    return (
      <button
        key={country.name}
        type="button"
        onClick={countryClickHandler}
        className="flex w-full items-center justify-center p-8px"
      >
        <Image
          src={country.icon}
          width={16}
          height={16}
          alt={`${country.name}_icon`}
          className="rounded-full"
        />
      </button>
    );
  });

  const isDisplayedCreateCompanyModal = isModalVisible ? (
    // eslint-disable-next-line tailwindcss/migration-from-tailwind-2
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50">
      <form
        onSubmit={confirmClickHandler}
        className="relative mx-auto flex w-90vw flex-col items-center gap-y-16px rounded-lg bg-white py-16px shadow-lg shadow-black/80 sm:w-500px"
      >
        {/* Info: (20240514 - Julian) Title */}
        <div className="flex justify-center px-20px">
          <h2 className="text-xl font-bold leading-8 text-navyBlue2">
            {t('SELECT_COMPANY.CREATE_MY_COMPANY')}
          </h2>
          <button
            type="button"
            onClick={cancelBtnClickHandler}
            className="absolute right-3 top-3 flex items-center justify-center text-darkBlue2"
          >
            <RxCross2 size={20} />
          </button>
        </div>

        <div className="flex w-full flex-col justify-center gap-y-16px border-b border-t p-40px">
          {/* Info: (20240514 - Julian) Company Name */}
          <div className="inline-flex w-full flex-col items-start gap-2">
            <p className="text-sm font-semibold leading-tight tracking-tight text-navyBlue2">
              {t('CONTRACT.COMPANY_NAME')}
            </p>
            <input
              id="companyNameInput"
              type="text"
              placeholder={t('SELECT_COMPANY.ENTER_COMPANY_NAME')}
              value={nameValue}
              onChange={changeNameHandler}
              required
              className="w-full rounded-sm border px-12px py-10px text-darkBlue2 shadow outline-none placeholder:text-lightGray4"
            />
          </div>
          {/* Info: (20240514 - Julian) Business Registration Number */}
          <div className="inline-flex w-full flex-col items-start gap-2">
            <p className="text-sm font-semibold leading-tight tracking-tight text-navyBlue2">
              {t('CONTRACT.BUSINESS_REGISTRATION_NUMBER')}
            </p>
            <div className="relative flex w-full items-center divide-x rounded-sm border px-12px text-darkBlue2 shadow">
              {/* Info: (20240514 - Julian) country selection */}
              <button
                type="button"
                onClick={openCountryMenu}
                className="mr-12px flex items-center gap-12px"
              >
                <Image
                  src={selectedCountryIcon}
                  width={16}
                  height={16}
                  alt={`${selectedCountry}_icon`}
                  className="rounded-full"
                />
                <FaChevronDown
                  size={16}
                  className={`text-darkBlue2 ${isMenuOpen ? 'rotate-180' : 'rotate-0'} transition-all duration-300 ease-in-out`}
                />
              </button>
              <input
                id="registrationNumberInput"
                type="text"
                placeholder={t('SELECT_COMPANY.ENTER_BUSINESS_REGISTRATION_NUMBER')}
                value={registrationNumberValue}
                onChange={changeRegistrationNumberHandler}
                required
                className="w-full p-10px outline-none placeholder:text-lightGray4"
              />
              <div
                ref={menuRef}
                className={`absolute left-4px top-46px flex w-44px flex-col items-center rounded-xs bg-white shadow-dropmenu ${isMenuOpen ? 'max-h-100px overflow-y-auto' : 'max-h-0 overflow-y-hidden'} transition-all duration-300 ease-in-out`}
              >
                {displayCountryMenu}
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full justify-end gap-3 whitespace-nowrap px-20px text-sm font-medium leading-5 tracking-normal">
          <button
            type="button"
            onClick={cancelBtnClickHandler}
            className="rounded-sm px-4 py-2 text-secondaryBlue hover:text-primaryYellow"
          >
            {t('REPORTS_HISTORY_LIST.CANCEL')}
          </button>
          <Button type="submit" variant={'tertiary'}>
            {t('CONTACT_US.SUBMIT')}
          </Button>
        </div>
      </form>
    </div>
  ) : null;

  return <div className="font-barlow">{isDisplayedCreateCompanyModal}</div>;
};

export default CreateCompanyModal;
