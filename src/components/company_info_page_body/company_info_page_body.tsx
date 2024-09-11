import { Button } from '@/components/button/button';
import Skeleton from '@/components/skeleton/skeleton';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_COMPANY_IMAGE_URL } from '@/constants/display';
import { RoleName } from '@/constants/role_name';
import { UploadType } from '@/constants/file';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useGlobalCtx } from '@/contexts/global_context';
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import { ICompany, ICompanyAndRole } from '@/interfaces/company';
import { MessageType } from '@/interfaces/message_modal';
import { IRole } from '@/interfaces/role';
import APIHandler from '@/lib/utils/api_handler';
import { timestampToString } from '@/lib/utils/common';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FREE_COMPANY_ID } from '@/constants/config';
import { KYCStatus } from '@/constants/kyc';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { LuArrowLeftRight } from 'react-icons/lu';

const CompanyInfoPageBody = () => {
  const { t } = useTranslation(['common', 'kyc']);

  const router = useRouter();
  const { isAuthLoading, selectedCompany, selectCompany } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  const {
    teamSettingModalVisibilityHandler,
    transferCompanyModalVisibilityHandler,
    profileUploadModalVisibilityHandler,
    profileUploadModalDataHandler,
  } = useGlobalCtx();
  const { messageModalVisibilityHandler, messageModalDataHandler } = useModalContext();

  const [company, setCompany] = useState<ICompany | null>(selectedCompany);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [role, setRole] = useState<IRole | null>(null);

  const { trigger: deleteCompany } = APIHandler<ICompany>(APIName.COMPANY_DELETE);

  const {
    data: companyData,
    isLoading: isCompanyDataLoading,
    code: getCompanyDataCode,
    success: getCompanyDataSuccessfully,
  } = APIHandler<ICompanyAndRole>(
    APIName.COMPANY_GET_BY_ID,
    {
      params: {
        companyId: selectedCompany?.id,
      },
    },
    hasCompanyId
  );

  const kycStatusDetail = companyData?.company.kycStatusDetail ?? null;

  const isEditNameAllowed = role?.name === RoleName.OWNER;

  useEffect(() => {
    if (getCompanyDataSuccessfully && companyData) {
      setCompany(companyData.company);
      setOwnerId(companyData.company.ownerId);
      setRole(companyData.role);
    }
  }, [companyData, getCompanyDataSuccessfully, getCompanyDataCode]);

  useEffect(() => {
    setCompany(selectedCompany);
  }, [selectedCompany]);

  const updateImageClickHandler = () => {
    profileUploadModalDataHandler(UploadType.COMPANY);
    profileUploadModalVisibilityHandler();
  };

  const editCompanyClickHandler = () => {
    teamSettingModalVisibilityHandler();
  };

  const goKYCClickHandler = () => {
    router.push(ISUNFA_ROUTE.KYC);
  };

  const procedureOfDelete = () => {
    if (!company) return;
    messageModalVisibilityHandler();
    deleteCompany({
      params: {
        companyId: selectedCompany?.id,
      },
    });

    selectCompany(null);
    router.push(ISUNFA_ROUTE.SELECT_COMPANY);
  };

  const deleteCompanyClickHandler = () => {
    if (!company) return;
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('kyc:COMPANY_BASIC_INFO.DELETE_COMPANY'),
      content: t('kyc:KYC.DELETE_COMPANY_CHECK'),
      backBtnStr: t('common:COMMON.CANCEL'),
      submitBtnStr: t('kyc:COMPANY_BASIC_INFO.DELETE'),
      submitBtnFunction: procedureOfDelete,
    });
    messageModalVisibilityHandler();
  };

  const transferOwnershipClickHandler = () => {
    transferCompanyModalVisibilityHandler();
  };

  const displayedOwnerId = isCompanyDataLoading ? (
    <div className="mt-5">
      <Skeleton width={80} height={20} />
    </div>
  ) : (
    <div className="text-xl font-bold leading-8 text-text-neutral-primary lg:mt-5">
      {ownerId ?? '-'}
    </div>
  );

  const displayedOperations = isCompanyDataLoading ? (
    <div className="">
      <Skeleton width={200} height={50} />
    </div>
  ) : role?.name === RoleName.OWNER ? (
    <>
      <div className="">
        <Button
          onClick={deleteCompanyClickHandler}
          variant={'secondaryOutline'}
          className="max-md:w-220px"
        >
          <FiTrash2 size={20} />
          <p>{t('kyc:COMPANY_BASIC_INFO.DELETE_COMPANY')}</p>
        </Button>
      </div>
      <div className="">
        <Button
          onClick={transferOwnershipClickHandler}
          variant={'secondaryOutline'}
          className="max-md:w-220px"
        >
          <LuArrowLeftRight size={20} />
          <p>{t('kyc:COMPANY_BASIC_INFO.TRANSFER_ADMINISTRATION')}</p>
        </Button>
      </div>
    </>
  ) : null;

  // Info: (20240802 - Julian) No KYC in free company
  const displayedKYC =
    selectedCompany?.id !== FREE_COMPANY_ID ? (
      <>
        {/* ===== KYC ===== */}
        <div className="mt-10 flex gap-4 max-md:max-w-full max-md:flex-wrap">
          <div className="flex gap-2 whitespace-nowrap text-sm font-medium leading-5 tracking-normal text-divider-text-lv-1">
            <div className="my-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 16 16"
              >
                <path
                  fill="#002462"
                  fillRule="evenodd"
                  d="M2 7.714a6 6 0 1112 0V10a.857.857 0 001.715 0V7.714a7.714 7.714 0 10-15.429 0v7.429a.857.857 0 001.714 0V7.714zM5.43 13.43a.857.857 0 10-1.714 0v1.714a.857.857 0 001.714 0v-1.714zM8 5.714A2.571 2.571 0 005.43 8.286V10a.857.857 0 11-1.714 0V8.286a4.286 4.286 0 118.571 0v6.857a.857.857 0 01-1.714 0V8.286A2.571 2.571 0 008 5.714zm7.715 7.715a.857.857 0 00-1.715 0v1.714a.857.857 0 001.715 0v-1.714zM8 13.143c.474 0 .858.384.858.857v1.143a.857.857 0 01-1.715 0V14c0-.473.384-.857.857-.857zm.858-4.286a.857.857 0 00-1.715 0v1.714a.857.857 0 101.715 0V8.857z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </div>
            <div>{t('kyc:COMPANY_BASIC_INFO.KYC')}</div>
          </div>
          <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
            <div className="h-px shrink-0 border border-solid border-divider-stroke-lv-1 max-md:max-w-full" />
          </div>
        </div>

        {/* KYC banner - 0 - 從未執行 KYC */}
        {kycStatusDetail === KYCStatus.NOT_STARTED && (
          <div className="kycCardShadow mt-10 flex flex-col rounded-3xl bg-white pb-3.5">
            <div className="max-md:max-w-full">
              <div className="hidden w-100px min-w-100px lg:absolute lg:block">
                <div className="relative">
                  {/* Info: (20240716 - Shirley) desktop 圓形 */}
                  <Image
                    src="/elements/ellipse_16.png"
                    width={100}
                    height={100}
                    alt="ellipse"
                    className="rounded rounded-tl-lg"
                  />
                  <div className="absolute left-4 top-6">
                    <p className="text-3xl font-bold text-text-brand-primary-lv2">
                      {t('kyc:COMPANY_BASIC_INFO.KYC')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex w-full justify-center lg:hidden">
                <div className="flex items-center justify-center">
                  {/* Info: (20240716 - Shirley) mobile 圓形 */}
                  <div className="relative">
                    <Image
                      src="/elements/ellipse_16_mobile.png"
                      width={160}
                      height={160}
                      alt="ellipse"
                      className=""
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-3xl font-bold text-text-brand-primary-lv2">
                        {t('kyc:COMPANY_BASIC_INFO.KYC')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-0 max-lg:flex-col max-lg:gap-0 lg:ml-1/20">
                <div className="flex w-100% flex-col">
                  <div className="grow">
                    <div className="flex gap-0 max-md:flex-col max-md:gap-0">
                      <div className="ml-0 flex w-100% flex-col max-md:ml-0 max-md:w-full">
                        <div className="mt-24 text-center text-3xl font-bold leading-10 text-text-brand-secondary-lv1 max-lg:mt-10">
                          <span className="text-3xl leading-9 text-text-brand-secondary-lv1">
                            {t('kyc:COMPANY_BASIC_INFO.UNLOCK')}
                          </span>
                          <br />
                          <span className="text-5xl leading-52px text-text-brand-primary-lv2">
                            {t('kyc:COMPANY_BASIC_INFO.ALL_FUNCTIONS')}
                          </span>
                          <br />
                          <span className="text-xl leading-8 text-text-brand-secondary-lv1">
                            {t('kyc:COMPANY_BASIC_INFO.ON_ISUNFA')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ml-5 flex w-100% flex-col max-lg:pb-10">
                  <div className="mt-1.5 max-md:mt-10 max-md:max-w-full">
                    <div className="flex gap-5 max-lg:flex-col">
                      <div className="flex w-100% flex-col gap-16px max-lg:items-center">
                        <div className="mt-5 text-lg font-semibold leading-7 tracking-normal text-text-neutral-primary lg:mt-24">
                          <ul className="list-disc pl-0 lg:pl-5">
                            <li>{t('kyc:COMPANY_BASIC_INFO.AI_AUDIT_REPORT')}</li>
                            <li>{t('kyc:COMPANY_BASIC_INFO.HIGHER_SECURITY')}</li>
                            <li>{t('kyc:COMPANY_BASIC_INFO.CHANGE_TO_OFFICIAL_ACCOUNT')}</li>
                          </ul>
                        </div>
                      </div>
                      <div className="hidden w-full justify-end lg:relative lg:flex">
                        <Image
                          src="/elements/padlock_square.svg"
                          width={78}
                          height={78}
                          alt="padlock"
                          className="ml-1 shrink-0 rounded-l rounded-tr-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mb-5 mr-2 mt-2 flex gap-2 self-center lg:mb-0 lg:self-end">
              <Button
                onClick={goKYCClickHandler}
                variant={'secondaryOutline'}
                className="px-8 py-3.5 text-lg font-medium leading-7 tracking-normal max-md:px-5"
              >
                <p>{t('kyc:COMPANY_BASIC_INFO.GO_KYC')}</p>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    className="fill-current"
                    fillRule="evenodd"
                    d="M11.77 4.456c.44-.44 1.153-.44 1.592 0l6.75 6.75c.44.439.44 1.151 0 1.59l-6.75 6.75a1.125 1.125 0 01-1.591-1.59L17.725 12l-5.954-5.954a1.125 1.125 0 010-1.591z"
                    clipRule="evenodd"
                  ></path>
                  <path
                    className="fill-current"
                    fillRule="evenodd"
                    d="M3.566 12.001c0-.621.504-1.125 1.125-1.125H18.38a1.125 1.125 0 010 2.25H4.69a1.125 1.125 0 01-1.125-1.125z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </Button>
            </div>
          </div>
        )}

        {/* KYC banner - 1 - 已執行 KYC 但還在等待驗證 (Pending) */}

        {kycStatusDetail === KYCStatus.PENDING && (
          <div className="kycCardShadow mt-10 flex flex-col rounded-3xl bg-white pb-3.5">
            <div className="max-md:max-w-full">
              <div className="hidden w-100px min-w-100px lg:absolute lg:block">
                <div className="relative">
                  {/* Info: (20240716 - Shirley) desktop 圓形 */}
                  <Image
                    src="/elements/ellipse_16.png"
                    width={100}
                    height={100}
                    alt="ellipse"
                    className="rounded rounded-tl-lg"
                  />
                  <div className="absolute left-4 top-6">
                    <p className="text-3xl font-bold text-text-brand-primary-lv2">
                      {t('kyc:COMPANY_BASIC_INFO.KYC')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex w-full justify-center lg:hidden">
                <div className="flex items-center justify-center">
                  {/* Info: (20240716 - Shirley) mobile 圓形 */}
                  <div className="relative">
                    <Image
                      src="/elements/ellipse_16_mobile.png"
                      width={160}
                      height={160}
                      alt="ellipse"
                      className=""
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-3xl font-bold text-text-brand-primary-lv2">
                        {t('kyc:COMPANY_BASIC_INFO.KYC')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-0 max-lg:flex-col max-lg:gap-0 lg:ml-1/20">
                <div className="flex w-100% flex-col">
                  <div className="grow">
                    <div className="flex gap-0 max-md:flex-col max-md:gap-0">
                      <div className="ml-0 flex w-100% flex-col max-md:ml-0 max-md:w-full">
                        <div className="mt-24 text-center text-3xl font-bold leading-10 text-text-brand-secondary-lv1 max-lg:mt-10">
                          <span className="text-3xl leading-9 text-text-brand-secondary-lv1">
                            {t('kyc:COMPANY_BASIC_INFO.UNLOCK')}
                          </span>
                          <br />
                          <span className="text-5xl leading-52px text-text-brand-primary-lv2">
                            {t('kyc:COMPANY_BASIC_INFO.ALL_FUNCTIONS')}
                          </span>
                          <br />
                          <span className="text-xl leading-8 text-text-brand-secondary-lv1">
                            {t('kyc:COMPANY_BASIC_INFO.ON_ISUNFA')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ml-5 flex w-100% flex-col max-lg:pb-10">
                  <div className="mt-1.5 max-md:mt-10 max-md:max-w-full">
                    <div className="flex gap-5 max-lg:flex-col">
                      <div className="flex w-100% flex-col gap-16px max-lg:items-center">
                        <div className="mt-5 text-lg font-semibold leading-7 tracking-normal text-text-neutral-primary lg:mt-24">
                          <ul className="list-disc pl-0 lg:pl-5">
                            <li>{t('kyc:COMPANY_BASIC_INFO.AI_AUDIT_REPORT')}</li>
                            <li>{t('kyc:COMPANY_BASIC_INFO.HIGHER_SECURITY')}</li>
                            <li>{t('kyc:COMPANY_BASIC_INFO.CHANGE_TO_OFFICIAL_ACCOUNT')}</li>
                          </ul>
                        </div>
                        {/* Status Tag // Info: (20240802 - Liz)  */}
                        <p className="w-fit rounded-full bg-badge-surface-soft-primary px-10px py-8px text-xs text-badge-text-primary-solid">
                          {t('kyc:COMPANY_BASIC_INFO.PENDING')}
                        </p>
                      </div>
                      <div className="hidden w-full justify-end lg:relative lg:flex">
                        <Image
                          src="/elements/circle_clock.svg"
                          width={108}
                          height={108}
                          alt="clock"
                          className="ml-1 shrink-0 rounded-l rounded-tr-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mb-5 mr-2 mt-2 flex gap-2 self-center lg:mb-0 lg:self-end">
              <Button
                onClick={goKYCClickHandler}
                variant={'disabledGray'}
                disabled // Info: (20240802 - Liz) Pending 狀態不可點擊
                className="px-8 py-3.5 text-lg font-medium leading-7 tracking-normal max-md:px-5"
              >
                <p>{t('kyc:COMPANY_BASIC_INFO.UNDER_REVIEW')}</p>
              </Button>
            </div>
          </div>
        )}

        {/* KYC banner - 2 - 已通過 KYC */}

        {kycStatusDetail === KYCStatus.APPROVED && (
          <div className="kycCardShadow mt-10 flex flex-col rounded-3xl bg-white pb-3.5">
            <div className="max-md:max-w-full">
              <div className="hidden w-100px min-w-100px lg:absolute lg:block">
                <div className="relative">
                  {/* Info: (20240716 - Shirley) desktop 圓形 */}
                  <Image
                    src="/elements/ellipse_16.png"
                    width={100}
                    height={100}
                    alt="ellipse"
                    className="rounded rounded-tl-lg"
                  />
                  <div className="absolute left-4 top-6">
                    <p className="text-3xl font-bold text-text-brand-primary-lv2">
                      {t('kyc:COMPANY_BASIC_INFO.KYC')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex w-full justify-center lg:hidden">
                <div className="flex items-center justify-center">
                  {/* Info: (20240716 - Shirley) mobile 圓形 */}
                  <div className="relative">
                    <Image
                      src="/elements/ellipse_16_mobile.png"
                      width={160}
                      height={160}
                      alt="ellipse"
                      className=""
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-3xl font-bold text-text-brand-primary-lv2">
                        {t('kyc:COMPANY_BASIC_INFO.KYC')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-0 max-lg:flex-col max-lg:gap-0 lg:ml-1/20">
                <div className="flex w-100% flex-col">
                  <div className="grow">
                    <div className="flex gap-0 max-md:flex-col max-md:gap-0">
                      <div className="ml-0 flex w-100% flex-col max-md:ml-0 max-md:w-full">
                        <div className="mt-24 text-center text-3xl font-bold leading-10 text-text-brand-secondary-lv1 max-lg:mt-10">
                          <span className="text-3xl leading-9 text-text-brand-secondary-lv1">
                            {t('kyc:COMPANY_BASIC_INFO.UNLOCK')}
                          </span>
                          <br />
                          <span className="text-5xl leading-52px text-text-brand-primary-lv2">
                            {t('kyc:COMPANY_BASIC_INFO.ALL_FUNCTIONS')}
                          </span>
                          <br />
                          <span className="text-xl leading-8 text-text-brand-secondary-lv1">
                            {t('kyc:COMPANY_BASIC_INFO.ON_ISUNFA')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ml-5 flex w-100% flex-col max-lg:pb-10">
                  <div className="mt-1.5 max-md:mt-10 max-md:max-w-full">
                    <div className="flex gap-5 max-lg:flex-col">
                      <div className="flex w-100% flex-col gap-16px max-lg:items-center">
                        <div className="mt-5 text-lg font-semibold leading-7 tracking-normal text-text-neutral-primary lg:mt-24">
                          <ul className="list-disc pl-0 lg:pl-5">
                            <li>{t('kyc:COMPANY_BASIC_INFO.AI_AUDIT_REPORT')}</li>
                            <li>{t('kyc:COMPANY_BASIC_INFO.HIGHER_SECURITY')}</li>
                            <li>{t('kyc:COMPANY_BASIC_INFO.CHANGE_TO_OFFICIAL_ACCOUNT')}</li>
                          </ul>
                        </div>
                        {/* Status Tag // Info: (20240802 - Liz)  */}
                        <p className="w-fit rounded-full bg-badge-surface-soft-success px-10px py-8px text-xs text-badge-text-success-solid">
                          {t('kyc:COMPANY_BASIC_INFO.COMPLETE_KYC')}
                        </p>
                      </div>
                      <div className="hidden w-full justify-end lg:relative lg:flex">
                        <Image
                          src="/elements/cloud_check.svg"
                          width={108}
                          height={108}
                          alt="clock"
                          className="ml-1 shrink-0 rounded-l rounded-tr-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mb-5 mr-2 mt-2 flex gap-2 self-center lg:mb-0 lg:self-end">
              <Button
                onClick={goKYCClickHandler}
                variant={'disabledYellow'}
                disabled // Info: (20240802 - Liz) 已通過 KYC 不可點擊
                className="px-8 py-3.5 text-lg font-medium leading-7 tracking-normal max-md:px-5"
              >
                <p>{t('kyc:COMPANY_BASIC_INFO.VERIFIED')}</p>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M20.5333 5.47065C20.8262 5.76354 20.8262 6.23841 20.5333 6.53131L9.53326 17.5313C9.24037 17.8242 8.76549 17.8242 8.4726 17.5313L3.4726 12.5313C3.17971 12.2384 3.17971 11.7635 3.4726 11.4706C3.76549 11.1778 4.24037 11.1778 4.53326 11.4706L9.00293 15.9403L19.4726 5.47065C19.7655 5.17775 20.2404 5.17775 20.5333 5.47065Z"
                    fill="currentColor"
                  />
                </svg>
              </Button>
            </div>
          </div>
        )}

        {/* KYC banner - 3 - KYC 驗證失敗 */}

        {kycStatusDetail === KYCStatus.REJECTED && (
          <div className="kycCardShadow mt-10 flex flex-col rounded-3xl bg-white pb-3.5">
            <div className="max-md:max-w-full">
              <div className="hidden w-100px min-w-100px lg:absolute lg:block">
                <div className="relative">
                  {/* Info: (20240716 - Shirley) desktop 圓形 */}
                  <Image
                    src="/elements/ellipse_16.png"
                    width={100}
                    height={100}
                    alt="ellipse"
                    className="rounded rounded-tl-lg"
                  />
                  <div className="absolute left-4 top-6">
                    <p className="text-3xl font-bold text-text-brand-primary-lv2">
                      {t('kyc:COMPANY_BASIC_INFO.KYC')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex w-full justify-center lg:hidden">
                <div className="flex items-center justify-center">
                  {/* Info: (20240716 - Shirley) mobile 圓形 */}
                  <div className="relative">
                    <Image
                      src="/elements/ellipse_16_mobile.png"
                      width={160}
                      height={160}
                      alt="ellipse"
                      className=""
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-3xl font-bold text-text-brand-primary-lv2">
                        {t('kyc:COMPANY_BASIC_INFO.KYC')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-0 max-lg:flex-col max-lg:gap-0 lg:ml-1/20">
                <div className="flex w-100% flex-col">
                  <div className="grow">
                    <div className="flex gap-0 max-md:flex-col max-md:gap-0">
                      <div className="ml-0 flex w-100% flex-col max-md:ml-0 max-md:w-full">
                        <div className="mt-24 text-center text-3xl font-bold leading-10 text-text-brand-secondary-lv1 max-lg:mt-10">
                          <span className="text-3xl leading-9 text-text-brand-secondary-lv1">
                            {t('kyc:COMPANY_BASIC_INFO.UNLOCK')}
                          </span>
                          <br />
                          <span className="text-5xl leading-52px text-text-brand-primary-lv2">
                            {t('kyc:COMPANY_BASIC_INFO.ALL_FUNCTIONS')}
                          </span>
                          <br />
                          <span className="text-xl leading-8 text-text-brand-secondary-lv1">
                            {t('kyc:COMPANY_BASIC_INFO.ON_ISUNFA')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ml-5 flex w-100% flex-col max-lg:pb-10">
                  <div className="mt-1.5 max-md:mt-10 max-md:max-w-full">
                    <div className="flex gap-5 max-lg:flex-col">
                      <div className="flex w-100% flex-col gap-16px max-lg:items-center">
                        <div className="mt-5 text-lg font-semibold leading-7 tracking-normal text-text-neutral-primary lg:mt-24">
                          <ul className="list-disc pl-0 lg:pl-5">
                            <li>{t('kyc:COMPANY_BASIC_INFO.AI_AUDIT_REPORT')}</li>
                            <li>{t('kyc:COMPANY_BASIC_INFO.HIGHER_SECURITY')}</li>
                            <li>{t('kyc:COMPANY_BASIC_INFO.CHANGE_TO_OFFICIAL_ACCOUNT')}</li>
                          </ul>
                        </div>
                        {/* Status Tag // Info: (20240802 - Liz)  */}
                        <p className="w-fit rounded-full bg-badge-surface-soft-error px-10px py-8px text-xs text-badge-text-error-solid">
                          {t('kyc:COMPANY_BASIC_INFO.VERIFICATION_FAILED_PLEASE_RE_UPLOAD')}
                        </p>
                      </div>
                      <div className="hidden w-full justify-end lg:relative lg:flex">
                        <Image
                          src="/elements/padlock_square.svg"
                          width={78}
                          height={78}
                          alt="padlock"
                          className="ml-1 shrink-0 rounded-l rounded-tr-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mb-5 mr-2 mt-2 flex gap-2 self-center lg:mb-0 lg:self-end">
              <Button
                onClick={goKYCClickHandler}
                variant={'secondaryOutline'}
                className="px-8 py-3.5 text-lg font-medium leading-7 tracking-normal max-md:px-5"
              >
                <p>{t('kyc:COMPANY_BASIC_INFO.GO_KYC')}</p>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    className="fill-current"
                    fillRule="evenodd"
                    d="M11.77 4.456c.44-.44 1.153-.44 1.592 0l6.75 6.75c.44.439.44 1.151 0 1.59l-6.75 6.75a1.125 1.125 0 01-1.591-1.59L17.725 12l-5.954-5.954a1.125 1.125 0 010-1.591z"
                    clipRule="evenodd"
                  ></path>
                  <path
                    className="fill-current"
                    fillRule="evenodd"
                    d="M3.566 12.001c0-.621.504-1.125 1.125-1.125H18.38a1.125 1.125 0 010 2.25H4.69a1.125 1.125 0 01-1.125-1.125z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </Button>
            </div>
          </div>
        )}
      </>
    ) : null;

  return (
    <div className="font-barlow">
      <div className="mt-28 flex w-full shrink-0 grow basis-0 flex-col bg-surface-neutral-main-background px-10 pb-0">
        <div className="mx-0 text-base font-semibold leading-10 text-text-neutral-tertiary max-md:max-w-full lg:mx-0 lg:text-4xl">
          <span className="font-bold text-text-brand-primary-lv2">{company?.name ?? '-'}</span>{' '}
          {t('kyc:COMPANY_BASIC_INFO.BASIC_INFO')}
        </div>
        <div className="mt-3 h-px shrink-0 border border-solid border-gray-300 bg-gray-300 max-md:max-w-full lg:mx-0 lg:mt-6" />
        <div className="mt-7 flex flex-col rounded-lg py-5 max-md:max-w-full lg:px-10">
          <div className="flex gap-4 max-md:max-w-full max-md:flex-wrap">
            <div className="flex gap-2 text-sm font-medium leading-5 tracking-normal text-divider-text-lv-1">
              <div className="my-auto">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path fill="#002462" d="M8 16A8 8 0 108 0a8 8 0 000 16z"></path>
                  <path
                    fill="#FFA502"
                    fillRule="evenodd"
                    d="M9.143 4.571a1.143 1.143 0 11-2.286 0 1.143 1.143 0 012.286 0zM5.57 11.43c0-.395.32-.715.715-.715h1V8.143h-.429a.714.714 0 110-1.429H8c.394 0 .714.32.714.715v3.285h1a.714.714 0 010 1.429H6.286a.714.714 0 01-.715-.714z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
              <div>{t('kyc:COMPANY_BASIC_INFO.COMPANY_INFO')}</div>
            </div>
            <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
              <div className="h-px shrink-0 border border-solid border-divider-stroke-lv-1 max-md:max-w-full" />
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-8 max-md:max-w-full max-md:flex-wrap lg:flex-row lg:gap-5 lg:pr-4">
            <div className="flex w-full justify-between lg:w-fit">
              <button
                type="button"
                disabled={!isEditNameAllowed}
                className="group relative flex h-64px w-64px items-center justify-center overflow-hidden rounded-full lg:h-fit lg:w-fit"
                onClick={updateImageClickHandler}
              >
                <Image
                  src={company?.imageId ?? DEFAULT_COMPANY_IMAGE_URL}
                  alt="company_image"
                  width={100}
                  height={100}
                  className="group-hover:brightness-50 group-disabled:brightness-100"
                />
                <FiEdit
                  className="absolute hidden text-white group-hover:block group-disabled:hidden"
                  size={30}
                />
              </button>
              <div className="my-auto flex flex-col flex-wrap content-center self-stretch lg:hidden">
                <div className="self-end text-sm leading-5 tracking-normal text-text-neutral-tertiary lg:self-start lg:font-semibold">
                  {t('kyc:COMPANY_BASIC_INFO.COMPANY_INFO')}{' '}
                </div>
                <div className="flex gap-0 text-xl font-bold leading-9 text-text-brand-secondary-lv2 lg:mt-4 lg:text-3xl">
                  <div>{company?.name ?? '-'} </div>
                  {isEditNameAllowed && (
                    <Button
                      onClick={editCompanyClickHandler}
                      variant={'secondaryBorderless'}
                      size={'extraSmall'}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="21"
                        height="20"
                        fill="none"
                        viewBox="0 0 21 20"
                      >
                        <path
                          className="fill-current"
                          fillRule="evenodd"
                          d="M15.639 1.554a2.518 2.518 0 013.56 3.56l-7.969 7.97-.046.046c-.243.243-.447.448-.693.598-.216.133-.452.23-.698.29-.28.067-.57.067-.912.066H7.419a.75.75 0 01-.75-.75V11.94v-.066c0-.343 0-.632.067-.912.059-.247.157-.483.289-.699.15-.246.355-.45.598-.692l.047-.047 7.969-7.969zm2.5 1.06a1.018 1.018 0 00-1.44 0l-7.969 7.97c-.313.313-.38.387-.426.462a.917.917 0 00-.11.265c-.02.085-.025.185-.025.628v.645h.645c.444 0 .543-.004.629-.025a.917.917 0 00.265-.11c.074-.046.148-.113.462-.426l7.969-7.969a1.018 1.018 0 000-1.44zm-11.751-.03H9.919a.75.75 0 110 1.5h-3.5c-.712 0-1.202.001-1.581.032-.37.03-.57.086-.714.16a1.75 1.75 0 00-.764.764c-.074.144-.13.343-.16.713-.03.38-.031.869-.031 1.581v7c0 .713 0 1.202.032 1.581.03.37.085.57.159.714.167.33.435.597.764.765.145.073.344.129.714.159.38.03.869.031 1.58.031h7c.713 0 1.203 0 1.582-.031.37-.03.57-.086.713-.16a1.75 1.75 0 00.765-.764c.074-.144.13-.343.16-.714.03-.379.03-.868.03-1.58v-3.5a.75.75 0 011.5 0v3.53c.001.674.001 1.225-.036 1.673-.038.463-.118.881-.317 1.272a3.25 3.25 0 01-1.42 1.42c-.391.2-.81.28-1.273.318-.447.036-.998.036-1.672.036H6.388c-.674 0-1.225 0-1.672-.036-.463-.038-.882-.119-1.273-.318a3.25 3.25 0 01-1.42-1.42c-.199-.39-.28-.81-.318-1.272-.036-.448-.036-.999-.036-1.672V7.303c0-.673 0-1.224.036-1.672.038-.463.12-.881.318-1.272a3.25 3.25 0 011.42-1.42c.391-.2.81-.28 1.273-.318.447-.037.998-.037 1.672-.037z"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="my-auto flex flex-col flex-wrap content-center self-stretch">
              <div className="hidden self-end text-sm leading-5 tracking-normal text-text-neutral-tertiary lg:flex lg:self-start lg:font-semibold">
                {t('kyc:COMPANY_BASIC_INFO.COMPANY_NAME')}{' '}
              </div>
              <div className="hidden gap-1 self-end text-xl font-bold leading-9 text-text-brand-secondary-lv2 lg:mt-4 lg:flex lg:self-center lg:text-3xl">
                <div>{company?.name ?? '-'}</div>
                <Button
                  disabled={!isEditNameAllowed}
                  onClick={editCompanyClickHandler}
                  variant={'secondaryBorderless'}
                  size={'extraSmall'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="21"
                    height="20"
                    fill="none"
                    viewBox="0 0 21 20"
                  >
                    <path
                      className="fill-current"
                      fillRule="evenodd"
                      d="M15.639 1.554a2.518 2.518 0 013.56 3.56l-7.969 7.97-.046.046c-.243.243-.447.448-.693.598-.216.133-.452.23-.698.29-.28.067-.57.067-.912.066H7.419a.75.75 0 01-.75-.75V11.94v-.066c0-.343 0-.632.067-.912.059-.247.157-.483.289-.699.15-.246.355-.45.598-.692l.047-.047 7.969-7.969zm2.5 1.06a1.018 1.018 0 00-1.44 0l-7.969 7.97c-.313.313-.38.387-.426.462a.917.917 0 00-.11.265c-.02.085-.025.185-.025.628v.645h.645c.444 0 .543-.004.629-.025a.917.917 0 00.265-.11c.074-.046.148-.113.462-.426l7.969-7.969a1.018 1.018 0 000-1.44zm-11.751-.03H9.919a.75.75 0 110 1.5h-3.5c-.712 0-1.202.001-1.581.032-.37.03-.57.086-.714.16a1.75 1.75 0 00-.764.764c-.074.144-.13.343-.16.713-.03.38-.031.869-.031 1.581v7c0 .713 0 1.202.032 1.581.03.37.085.57.159.714.167.33.435.597.764.765.145.073.344.129.714.159.38.03.869.031 1.58.031h7c.713 0 1.203 0 1.582-.031.37-.03.57-.086.713-.16a1.75 1.75 0 00.765-.764c.074-.144.13-.343.16-.714.03-.379.03-.868.03-1.58v-3.5a.75.75 0 011.5 0v3.53c.001.674.001 1.225-.036 1.673-.038.463-.118.881-.317 1.272a3.25 3.25 0 01-1.42 1.42c-.391.2-.81.28-1.273.318-.447.036-.998.036-1.672.036H6.388c-.674 0-1.225 0-1.672-.036-.463-.038-.882-.119-1.273-.318a3.25 3.25 0 01-1.42-1.42c-.199-.39-.28-.81-.318-1.272-.036-.448-.036-.999-.036-1.672V7.303c0-.673 0-1.224.036-1.672.038-.463.12-.881.318-1.272a3.25 3.25 0 011.42-1.42c.391-.2.81-.28 1.273-.318.447-.037.998-.037 1.672-.037z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </Button>
              </div>
            </div>

            <div className="my-auto flex flex-row flex-wrap content-center items-center justify-between self-stretch lg:flex-col">
              <div className="text-sm font-semibold leading-5 tracking-normal text-text-neutral-tertiary">
                {t('kyc:COMPANY_BASIC_INFO.TAX_ID_NUMBER')}{' '}
              </div>
              <div className="text-xl font-bold leading-8 text-text-brand-secondary-lv1 lg:mt-4">
                {company?.code ?? '-'}
              </div>
            </div>
            <div className="my-auto flex flex-row flex-wrap content-center items-center justify-between self-stretch lg:flex-col">
              <div className="text-sm font-semibold leading-5 tracking-normal text-text-neutral-tertiary">
                {t('kyc:COMPANY_BASIC_INFO.ADMIN_ACCOUNT_ID')}{' '}
              </div>

              {displayedOwnerId}
            </div>
            <div className="my-auto flex flex-row flex-wrap content-center items-center justify-between self-stretch lg:flex-col">
              <div className="text-sm font-semibold leading-5 tracking-normal text-text-neutral-tertiary">
                {t('kyc:COMPANY_BASIC_INFO.CREATED_DATE')}{' '}
              </div>
              <div className="text-xl font-bold leading-8 text-text-neutral-primary lg:mt-5">
                {timestampToString(company?.createdAt, '/').date}
              </div>
            </div>
          </div>

          {/* ===== KYC ===== */}

          {displayedKYC}

          {/* ===== ACCOUNT ===== */}

          <div className="mt-10 flex gap-4 max-md:max-w-full max-md:flex-wrap">
            <div className="flex gap-2 whitespace-nowrap text-sm font-medium leading-5 tracking-normal text-divider-text-lv-1">
              <div className="my-auto">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill="#002462"
                    fillRule="evenodd"
                    d="M2.134.107c-1.079 0-1.902.898-1.902 1.94v11.906c0 1.043.823 1.94 1.902 1.94h9.4c1.079 0 1.902-.898 1.902-1.94V2.107a2 2 0 00-2-2H2.134z"
                    clipRule="evenodd"
                  ></path>
                  <path
                    fill="#FFA502"
                    fillRule="evenodd"
                    d="M1.09 11.714H.232v2.239c0 1.042.823 1.94 1.902 1.94h9.4c1.079 0 1.902-.898 1.902-1.94v-2.239H1.089zM3.233 3.437a.714.714 0 000 1.428h2.852a.714.714 0 100-1.428H3.233zm0 3.277a.714.714 0 100 1.429h1.426a.714.714 0 000-1.429H3.233z"
                    clipRule="evenodd"
                  ></path>
                  <path
                    fill="#FFA502"
                    d="M10.745 8.45a.571.571 0 01-.303.16l-2.456.442a.571.571 0 01-.665-.655l.41-2.494a.571.571 0 01.161-.312L12.596.909a1.144 1.144 0 011.623 0l1.21 1.212a1.144 1.144 0 010 1.623L10.746 8.45z"
                  ></path>
                </svg>
              </div>
              <div>{t('kyc:COMPANY_BASIC_INFO.ACCOUNT')}</div>
            </div>
            <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
              <div className="h-px shrink-0 border border-solid border-divider-stroke-lv-1 max-md:max-w-full" />
            </div>
          </div>
          <div className="mt-10 flex justify-center gap-5 self-start text-base font-medium leading-6 tracking-normal text-text-brand-secondary-lv1 max-md:flex-wrap lg:justify-between">
            {displayedOperations}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyInfoPageBody;
