import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaArrowRight } from 'react-icons/fa';
import { FiSearch } from 'react-icons/fi';
import { ICompany } from '@/interfaces/company';
import { DEFAULT_COMPANY_IMAGE_URL, DEFAULT_DISPLAYED_USER_NAME } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import { useGlobalCtx } from '@/contexts/global_context';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { ToastType } from '@/interfaces/toastify';
import { IRole } from '@/interfaces/role';
import { cn } from '@/lib/utils/common';
import { useTranslation } from 'next-i18next';

const SelectCompanyPageBody = () => {
  const { t } = useTranslation(['common', 'kyc']);

  const { signedIn, username, selectCompany, successSelectCompany, errorCode, userAuth } =
    useUserCtx();
  const {
    toastHandler,
    companyInvitationModalVisibilityHandler,
    createCompanyModalVisibilityHandler,
  } = useGlobalCtx();

  const {
    targetRef: companyMenuRef,
    componentVisible: isCompanyMenuOpen,
    setComponentVisible: setIsCompanyMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    trigger: listCompany,
    data: companyAndRoleList,
    success: companyAndRoleListSuccess,
    isLoading: iscompanyAndRoleListLoading,
  } = APIHandler<Array<{ company: ICompany; role: IRole }>>(APIName.COMPANY_LIST);

  const [selectedCompany, setSelectedCompany] = useState<ICompany | null>(null);
  const [searchValue, setSearchValue] = useState<string>('');
  const [companyList, setCompanyList] = useState<Array<{ company: ICompany; role: IRole }>>([]);
  const [filteredCompanyList, setFilteredCompanyList] = useState<
    Array<{ company: ICompany; role: IRole }>
  >([]);

  const userName = signedIn ? username || DEFAULT_DISPLAYED_USER_NAME : '';
  const selectedCompanyName = selectedCompany?.name ?? t('kyc:SELECT_COMPANY.SELECT_AN_COMPANY');

  const menuOpenHandler = () => {
    listCompany({
      header: {
        userid: username || DEFAULT_DISPLAYED_USER_NAME,
      },
    });
    setIsCompanyMenuOpen(!isCompanyMenuOpen);
  };

  const changeSearchHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
  };

  const selectCompanyClickHandler = async () => {
    await selectCompany(selectedCompany);
  };

  // useEffect(() => {
  //   // Info: (20240730 - Julian) 一進入本頁，先清除已選擇的公司
  //   selectCompany(null);
  // }, []);

  useEffect(() => {
    if (successSelectCompany === false) {
      toastHandler({
        id: `companySelectError_${errorCode}`,
        type: ToastType.ERROR,
        content: `Failed to select company: ${errorCode}`,
        closeable: true,
      });
    }
  }, [successSelectCompany, errorCode]);

  useEffect(() => {
    if (companyAndRoleListSuccess && companyAndRoleList) {
      setCompanyList(companyAndRoleList);
      setFilteredCompanyList(companyAndRoleList);
    }
  }, [companyAndRoleListSuccess, companyAndRoleList]);

  // Info: (20240830 - Anna) 為了拿掉next-line function-paren-newline註解，所以加上prettier-ignore，請Prettier不要格式化
  useEffect(() => {
    // prettier-ignore
    if (searchValue !== '') {
      const filteredList = companyList.filter((companyAndRole) =>
        companyAndRole.company.name.toLowerCase().includes(searchValue.toLowerCase()));
      setFilteredCompanyList(filteredList);
    } else {
      setFilteredCompanyList(companyList);
    }
  }, [searchValue]);

  const displayCompanyList = !iscompanyAndRoleListLoading ? (
    filteredCompanyList.map((companyAndRole) => {
      const companyClickHandler = () => {
        setSelectedCompany(companyAndRole.company);
        setIsCompanyMenuOpen(false);
      };
      return (
        <button
          key={companyAndRole.company.id}
          onClick={companyClickHandler}
          type="button"
          className={`flex w-full items-end gap-3 rounded-sm px-12px py-8px text-dropdown-text-primary hover:cursor-pointer enabled:hover:bg-dropdown-surface-item-hover disabled:cursor-not-allowed disabled:text-dropdown-text-primary disabled:opacity-50`}
        >
          <div className="my-auto flex h-20px w-20px flex-col justify-center overflow-hidden rounded-full">
            <Image
              alt={companyAndRole.company.name}
              src={companyAndRole.company?.imageId ?? DEFAULT_COMPANY_IMAGE_URL}
              width={20}
              height={20}
            />
          </div>
          <p className="justify-center text-sm font-medium leading-5 tracking-normal">
            {companyAndRole.company.name}
          </p>
          <p className="text-xs text-dropdown-text-secondary">
            {t(`common:ROLE.${companyAndRole.role.name.toUpperCase().replace(/ /g, '_')}`)}
          </p>
        </button>
      );
    })
  ) : (
    <div>{t('common:COMMON.LOADING')}</div>
  );

  const displayCompanyMenu = (
    <div
      ref={companyMenuRef}
      className={`absolute top-90px grid w-full grid-cols-1 overflow-hidden rounded-sm border bg-dropdown-surface-menu-background-primary px-5 py-2.5 ${isCompanyMenuOpen ? 'grid-rows-1 opacity-100 shadow-dropmenu' : 'grid-rows-0 opacity-0'} transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col items-start">
        {/* Info: (20240514 - Julian) search bar */}
        <div className="my-8px flex w-full items-center justify-between rounded-sm border px-12px py-8px text-icon-surface-single-color-primary">
          <input
            id="companySearchBar"
            type="text"
            placeholder={t('common:COMMON.SEARCH')}
            value={searchValue}
            onChange={changeSearchHandler}
            className="w-full outline-none placeholder:text-input-text-input-placeholder"
          />
          <FiSearch size={16} />
        </div>
        {/* Info: (20240514 - Julian) company list */}
        <div className="flex max-h-100px w-full flex-col items-start overflow-y-auto overflow-x-hidden">
          {displayCompanyList}
        </div>
        {/* Info: (20240514 - Julian) enter invitation code */}
        <button
          type="button"
          onClick={companyInvitationModalVisibilityHandler}
          // Info: (20240809 - Shirley) disabled for now
          className="hidden w-full items-center justify-start gap-3 border-t px-12px py-8px text-xs text-dropdown-text-secondary"
        >
          <Image src="/icons/invitation.svg" width={16} height={16} alt="invitation_icon" />
          <p>{t('kyc:SELECT_COMPANY.ENTER_INVITATION_CODE')}</p>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-100vh w-full flex-col items-center justify-center font-barlow">
      <div className="mx-16px flex grow flex-col items-center justify-center pb-20 max-lg:mt-20">
        {/* Info: (20240513 - Julian) title & description */}
        <div className="flex flex-col items-center justify-center self-stretch">
          <div className="text-48px font-bold text-text-brand-secondary-lv2 max-lg:text-4xl">
            {t('kyc:SELECT_COMPANY.WELCOME_BACK')}
            <span className="text-text-brand-primary-lv3">{userName}</span>!
          </div>
          <div className="mt-2 text-center text-base font-medium leading-6 tracking-normal text-text-brand-secondary-lv2">
            {t('kyc:SELECT_COMPANY.YOUR_COMPANY')}
          </div>
        </div>
        {/* Info: (20240513 - Julian) company selection */}
        <div className="mt-10 flex w-full flex-col items-center gap-y-40px">
          {/* Info: (20240513 - Julian) user avatar */}
          <div className="relative flex w-200px items-center justify-center">
            <div className="h-200px w-200px overflow-hidden">
              <Image
                alt="avatar"
                src={userAuth?.imageId ?? DEFAULT_COMPANY_IMAGE_URL}
                fill
                style={{ objectFit: 'cover' }}
                className="rounded-full"
              />
            </div>

            {/* Info: (20240513 - Julian) green dot */}
            <div className={cn('absolute right-2', userAuth?.imageId ? 'bottom-2' : 'bottom-0')}>
              <svg
                width="41"
                height="40"
                viewBox="0 0 41 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="20.4999"
                  cy="20"
                  r="18.1667"
                  fill="#2FD181"
                  stroke="#FCFDFF"
                  strokeWidth="3"
                />
              </svg>
            </div>
          </div>

          {/* Info: (20240513 - Julian) company selection */}
          <div className="relative inline-flex w-full flex-col items-start justify-start gap-2">
            <p className="text-sm font-semibold leading-tight tracking-tight text-input-text-primary">
              {t('kyc:SELECT_COMPANY.MY_COMPANY_LIST')}
            </p>
            <div className="inline-flex items-center justify-start self-stretch rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow">
              <button
                type="button"
                onClick={menuOpenHandler}
                className="flex shrink grow items-center justify-between px-16px py-8px text-center text-base font-medium leading-normal tracking-tight"
              >
                <p className="text-input-text-input-placeholder">{selectedCompanyName}</p>
                <FaChevronDown
                  size={16}
                  className={`${isCompanyMenuOpen ? 'rotate-180' : 'rotate-0'} transition-all duration-300 ease-in-out`}
                />
              </button>
              <div className="w-px self-stretch bg-input-stroke-input" />
              <Button
                type="button"
                disabled={selectedCompany === null}
                variant="secondaryBorderless"
                className="p-4"
                onClick={selectCompanyClickHandler}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    className="fill-current"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.22784 1.75107C8.26328 1.75108 8.29925 1.7511 8.33577 1.7511H13.5024L13.5339 1.7511C14.2072 1.75109 14.7579 1.75108 15.2055 1.78765C15.6688 1.8255 16.0872 1.90624 16.4779 2.10533L16.1397 2.76903L16.4779 2.10533C17.0894 2.41692 17.5866 2.9141 17.8982 3.52563C18.0973 3.91637 18.178 4.33477 18.2159 4.79803C18.2525 5.2456 18.2524 5.79632 18.2524 6.46971V6.5011V13.5011V13.5325C18.2524 14.2059 18.2525 14.7566 18.2159 15.2042C18.178 15.6674 18.0973 16.0858 17.8982 16.4766C17.5866 17.0881 17.0894 17.5853 16.4779 17.8969C16.0872 18.096 15.6688 18.1767 15.2055 18.2146C14.7579 18.2511 14.2072 18.2511 13.5338 18.2511H13.5024H8.33577C8.29926 18.2511 8.26329 18.2511 8.22785 18.2511C7.55797 18.2514 7.07664 18.2517 6.66128 18.1404C5.53973 17.8398 4.6637 16.9638 4.36318 15.8423C4.25189 15.4269 4.25211 14.9456 4.25241 14.2757C4.25242 14.2403 4.25244 14.2043 4.25244 14.1678C4.25244 13.7536 4.58823 13.4178 5.00244 13.4178C5.41665 13.4178 5.75244 13.7536 5.75244 14.1678C5.75244 14.991 5.75888 15.2555 5.81207 15.454L5.08763 15.6481L5.81207 15.454C5.97389 16.0579 6.4456 16.5297 7.04951 16.6915C7.24801 16.7447 7.51251 16.7511 8.33577 16.7511H13.5024C14.2149 16.7511 14.7041 16.7505 15.0834 16.7195C15.4539 16.6893 15.6529 16.6338 15.7969 16.5604C16.1262 16.3926 16.3939 16.1249 16.5617 15.7956C16.6351 15.6515 16.6906 15.4525 16.7209 15.082C16.7519 14.7028 16.7524 14.2135 16.7524 13.5011V6.5011C16.7524 5.78866 16.7519 5.29943 16.7209 4.92018C16.6906 4.54968 16.6351 4.35066 16.5617 4.20662L17.1951 3.8839L16.5617 4.20662C16.3939 3.87733 16.1262 3.60962 15.7969 3.44184C15.6529 3.36845 15.4539 3.31294 15.0834 3.28267C14.7041 3.25168 14.2149 3.2511 13.5024 3.2511H8.33577C7.51251 3.2511 7.24801 3.25754 7.04951 3.31073C6.4456 3.47255 5.97389 3.94426 5.81207 4.54817C5.75888 4.74667 5.75244 5.01117 5.75244 5.83443C5.75244 6.24865 5.41665 6.58443 5.00244 6.58443C4.58823 6.58443 4.25244 6.24865 4.25244 5.83443C4.25244 5.79791 4.25242 5.76194 4.25241 5.7265C4.25211 5.05662 4.25189 4.57529 4.36318 4.15994C4.6637 3.03839 5.53973 2.16236 6.66128 1.86184C7.07663 1.75055 7.55796 1.75077 8.22784 1.75107ZM9.47211 6.13744C9.765 5.84454 10.2399 5.84454 10.5328 6.13744L13.8661 9.47077C14.159 9.76366 14.159 10.2385 13.8661 10.5314L10.5328 13.8648C10.2399 14.1577 9.765 14.1577 9.47211 13.8648C9.17922 13.5719 9.17922 13.097 9.47211 12.8041L11.5251 10.7511H2.50244C2.08823 10.7511 1.75244 10.4153 1.75244 10.0011C1.75244 9.58689 2.08823 9.2511 2.50244 9.2511H11.5251L9.47211 7.1981C9.17922 6.9052 9.17922 6.43033 9.47211 6.13744Z"
                    fill="#314362"
                  />
                </svg>
              </Button>

              {/* Info: (20240514 - Julian) dropdown menu */}
              {displayCompanyMenu}
            </div>
          </div>
          <div className="flex flex-col items-center gap-y-16px">
            {/* Info: (20240513 - Julian) create company button */}
            <Button
              type="button"
              onClick={createCompanyModalVisibilityHandler}
              variant="tertiary"
              className="mx-auto flex h-44px items-center gap-4px px-16px py-8px text-sm font-medium leading-7 tracking-normal"
            >
              <svg
                width="17"
                height="16"
                viewBox="0 0 17 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.83545 2.7511C5.7769 2.7511 4.91878 3.60922 4.91878 4.66777C4.91878 5.72631 5.7769 6.58443 6.83545 6.58443C7.894 6.58443 8.75212 5.72631 8.75212 4.66777C8.75212 3.60922 7.894 2.7511 6.83545 2.7511ZM3.41878 4.66777C3.41878 2.78079 4.94848 1.2511 6.83545 1.2511C8.72242 1.2511 10.2521 2.78079 10.2521 4.66777C10.2521 6.55474 8.72242 8.08443 6.83545 8.08443C4.94848 8.08443 3.41878 6.55474 3.41878 4.66777ZM10.1402 1.91353C10.2957 1.52958 10.7329 1.34432 11.1169 1.49973C12.3676 2.00603 13.2521 3.2327 13.2521 4.66777C13.2521 6.10283 12.3676 7.3295 11.1169 7.8358C10.7329 7.99122 10.2957 7.80595 10.1402 7.422C9.98483 7.03805 10.1701 6.60081 10.554 6.44539C11.2578 6.1605 11.7521 5.47096 11.7521 4.66777C11.7521 3.86457 11.2578 3.17503 10.554 2.89014C10.1701 2.73472 9.98483 2.29748 10.1402 1.91353ZM5.8092 9.2511H5.83545H8.50212C8.91633 9.2511 9.25212 9.58689 9.25212 10.0011C9.25212 10.4153 8.91633 10.7511 8.50212 10.7511H5.83545C5.20393 10.7511 4.76786 10.7515 4.42742 10.7747C4.09372 10.7975 3.90705 10.8397 3.76864 10.897C3.299 11.0915 2.92588 11.4647 2.73135 11.9343C2.67402 12.0727 2.63185 12.2594 2.60908 12.5931C2.58586 12.9335 2.58545 13.3696 2.58545 14.0011C2.58545 14.4153 2.24966 14.7511 1.83545 14.7511C1.42124 14.7511 1.08545 14.4153 1.08545 14.0011L1.08545 13.9748C1.08544 13.3759 1.08544 12.8885 1.11256 12.491C1.14054 12.0809 1.19987 11.7119 1.34553 11.3603C1.6923 10.5231 2.35744 9.85795 3.19461 9.51118C3.54626 9.36552 3.91524 9.30619 4.32531 9.27821C4.72286 9.25109 5.21023 9.25109 5.8092 9.2511ZM13.1688 9.2511C13.583 9.2511 13.9188 9.58689 13.9188 10.0011V11.2511H15.1688C15.583 11.2511 15.9188 11.5869 15.9188 12.0011C15.9188 12.4153 15.583 12.7511 15.1688 12.7511H13.9188V14.0011C13.9188 14.4153 13.583 14.7511 13.1688 14.7511C12.7546 14.7511 12.4188 14.4153 12.4188 14.0011V12.7511H11.1688C10.7546 12.7511 10.4188 12.4153 10.4188 12.0011C10.4188 11.5869 10.7546 11.2511 11.1688 11.2511H12.4188V10.0011C12.4188 9.58689 12.7546 9.2511 13.1688 9.2511Z"
                  fill="#FCFDFF"
                />
              </svg>
              <p>{t('kyc:SELECT_COMPANY.CREATE_MY_COMPANY')}</p>
              <FaArrowRight />
            </Button>
            <Button
              onClick={() => selectCompany(null, true)}
              variant={'tertiaryOutline'}
              className="mx-auto flex h-44px w-full items-center gap-4px px-16px py-8px text-sm font-medium leading-7 tracking-normal"
            >
              <p>{t('kyc:SELECT_COMPANY.TRY_IT_OUT')}</p>
              <FaArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectCompanyPageBody;
