/* eslint-disable */
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/button/button';
import { RxCross2 } from 'react-icons/rx';
import { useGlobalCtx } from '@/contexts/global_context';
import { useUserCtx } from '@/contexts/user_context';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { FaChevronDown } from 'react-icons/fa';
import { DEFAULT_DISPLAYED_USER_NAME } from '@/constants/display';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { ICompany } from '@/interfaces/company';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import { MessageType } from '@/interfaces/message_modal';

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
    data: results,
    success: createCompanySuccess,
    error: createCompanyError,
    code: createCompanyCode,
  } = APIHandler<ICompany>(APIName.COMPANY_ADD, {}, false, false);

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
    setRegistrationNumberValue(e.target.value);
  };

  const cancelBtnClickHandler = () => {
    modalVisibilityHandler();
    setNameValue('');
    setRegistrationNumberValue('');
    setIsMenuOpen(false);
  };

  const createCompanyHandler = async () => {
    // createCompany({
    //   body: {
    //     name: nameValue,
    //     code: registrationNumberValue,
    //     regional: selectedCountry,
    //   },
    // });

    // ToDo: (20240514 - Julian) @Tzuhan Add API call
    const response = await fetch('/api/v1/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        userid: username ?? DEFAULT_DISPLAYED_USER_NAME,
      },
      body: JSON.stringify({
        name: nameValue,
        code: registrationNumberValue,
        regional: selectedCountry,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const { name } = data;
      selectCompany(name);

      // Info: (20240517 - Julian) Close modal
      setNameValue('');
      setRegistrationNumberValue('');
      modalVisibilityHandler();
    }

    // const isCompanyPassedKyc =
    //   Object.values(companyList).find(
    //     (company) => company.name === nameValue || company.brn === registrationNumberValue
    //   )?.isPassedKyc ?? false;
    // const isRegistered = Object.values(companyList).some(
    //   (company) => company.name === nameValue || company.brn === registrationNumberValue
    // );
    // // Info: (20240514 - Julian) If the company has passed KYC, show a error message
    // if (isCompanyPassedKyc) {
    //   messageModalDataHandler({
    //     messageType: MessageType.ERROR,
    //     title: 'This Company is already exist',
    //     subMsg: 'This company has already been registered.',
    //     content: `Please review the entered information again, or you can contact the company administrator to join the company.`,
    //     submitBtnStr: 'Close',
    //     submitBtnFunction: messageModalVisibilityHandler,
    //   });
    //   messageModalVisibilityHandler();
    //   return;
    // }
    // // Info: (20240514 - Julian) If the company has already been registered, show a warning message
    // if (isRegistered) {
    //   messageModalDataHandler({
    //     messageType: MessageType.WARNING,
    //     title: 'Duplicate registration',
    //     subMsg: 'This company has already been registered.',
    //     content: `If you are the company's administrator, please complete KYC to regain access to the company account.`,
    //     submitBtnStr: 'Go to KYC',
    //     submitBtnFunction: () => {}, // ToDo: (20240514 - Julian) Add KYC page link
    //     backBtnStr: 'Cancel',
    //   });
    //   messageModalVisibilityHandler();
    //   return;
    // }
    // ToDo: (20240514 - Julian) create success handler: should push to dashboard page
  };

  useEffect(() => {
    if (createCompanySuccess && results) {
      // Info: (20240520 - Julian) 如果成功，將公司名稱傳入 user context，並導向 dashboard
      selectCompany(results.name);
      modalVisibilityHandler();
      router.push(ISUNFA_ROUTE.DASHBOARD);
    } else if (createCompanyError) {
      // Info: (20240520 - Julian) 如果失敗，顯示錯誤訊息
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        title: 'Create Company Failed',
        subMsg: 'Please try again later',
        content: `Error code: ${createCompanyCode}`,
        submitBtnStr: 'Close',
        submitBtnFunction: messageModalVisibilityHandler,
      });
      messageModalVisibilityHandler();
    }
  }, [createCompanySuccess, createCompanyError, createCompanyCode]);

  const confirmClickHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    createCompany({
      header: {
        userid: username ?? DEFAULT_DISPLAYED_USER_NAME,
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
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50">
      <form
        onSubmit={confirmClickHandler}
        className="relative mx-auto flex w-90vw flex-col items-center gap-y-16px rounded-lg bg-white py-16px shadow-lg shadow-black/80 sm:w-500px"
      >
        {/* Info: (20240514 - Julian) Title */}
        <div className="flex justify-center px-20px">
          <h2 className="text-xl font-bold leading-8 text-navyBlue2">Create My Company</h2>
          <button
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
              Company Name
            </p>
            <input
              id="companyNameInput"
              type="text"
              placeholder="Enter company name"
              value={nameValue}
              onChange={changeNameHandler}
              required
              className="w-full rounded-sm border px-12px py-10px text-darkBlue2 shadow outline-none placeholder:text-lightGray4"
            />
          </div>
          {/* Info: (20240514 - Julian) Business Registration Number */}
          <div className="inline-flex w-full flex-col items-start gap-2">
            <p className="text-sm font-semibold leading-tight tracking-tight text-navyBlue2">
              Business Registration Number
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
                placeholder="Enter business registration number"
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
            onClick={cancelBtnClickHandler}
            className="rounded-sm px-4 py-2 text-secondaryBlue hover:text-primaryYellow"
          >
            Cancel
          </button>
          <Button type="submit" variant={'tertiary'}>
            Submit
          </Button>
        </div>
      </form>
    </div>
  ) : null;

  return <div className="font-barlow">{isDisplayedCreateCompanyModal}</div>;
};

export default CreateCompanyModal;
