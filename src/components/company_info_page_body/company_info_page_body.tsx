import { Button } from '@/components/button/button';
import Skeleton from '@/components/skeleton/skeleton';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_COMPANY_IMAGE_URL } from '@/constants/display';
import { CompanyRoleName } from '@/constants/role';
import { UploadType } from '@/constants/file';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useGlobalCtx } from '@/contexts/global_context';
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import { ICompany, ICompanyAndRoleDetail } from '@/interfaces/company';
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
import { IoArrowForward } from 'react-icons/io5';
import { FaCheck } from 'react-icons/fa6';

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
  } = APIHandler<ICompanyAndRoleDetail>(
    APIName.COMPANY_GET_BY_ID,
    {
      params: {
        companyId: selectedCompany?.id,
      },
    },
    hasCompanyId
  );

  const kycStatusDetail = companyData?.company.kycStatusDetail ?? null;

  const isEditNameAllowed = role?.name === CompanyRoleName.OWNER;

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
    router.push(ISUNFA_ROUTE.DASHBOARD);
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
  ) : role?.name === CompanyRoleName.OWNER ? (
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
              <Image src="/icons/fingerprint.svg" width={16} height={16} alt="fingerprint"></Image>
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
                <IoArrowForward size={24} />
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
                <FaCheck size={24} />
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
                <IoArrowForward size={24} />
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
                <Image src="/icons/info.svg" width={16} height={16} alt="company"></Image>
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
                      <FiEdit size={20} />
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
                  <FiEdit size={20} />
                </Button>
              </div>
            </div>

            <div className="my-auto flex flex-row flex-wrap content-center items-center justify-between self-stretch lg:flex-col">
              <div className="text-sm font-semibold leading-5 tracking-normal text-text-neutral-tertiary">
                {t('kyc:COMPANY_BASIC_INFO.TAX_ID_NUMBER')}{' '}
              </div>
              <div className="text-xl font-bold leading-8 text-text-brand-secondary-lv1 lg:mt-4">
                {company?.taxId ?? '-'}
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
                <Image src="/icons/edit.svg" width={16} height={16} alt="edit"></Image>
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
