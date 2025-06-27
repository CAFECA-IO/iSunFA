import { Dispatch, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IoCloseOutline, IoChevronDown, IoChevronUp, IoSaveOutline } from 'react-icons/io5';
import { FiEdit2 } from 'react-icons/fi';
// import { cn } from '@/lib/utils/common';
import Image from 'next/image';
// import { cityDistrictMap, CityList } from '@/constants/city_district';
import { IAccountBook, IAccountBookWithTeam } from '@/interfaces/account_book';
import { Step1FormAction, Step1FormState } from '@/constants/account_book';
import { ITeam } from '@/interfaces/team';
import ChangePictureModal from '@/components/beta/account_books_page/change_picture_modal';
import { APIName } from '@/constants/api_connection';
import { UploadType } from '@/constants/file';
import { IFileUIBeta } from '@/interfaces/file';
import APIHandler from '@/lib/utils/api_handler';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import CurrencyDropdown from '@/components/dropdown/currency_dropdown';
import LocationDropdown from '@/components/dropdown/location_dropdown';
import loggerFront from '@/lib/utils/logger_front';

// Deprecated: (20250604 - Liz) 此元件正在修改中，請勿編輯內容或加入註解

interface StepOneFormProps {
  teamList: ITeam[];
  closeAccountBookInfoModal: () => void;
  step1FormState: Step1FormState;
  step1FormDispatch: Dispatch<Step1FormAction>;
  accountBookToEdit?: IAccountBookWithTeam;
  handleSubmit: ({ passedFileId }: { passedFileId?: number }) => Promise<void>;
  handleEdit: () => Promise<void>;
  disabledSubmit: boolean;
}
const StepOneForm = ({
  teamList,
  closeAccountBookInfoModal,
  step1FormState,
  step1FormDispatch,
  accountBookToEdit,
  handleSubmit,
  handleEdit,
  disabledSubmit,
}: StepOneFormProps) => {
  const { t } = useTranslation(['dashboard', 'city_district']);
  const isEditMode = !!accountBookToEdit;
  const canTransferAccountBook = isEditMode
    ? convertTeamRoleCanDo({
        teamRole: accountBookToEdit.team.role,
        canDo: TeamPermissionAction.REQUEST_ACCOUNT_BOOK_TRANSFER,
      }).can
    : true; // Info: (20250526 - Liz) 如果不是在編輯帳本，就不需要檢查權限

  const {
    imageId,
    companyName,
    businessLocation,
    accountingCurrency,
    taxId,
    team,
    // taxSerialNumber,
    // tag,
    // representativeName,
    // contactPerson,
    // isSameAsResponsiblePerson,
    // phoneNumber,
    // city,
    // district,
    // districtOptions,
    // enteredAddress,
    // isTagDropdownOpen,
    isTeamDropdownOpen,
    // isCityDropdownOpen,
    // isDistrictDropdownOpen,
    // responsiblePersonError,
    // taxSerialNumberError,
    // tagError,
    companyNameError,
    taxIdError,
    businessLocationError,
    accountingCurrencyError,
    teamError,
  } = step1FormState;

  const [isChangePictureModalOpen, setIsChangePictureModalOpen] = useState<boolean>(false);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null); // Info: (20250430 - Liz) 這是用來上傳的圖片格式
  const [savedImage, setSavedImage] = useState<string | null>(null); // Info: (20250430 - Liz) 這是用來預覽的圖片格式

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { trigger: uploadFileAPI } = APIHandler<IFileUIBeta>(APIName.FILE_UPLOAD);
  const { trigger: uploadAccountBookImageAPI } = APIHandler<IAccountBook>(
    APIName.ACCOUNT_BOOK_PUT_ICON
  );

  const handleChange =
    (field: keyof Step1FormState) =>
    (
      value:
        | Step1FormState[keyof Step1FormState]
        | ((prev: Step1FormState[keyof Step1FormState]) => Step1FormState[keyof Step1FormState])
    ) => {
      step1FormDispatch({ type: 'UPDATE_FIELD', field, value });
    };

  // const toggleTagDropdown = () => {
  //   handleChange('isTagDropdownOpen')((prev) => !prev);
  //   // Info: (20250409 - Liz) 關閉其他下拉選單
  //   if (isTeamDropdownOpen) handleChange('isTeamDropdownOpen')(false);
  //   if (isCityDropdownOpen) handleChange('isCityDropdownOpen')(false);
  //   if (isDistrictDropdownOpen) handleChange('isDistrictDropdownOpen')(false);
  // };

  const toggleTeamDropdown = () => {
    handleChange('isTeamDropdownOpen')((prev) => !prev);
    // Info: (20250409 - Liz) 關閉其他下拉選單
    // handleChange('isTagDropdownOpen')(false);
    // handleChange('isCityDropdownOpen')(false);
    // handleChange('isDistrictDropdownOpen')(false);
  };

  // const toggleCityDropdown = () => {
  //   handleChange('isCityDropdownOpen')((prev) => !prev);
  //   // Info: (20250409 - Liz) 關閉其他下拉選單
  //   handleChange('isTagDropdownOpen')(false);
  //   handleChange('isTeamDropdownOpen')(false);
  //   handleChange('isDistrictDropdownOpen')(false);
  // };

  // const toggleDistrictDropdown = () => {
  //   handleChange('isDistrictDropdownOpen')((prev) => !prev);
  //   // Info: (20250409 - Liz) 關閉其他下拉選單
  //   handleChange('isTagDropdownOpen')(false);
  //   handleChange('isTeamDropdownOpen')(false);
  //   handleChange('isCityDropdownOpen')(false);
  // };

  // Info: (20250527 - Liz) 驗證必填欄位後才可以提交表單
  const validateRequiredFields = () => {
    let isValid = true;

    if (!companyName) {
      handleChange('companyNameError')(
        t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_THE_NAME')
      );
      isValid = false;
    } else {
      handleChange('companyNameError')(null);
    }

    // if (!representativeName) {
    //   handleChange('responsiblePersonError')(
    //     t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_RESPONSIBLE_PERSON')
    //   );
    //   isValid = false;
    // } else {
    //   handleChange('responsiblePersonError')(null);
    // }

    if (!taxId) {
      handleChange('taxIdError')(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_TAX_ID'));
      isValid = false;
    } else {
      handleChange('taxIdError')(null);
    }

    // if (!taxSerialNumber) {
    //   handleChange('taxSerialNumberError')(
    //     t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_TAX_SERIAL_NUMBER')
    //   );
    //   isValid = false;
    // } else {
    //   handleChange('taxSerialNumberError')(null);
    // }

    if (!businessLocation) {
      handleChange('businessLocationError')(
        t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_BUSINESS_LOCATION')
      );
      isValid = false;
    } else {
      handleChange('businessLocationError')(null);
    }

    if (!accountingCurrency) {
      handleChange('accountingCurrencyError')(
        t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_ACCOUNTING_CURRENCY')
      );
      isValid = false;
    } else {
      handleChange('accountingCurrencyError')(null);
    }

    if (!team) {
      handleChange('teamError')(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_SELECT_A_TEAM'));
      isValid = false;
    } else {
      handleChange('teamError')(null);
    }

    // if (!tag) {
    //   handleChange('tagError')(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_SELECT_A_WORK_TAG'));
    //   isValid = false;
    // } else {
    //   handleChange('tagError')(null);
    // }

    return isValid;
  };

  const openUploadCompanyPictureModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsChangePictureModalOpen(true);
    e.stopPropagation(); // Info: (20250428 - Liz) 避免點擊選單時觸發父元素的點擊事件
  };

  // Info: (20250527 - Liz) onSave 函式，在 ChangePictureModal 裁切圖片後，會呼叫這個函式來儲存裁切後的圖片
  const onSave = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setSavedImage(url);
    setCroppedBlob(blob);
    setIsChangePictureModalOpen(false);
  };

  // Info: (20250527 - Liz) 新增帳本圖片 (建立帳本時上傳圖片)
  const createAccountBookImage = useCallback(
    async (file: File) => {
      if (isLoading) return undefined;
      setIsLoading(true);

      try {
        // Info: (20241212 - Liz) 打 API 上傳檔案
        const formData = new FormData();
        formData.append('file', file);
        const { success: uploadFileSuccess, data: fileMeta } = await uploadFileAPI({
          body: formData,
        });

        if (!uploadFileSuccess || !fileMeta) {
          loggerFront.error('Failed to upload file:', file.name);
          return undefined;
        }

        return fileMeta.id ?? undefined;
      } catch (error) {
        loggerFront.error('Failed to upload file:', error);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [handleChange, isLoading]
  );

  // Info: (20250527 - Liz) 更新帳本圖片 (編輯帳本時上傳圖片)
  const updateAccountBookImage = useCallback(
    async (file: File) => {
      if (!accountBookToEdit) return;
      if (isLoading) return;
      setIsLoading(true);

      try {
        // Info: (20241212 - Liz) 打 API 上傳檔案
        const formData = new FormData();
        formData.append('file', file);
        const { success: uploadFileSuccess, data: fileMeta } = await uploadFileAPI({
          query: {
            type: UploadType.COMPANY,
            targetId: String(accountBookToEdit.id),
          },
          body: formData,
        });

        if (!uploadFileSuccess || !fileMeta) {
          loggerFront.error('Failed to upload file:', file.name);
          return;
        }

        // Info: (20241212 - Liz) 打 API 更新帳本圖片
        const { success, error } = await uploadAccountBookImageAPI({
          params: { accountBookId: accountBookToEdit.id },
          body: { fileId: fileMeta.id },
        });

        if (!success) {
          loggerFront.error('更新帳本圖片失敗! error message:', error?.message);
        }

        loggerFront.log('帳本圖片更新成功:', fileMeta.id);
      } catch (error) {
        loggerFront.error('Failed to upload file:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [accountBookToEdit, isLoading]
  );

  const onClickSubmit = async () => {
    const isValid = validateRequiredFields();
    if (!isValid) return;

    // Info: (20250527 - Liz) 編輯模式：更新圖片 + 編輯帳本
    if (isEditMode) {
      if (croppedBlob) {
        const file = new File([croppedBlob], 'cropped-image.jpg', { type: croppedBlob.type });
        await updateAccountBookImage(file);
      }

      await handleEdit();
      return;
    }

    // Info: (20250527 - Liz) 新增模式：新增圖片 + 新增帳本
    let fileId: number | undefined;

    if (croppedBlob) {
      const file = new File([croppedBlob], 'cropped-image.jpg', { type: croppedBlob.type });
      fileId = await createAccountBookImage(file);
    }

    await handleSubmit({ passedFileId: fileId });
  };

  // Info: (20250430 - Liz) 避免記憶體外洩，component unmount 時清除 blob URL
  useEffect(() => {
    return () => {
      if (savedImage) URL.revokeObjectURL(savedImage);
    };
  }, [savedImage]);

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="w-90vw overflow-hidden rounded-md bg-surface-neutral-surface-lv1 tablet:w-auto">
        <header className="flex items-center justify-between px-20px py-16px tablet:px-40px tablet:pb-24px tablet:pt-40px">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
            {accountBookToEdit
              ? t('dashboard:ACCOUNT_BOOK_INFO_MODAL.EDIT_ACCOUNT_BOOK')
              : t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CREATE_NEW_ACCOUNT_BOOK')}
          </h1>
          <button
            type="button"
            onClick={closeAccountBookInfoModal}
            className="text-icon-surface-single-color-primary"
          >
            <IoCloseOutline size={24} />
          </button>
        </header>

        <div className="flex max-h-65vh flex-col gap-40px overflow-y-auto px-lv-4 pb-40px tablet:gap-24px tablet:px-40px">
          {/* Info: (20250409 - Liz) Divider - Basic info */}
          <section className="flex items-center gap-lv-4">
            <div className="flex items-center gap-lv-2 text-sm font-medium text-divider-text-lv-2">
              <Image
                src="/icons/asset_management_icon.svg"
                width={16}
                height={16}
                alt="building_icon"
              />
              <span>{t('dashboard:ACCOUNT_BOOK_INFO_MODAL.BASIC_INFO')}</span>
            </div>
            <div className="h-1px flex-auto bg-divider-stroke-lv-4"></div>
          </section>

          <section className="flex flex-col items-center gap-24px tablet:flex-row">
            {/* Info: (20250428 - Liz) 帳本圖片 */}
            {savedImage || imageId ? (
              <button
                type="button"
                onClick={openUploadCompanyPictureModal}
                className="group relative shrink-0"
              >
                <Image
                  src={savedImage || imageId}
                  width={168}
                  height={168}
                  alt="account book image"
                  className="h-168px w-168px rounded-sm border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 object-contain"
                />

                <div className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-sm border border-stroke-neutral-quaternary text-sm text-black opacity-0 backdrop-blur-sm group-hover:opacity-100">
                  <FiEdit2 size={24} />
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={openUploadCompanyPictureModal}
                className="flex h-168px w-168px shrink-0 items-center justify-center rounded-sm border border-stroke-neutral-quaternary bg-surface-neutral-mute"
              >
                <Image src="/icons/upload_icon.svg" width={48} height={48} alt="upload_icon" />
              </button>
            )}

            <section className="flex w-full flex-col gap-24px">
              <div className="flex flex-col items-start gap-x-lv-7 gap-y-lv-4 tablet:flex-row">
                {/* Info: (20250409 - Liz) 公司名稱 */}
                <div className="flex w-full flex-col gap-8px tablet:w-250px">
                  <h4 className="font-semibold text-input-text-primary">
                    {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.COMPANY_NAME')}
                    <span className="text-text-state-error"> *</span>
                  </h4>
                  <div>
                    <input
                      type="text"
                      placeholder={t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ENTER_NAME')}
                      className="w-full rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
                      value={companyName}
                      onChange={(e) => handleChange('companyName')(e.target.value)}
                    />
                    {companyNameError && !companyName && (
                      <p className="text-right text-sm font-medium text-text-state-error">
                        {companyNameError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Info: (20250409 - Liz) 統一編號 */}
                <div className="flex w-full flex-col gap-8px tablet:w-250px">
                  <h4 className="font-semibold text-input-text-primary">
                    {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.TAX_ID')}
                    <span className="text-text-state-error"> *</span>
                  </h4>
                  <div>
                    <input
                      type="number"
                      placeholder={t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ENTER_TAX_ID')}
                      className="w-full rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
                      value={taxId}
                      onWheel={(e) => e.currentTarget.blur()} // Info: (20250623 - Julian) 禁止滾輪改變數字輸入框的值
                      onChange={(e) => handleChange('taxId')(e.target.value)}
                    />
                    {taxIdError && !taxId && (
                      <p className="text-right text-sm font-medium text-text-state-error">
                        {taxIdError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-x-lv-7 gap-y-lv-4 tablet:flex-row">
                {/* Info: (20250604 - Liz) Business Location 商業地址 */}
                {/* ToDo: (20250624 - Julian) 應改成「公司國籍」 */}
                <div className="flex w-full flex-col gap-8px tablet:w-250px">
                  <h4 className="font-semibold text-input-text-primary">
                    {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.BUSINESS_LOCATION')}
                    <span className="text-text-state-error"> *</span>
                  </h4>
                  <div>
                    <LocationDropdown
                      currentLocation={businessLocation}
                      setCurrentLocation={(value) => handleChange('businessLocation')(value)}
                    />
                    {businessLocationError && !businessLocation && (
                      <p className="text-right text-sm font-medium text-text-state-error">
                        {businessLocationError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Info: (20250409 - Liz) Accounting Currency 會計幣別 */}
                <div className="flex w-full flex-col gap-8px tablet:w-250px">
                  <h4 className="font-semibold text-input-text-primary">
                    {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ACCOUNTING_CURRENCY')}
                    <span className="text-text-state-error"> *</span>
                  </h4>
                  <div>
                    <CurrencyDropdown
                      currentCurrency={accountingCurrency}
                      setCurrentCurrency={(value) => handleChange('accountingCurrency')(value)}
                    />

                    {accountingCurrencyError && !accountingCurrency && (
                      <p className="text-right text-sm font-medium text-text-state-error">
                        {accountingCurrencyError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </section>

          {/* Info: (20250418 - Liz) Divider - Contact info */}
          {/* <section className="flex items-center gap-16px">
            <div className="flex items-center gap-8px">
              <Image src="/icons/phone_icon.svg" width={16} height={16} alt="phone_icon" />
              <span>{t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CONTACT_INFO')}</span>
            </div>
            <div className="h-1px flex-auto bg-divider-stroke-lv-1"></div>
          </section> */}

          {/* Info: (20250410 - Liz) 聯絡人 & 電話號碼 */}
          {/* <section className="flex items-start gap-14px">
            <div className="flex flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">
                {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CONTACT_PERSON')}
              </h4>

              <div className="flex flex-auto overflow-hidden rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow-Dropshadow_SM">
                <input
                  type="text"
                  placeholder={t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ENTER_CONTACT_PERSON')}
                  className="min-w-0 flex-auto bg-transparent px-12px py-10px text-base font-medium outline-none placeholder:text-input-text-input-placeholder"
                  value={isSameAsResponsiblePerson ? representativeName : contactPerson}
                  onChange={(e) => handleChange('contactPerson')(e.target.value)}
                />
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isSameAsResponsiblePerson}
                  onClick={() => {
                    handleChange('isSameAsResponsiblePerson')((prev) => !prev);
                  }}
                  className="flex flex-none items-center gap-8px px-12px py-10px outline-none"
                >
                  <div
                    className={cn(
                      'flex h-16px w-16px items-center justify-center rounded-xxs border border-checkbox-stroke-unselected bg-checkbox-surface-unselected',
                      {
                        'bg-checkbox-surface-selected': isSameAsResponsiblePerson,
                        'hover:bg-checkbox-surface-hover': !isSameAsResponsiblePerson,
                      }
                    )}
                  >
                    {isSameAsResponsiblePerson && (
                      <Image
                        src="/icons/checked_white.svg"
                        alt="checkbox_icon"
                        width={10}
                        height={10}
                      />
                    )}
                  </div>
                  <span className="text-base font-medium text-input-text-input-placeholder">
                    {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.SAME_AS_RESPONSIBLE_PERSON')}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-auto flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">
                {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PHONE_NUMBER')}
              </h4>
              <input
                type="number"
                placeholder={t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ENTER_PHONE_NUMBER')}
                className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
                value={phoneNumber}
                onChange={(e) => handleChange('phoneNumber')(e.target.value)}
              />
            </div>
          </section> */}

          {/* Info: (20250409 - Liz) 縣市 City & 行政區 District & 使用者輸入地址(街道巷弄樓層) */}
          {/* <section className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.BUSINESS_ADDRESS')}
            </h4>

            <main className="flex gap-14px">
              <div className="relative w-180px">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-start text-dropdown-text-input-filled shadow-Dropshadow_SM"
                  onClick={toggleCityDropdown}
                >
                  <p className="px-12px py-10px text-base font-medium">
                    {city ? (
                      t(`city_district:CITY.${city}`)
                    ) : (
                      <span className="text-input-text-input-placeholder">
                        {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CHOOSE_CITY')}
                      </span>
                    )}
                  </p>

                  <div className="px-12px py-10px">
                    {isCityDropdownOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                  </div>
                </button>

                {isCityDropdownOpen && (
                  <div className="absolute inset-x-0 top-full z-10 mt-8px">
                    <div className="mb-20px overflow-hidden rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary shadow-Dropshadow_M">
                      <div className="flex max-h-200px flex-col overflow-y-auto p-8px">
                        {CityList.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              handleChange('city')(item);
                              handleChange('districtOptions')(cityDistrictMap[item]);
                              handleChange('district')(null);
                              toggleCityDropdown();
                            }}
                            className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                          >
                            {t('city_district:CITY.' + item)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative w-180px">
                <button
                  type="button"
                  disabled={!city}
                  className="flex w-full items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-start text-dropdown-text-input-filled shadow-Dropshadow_SM"
                  onClick={toggleDistrictDropdown}
                >
                  <p className="px-12px py-10px text-base font-medium">
                    {district ? (
                      t(`city_district:${city}.${district}`)
                    ) : (
                      <span className="text-input-text-input-placeholder">
                        {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CHOOSE_DISTRICT')}
                      </span>
                    )}
                  </p>

                  <div className="px-12px py-10px">
                    {isDistrictDropdownOpen ? (
                      <IoChevronUp size={20} />
                    ) : (
                      <IoChevronDown size={20} />
                    )}
                  </div>
                </button>

                {isDistrictDropdownOpen && (
                  <div className="absolute inset-x-0 top-full z-10 mt-8px">
                    <div className="mb-20px overflow-hidden rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary shadow-Dropshadow_M">
                      <div className="flex max-h-200px flex-col overflow-y-auto p-8px">
                        {districtOptions.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              handleChange('district')(item);
                              toggleDistrictDropdown();
                            }}
                            className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                          >
                            {t(`city_district:${city}.${item}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder={t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ENTER_FULL_ADDRESS')}
                className="flex-auto rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
                value={enteredAddress}
                onChange={(e) => handleChange('enteredAddress')(e.target.value)}
              />
            </main>
          </section> */}

          {/* Info: (20250409 - Liz) Divider */}
          <section className="flex items-center gap-lv-4">
            <div className="flex items-center gap-lv-2 text-sm font-medium text-divider-text-lv-2">
              <Image src="/icons/team_icon.svg" alt="team icon" width={16} height={16} />
              <span>{t('dashboard:ACCOUNT_BOOK_INFO_MODAL.TEAM')}</span>
            </div>
            <div className="h-1px flex-auto bg-divider-stroke-lv-4"></div>
          </section>

          <section className="flex items-start gap-24px">
            {/* Info: (20250213 - Liz) Team 選擇團隊 */}
            <div className="flex flex-1 flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">
                {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.TEAM')}
                <span className="text-text-state-error"> *</span>
              </h4>

              <div className="relative flex flex-col">
                <button
                  type="button"
                  onClick={toggleTeamDropdown}
                  disabled={!canTransferAccountBook}
                  className="flex items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
                >
                  <p className="px-12px py-10px text-base font-medium">
                    {team ? (
                      team.name.value
                    ) : (
                      <span className="text-input-text-input-placeholder">
                        {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CHOOSE_TEAM')}
                      </span>
                    )}
                  </p>

                  <div className="px-12px py-10px">
                    {isTeamDropdownOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                  </div>
                </button>

                {teamError && !isTeamDropdownOpen && (
                  <p className="text-right text-sm font-medium text-text-state-error">
                    {teamError}
                  </p>
                )}

                {isTeamDropdownOpen && (
                  <div className="absolute inset-x-0 top-full z-10 mt-8px">
                    <div className="mb-20px flex flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                      {teamList &&
                        teamList.length > 0 &&
                        teamList.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              handleChange('team')(item);
                              toggleTeamDropdown();
                              handleChange('teamError')(null);
                            }}
                            className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                          >
                            {item.name.value}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info: (20250213 - Liz) Work Tag 工作標籤 */}
            {/* <div className="flex flex-1 flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">
                {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.WORK_TAG')}
                <span className="text-text-state-error"> *</span>
              </h4>

              <div className="relative flex flex-col">
                <button
                  type="button"
                  className="flex items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM"
                  onClick={toggleTagDropdown}
                >
                  <p className="px-12px py-10px text-base font-medium">
                    {tag ? (
                      t('dashboard:WORK_TAG.' + tag.toUpperCase())
                    ) : (
                      <span className="text-input-text-input-placeholder">
                        {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CHOOSE_WORK_TAG')}
                      </span>
                    )}
                  </p>

                  <div className="px-12px py-10px">
                    {isTagDropdownOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                  </div>
                </button>

                {tagError && !isTagDropdownOpen && (
                  <p className="text-right text-sm font-medium text-text-state-error">{tagError}</p>
                )}

                {isTagDropdownOpen && (
                  <div className="absolute inset-x-0 top-full z-10 mt-8px">
                    <div className="mb-20px flex flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                      {Object.values(WORK_TAG).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            handleChange('tag')(item);
                            toggleTagDropdown();
                            handleChange('tagError')(null);
                          }}
                          className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                        >
                          {t('dashboard:WORK_TAG.' + item.toUpperCase())}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div> */}
          </section>

          <section className="flex justify-end gap-12px">
            <button
              type="button"
              onClick={closeAccountBookInfoModal}
              className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
            >
              {t('dashboard:COMMON.CANCEL')}
            </button>

            {/* Info: (20250523 - Liz) 送出表單 */}
            <button
              type="button"
              onClick={onClickSubmit}
              disabled={disabledSubmit}
              className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            >
              <span>{t('dashboard:COMMON.SAVE')}</span>
              <IoSaveOutline size={16} />
            </button>
          </section>
        </div>
      </div>

      {/* Info: (20250428 - Liz) modal */}
      {isChangePictureModalOpen && (
        <ChangePictureModal closeModal={() => setIsChangePictureModalOpen(false)} onSave={onSave} />
      )}
    </main>
  );
};

export default StepOneForm;
