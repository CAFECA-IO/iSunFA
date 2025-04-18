import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IoCloseOutline, IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { FaArrowRightLong } from 'react-icons/fa6';
import { useUserCtx } from '@/contexts/user_context';
import { WORK_TAG } from '@/interfaces/account_book';
// import { useModalContext } from '@/contexts/modal_context';
// import { ToastType, ToastPosition } from '@/interfaces/toastify';
import { ITeam } from '@/interfaces/team';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { IPaginatedData } from '@/interfaces/pagination';
import Image from 'next/image';
import { cityDistrictMap, CityList } from '@/constants/city_district';
import StepTwoBusinessTaxSetting from '@/components/beta/account_books_page/step_two_business_tax_setting';
import { cn } from '@/lib/utils/common';

interface AccountBookInfoModalProps {
  closeCreateAccountBookModal: () => void;
  setRefreshKey?: Dispatch<SetStateAction<number>>;
  getAccountBookList?: () => void;
}
// ToDo: (20250418 - Liz) 等替換掉舊的 modal 後再改名為 CreateAccountBookModal
const AccountBookInfoModal = ({
  closeCreateAccountBookModal,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setRefreshKey,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAccountBookList,
}: AccountBookInfoModalProps) => {
  const { t } = useTranslation(['dashboard', 'city_district']);
  // const { createAccountBook, userAuth } = useUserCtx();
  const { userAuth } = useUserCtx();
  // const { toastHandler } = useModalContext();

  const [companyName, setCompanyName] = useState<string>('');
  const [responsiblePerson, setResponsiblePerson] = useState<string>('');
  const [taxId, setTaxId] = useState<string>('');
  const [taxSerialNumber, setTaxSerialNumber] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [isSameAsResponsiblePerson, setIsSameAsResponsiblePerson] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  const [tag, setTag] = useState<WORK_TAG | null>(null);
  const [teamList, setTeamList] = useState<ITeam[] | null>(null);
  const [team, setTeam] = useState<ITeam | null>(null);

  const [city, setCity] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [enteredAddress, setEnteredAddress] = useState<string>('');

  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState<boolean>(false);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState<boolean>(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState<boolean>(false);
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState<boolean>(false);

  const [companyNameError, setCompanyNameError] = useState<string | null>(null);
  const [responsiblePersonError, setResponsiblePersonError] = useState<string | null>(null);
  const [taxIdError, setTaxIdError] = useState<string | null>(null);
  const [taxSerialNumberError, setTaxSerialNumberError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);

  const [isStepTwoBusinessTaxSettingOpen, setIsStepTwoBusinessTaxSettingOpen] =
    useState<boolean>(false);

  // Info: (20250303 - Liz) 取得團隊清單 API
  const { trigger: getTeamListAPI } = APIHandler<IPaginatedData<ITeam[]>>(APIName.LIST_TEAM);

  const toggleTagDropdown = () => {
    setIsTagDropdownOpen((prevState) => !prevState);
    // Info: (20250409 - Liz) 關閉其他下拉選單
    setIsTeamDropdownOpen(false);
    setIsCityDropdownOpen(false);
    setIsDistrictDropdownOpen(false);
  };

  const toggleTeamDropdown = () => {
    setIsTeamDropdownOpen((prevState) => !prevState);
    // Info: (20250409 - Liz) 關閉其他下拉選單
    setIsTagDropdownOpen(false);
    setIsCityDropdownOpen(false);
    setIsDistrictDropdownOpen(false);
  };

  const toggleCityDropdown = () => {
    setIsCityDropdownOpen((prevState) => !prevState);
    // Info: (20250409 - Liz) 關閉其他下拉選單
    setIsTagDropdownOpen(false);
    setIsTeamDropdownOpen(false);
    setIsDistrictDropdownOpen(false);
  };

  const toggleDistrictDropdown = () => {
    setIsDistrictDropdownOpen((prevState) => !prevState);
    // Info: (20250409 - Liz) 關閉其他下拉選單
    setIsTagDropdownOpen(false);
    setIsTeamDropdownOpen(false);
    setIsCityDropdownOpen(false);
  };

  // Info: (20250312 - Liz) 打 API 建立帳本(原為公司)
  // const handleSubmit = async () => {
  //   // Info: (20241114 - Liz) 防止重複點擊
  //   if (isLoading) return;

  //   // Info: (20250213 - Liz) 必填機制
  //   if (!companyName) {
  //     setCompanyNameError(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_THE_NAME'));
  //     return;
  //   }
  //   if (!responsiblePerson) {
  //     setResponsiblePersonError(
  //       t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_RESPONSIBLE_PERSON')
  //     );
  //     return;
  //   }
  //   if (!taxId) {
  //     setTaxIdError(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_TAX_ID'));
  //     return;
  //   }
  //   if (!taxSerialNumber) {
  //     setTaxSerialNumberError(
  //       t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_TAX_SERIAL_NUMBER')
  //     );
  //     return;
  //   }
  //   if (!team) {
  //     setTeamError(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_SELECT_A_TEAM'));
  //     return;
  //   }
  //   if (!tag) {
  //     setTagError(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_SELECT_A_WORK_TAG'));
  //     return;
  //   }

  //   // Info: (20241104 - Liz) 開始 API 請求時設為 loading 狀態
  //   setIsLoading(true);

  //   try {
  //     const { success, code, errorMsg } = await createAccountBook({
  //       name: companyName,
  //       taxId,
  //       tag,
  //       teamId: team.id, // Info: (20250312 - Liz) 選擇團隊
  //     });

  //     if (!success) {
  //       // Info: (20241114 - Liz) 新增帳本失敗時顯示錯誤訊息
  //       toastHandler({
  //         id: 'create-company-failed',
  //         type: ToastType.ERROR,
  //         content: (
  //           <p>
  //             {`${t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CREATE_ACCOUNT_BOOK_FAILED')}!
  //             ${t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ERROR_CODE')}: ${code}
  //             ${t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ERROR_MESSAGE')}: ${errorMsg}`}
  //           </p>
  //         ),
  //         closeable: true,
  //         position: ToastPosition.TOP_CENTER,
  //       });
  //       return;
  //     }

  //     // Info: (20250411 - Liz) 新增帳本成功後清空表單並關閉 modal
  //     setCompanyName('');
  //     setResponsiblePerson('');
  //     setTaxId('');
  //     setTaxSerialNumber('');
  //     setPhoneNumber('');
  //     setTag(null);
  //     setTeam(null);
  //     setCity(null);
  //     setDistrict(null);
  //     setDistrictOptions([]);
  //     setEnteredAddress('');
  //     closeCreateAccountBookModal();

  //     if (getAccountBookList) getAccountBookList(); // Info: (20241209 - Liz) 重新取得帳本清單

  //     if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20241114 - Liz) This is a workaround to refresh the account book list after creating a new account book (if use filterSection)
  //   } catch (error) {
  //     // Deprecated: (20241104 - Liz)
  //     // eslint-disable-next-line no-console
  //     console.log('AccountBookInfoModal handleSubmit error:', error);
  //   } finally {
  //     // Info: (20241104 - Liz) API 回傳後解除 loading 狀態
  //     setIsLoading(false);
  //   }
  // };

  // ToDo: (20250418 - Liz) 驗證必填欄位後才可以進入第二步驟
  const validateRequiredFields = () => {
    let isValid = true;

    if (!companyName) {
      setCompanyNameError(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_THE_NAME'));
      isValid = false;
    } else {
      setCompanyNameError(null);
    }

    if (!responsiblePerson) {
      setResponsiblePersonError(
        t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_RESPONSIBLE_PERSON')
      );
      isValid = false;
    } else {
      setResponsiblePersonError(null);
    }

    if (!taxId) {
      setTaxIdError(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_TAX_ID'));
      isValid = false;
    } else {
      setTaxIdError(null);
    }

    if (!taxSerialNumber) {
      setTaxSerialNumberError(
        t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_TAX_SERIAL_NUMBER')
      );
      isValid = false;
    } else {
      setTaxSerialNumberError(null);
    }

    if (!team) {
      setTeamError(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_SELECT_A_TEAM'));
      isValid = false;
    } else {
      setTeamError(null);
    }

    if (!tag) {
      setTagError(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_SELECT_A_WORK_TAG'));
      isValid = false;
    } else {
      setTagError(null);
    }

    return isValid;
  };

  const goToStepTwoBusinessTaxSetting = () => {
    // Info: (20250418 - Liz) 驗證必填欄位
    const isValid = validateRequiredFields();
    if (!isValid) return;
    // Info: (20250418 - Liz) 驗證通過後進入第二步驟
    setIsStepTwoBusinessTaxSettingOpen(true);
  };

  // Info: (20250303 - Liz) 打 API 取得使用者的團隊清單
  useEffect(() => {
    if (!userAuth) return;
    const getTeamList = async () => {
      try {
        const { success, data } = await getTeamListAPI({
          params: { userId: userAuth.id },
          query: {
            canCreateAccountBookOnly: true,
            page: 1,
            pageSize: 999,
          },
        });

        if (success) {
          setTeamList(data?.data ?? []);
        }
      } catch (error) {
        // Deprecated: (20250303 - Liz)
        // eslint-disable-next-line no-console
        console.log('AccountBookInfoModal getTeamList error:', error);
      }
    };

    getTeamList();
  }, [userAuth]);

  // Info: (20250418 - Liz) 進入第二步驟的商業稅設定
  if (isStepTwoBusinessTaxSettingOpen) {
    return <StepTwoBusinessTaxSetting closeAccountBookInfoModal={closeCreateAccountBookModal} />;
  }

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="overflow-hidden rounded-md bg-surface-neutral-surface-lv1">
        <header className="flex items-center justify-between px-40px pb-24px pt-40px">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CREATE_NEW_ACCOUNT_BOOK')}
          </h1>
          <button type="button" onClick={closeCreateAccountBookModal}>
            <IoCloseOutline size={24} />
          </button>
        </header>

        <div className="flex max-h-65vh flex-col gap-24px overflow-y-auto px-40px pb-40px">
          {/* Info: (20250409 - Liz) Divider - Basic info */}
          <section className="flex items-center gap-16px">
            <div className="flex items-center gap-8px">
              <Image
                src="/icons/asset_management_icon.svg"
                width={16}
                height={16}
                alt="building_icon"
              />
              <span>{t('dashboard:ACCOUNT_BOOK_INFO_MODAL.BASIC_INFO')}</span>
            </div>
            <div className="h-1px flex-auto bg-divider-stroke-lv-1"></div>
          </section>

          <section className="flex items-center gap-24px">
            <div className="flex h-168px w-168px items-center justify-center rounded-sm border border-stroke-neutral-quaternary bg-surface-neutral-mute">
              <Image
                src={'/icons/upload_icon.svg'}
                width={48}
                height={48}
                alt="upload_icon"
              ></Image>
            </div>

            <section className="flex flex-col gap-24px">
              <div className="flex items-start gap-40px">
                {/* Info: (20250409 - Liz) 公司名稱 */}
                <div className="flex w-250px flex-col gap-8px">
                  <h4 className="font-semibold text-input-text-primary">
                    {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.COMPANY_NAME')}
                    <span className="text-text-state-error"> *</span>
                  </h4>
                  <input
                    type="text"
                    placeholder={t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ENTER_NAME')}
                    className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                  {companyNameError && !companyName && (
                    <p className="text-right text-sm font-medium text-text-state-error">
                      {companyNameError}
                    </p>
                  )}
                </div>

                {/* Info: (20250410 - Liz) 負責人 */}
                <div className="flex w-250px flex-col gap-8px">
                  <h4 className="font-semibold text-input-text-primary">
                    {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.RESPONSIBLE_PERSON')}
                    <span className="text-text-state-error"> *</span>
                  </h4>
                  <input
                    type="text"
                    placeholder={t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ENTER_RESPONSIBLE_PERSON')}
                    className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
                    value={responsiblePerson}
                    onChange={(e) => setResponsiblePerson(e.target.value)}
                  />
                  {responsiblePersonError && !responsiblePerson && (
                    <p className="text-right text-sm font-medium text-text-state-error">
                      {responsiblePersonError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-40px">
                {/* Info: (20250409 - Liz) 統一編號 */}
                <div className="flex w-250px flex-col gap-8px">
                  <h4 className="font-semibold text-input-text-primary">
                    {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.TAX_ID')}
                    <span className="text-text-state-error"> *</span>
                  </h4>
                  <input
                    type="number"
                    placeholder={t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ENTER_TAX_ID')}
                    className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                  />
                  {taxIdError && !taxId && (
                    <p className="text-right text-sm font-medium text-text-state-error">
                      {taxIdError}
                    </p>
                  )}
                </div>

                {/* Info: (20250409 - Liz) 稅籍編號 */}
                <div className="flex w-250px flex-col gap-8px">
                  <h4 className="font-semibold text-input-text-primary">
                    {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.TAX_SERIAL_NUMBER')}
                    <span className="text-text-state-error"> *</span>
                  </h4>
                  <input
                    type="number"
                    placeholder={t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ENTER_TAX_SERIAL_NUMBER')}
                    className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
                    value={taxSerialNumber}
                    onChange={(e) => setTaxSerialNumber(e.target.value)}
                  />
                  {taxSerialNumberError && !taxSerialNumber && (
                    <p className="text-right text-sm font-medium text-text-state-error">
                      {taxSerialNumberError}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </section>

          {/* Info: (20250418 - Liz) Divider - Contact info */}
          <section className="flex items-center gap-16px">
            <div className="flex items-center gap-8px">
              <Image src="/icons/phone_icon.svg" width={16} height={16} alt="phone_icon" />
              <span>Contact info</span>
            </div>
            <div className="h-1px flex-auto bg-divider-stroke-lv-1"></div>
          </section>

          <section className="flex items-start gap-14px">
            {/* Info: (20250410 - Liz) 聯絡人 */}
            <div className="flex flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">Contact Person</h4>

              <div className="flex overflow-hidden rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow-Dropshadow_SM">
                <input
                  type="text"
                  placeholder="Enter name"
                  className="bg-transparent px-12px py-10px text-base font-medium outline-none placeholder:text-input-text-input-placeholder"
                  value={isSameAsResponsiblePerson ? responsiblePerson : contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isSameAsResponsiblePerson}
                  onClick={() => setIsSameAsResponsiblePerson((prev) => !prev)}
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
                    Same as responsible person
                  </span>
                </button>
              </div>
            </div>

            {/* Info: (20250410 - Liz) 電話號碼 */}
            <div className="flex flex-auto flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">
                {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PHONE_NUMBER')}
              </h4>
              <input
                type="number"
                placeholder={t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ENTER_PHONE_NUMBER')}
                className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </section>

          <section className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">Business address</h4>

            <main className="flex gap-14px">
              {/* Info: (20250409 - Liz) 縣市 City */}
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
                              setCity(item);
                              setDistrictOptions(cityDistrictMap[item]);
                              setDistrict(null);
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

              {/* Info: (20250409 - Liz) 行政區 District */}
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
                              setDistrict(item);
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

              {/* Info: (20250410 - Liz) 使用者輸入地址(街道巷弄樓層) */}
              <input
                type="text"
                placeholder={t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ENTER_FULL_ADDRESS')}
                className="flex-auto rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
                value={enteredAddress}
                onChange={(e) => setEnteredAddress(e.target.value)}
              />
            </main>
          </section>

          {/* Info: (20250409 - Liz) Divider */}
          <section className="flex items-center gap-16px">
            <div className="flex items-center gap-8px">
              <Image src="/icons/team_icon.svg" alt="team icon" width={16} height={16} />
              <span>{t('dashboard:ACCOUNT_BOOK_INFO_MODAL.TEAM')}</span>
            </div>
            <div className="h-1px flex-auto bg-divider-stroke-lv-1"></div>
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
                  className="flex items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM"
                  onClick={toggleTeamDropdown}
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
                              setTeam(item);
                              toggleTeamDropdown();
                              setTeamError(null);
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
            <div className="flex flex-1 flex-col gap-8px">
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
                            setTag(item);
                            toggleTagDropdown();
                            setTagError(null);
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
            </div>
          </section>

          <section className="flex justify-end gap-12px">
            <button
              type="button"
              onClick={closeCreateAccountBookModal}
              className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
            >
              {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CANCEL')}
            </button>

            {/* Info: (20250418 - Liz) 進入第二步驟的商業稅設定 */}
            <button
              type="button"
              onClick={goToStepTwoBusinessTaxSetting}
              className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            >
              <p>Next</p>
              <FaArrowRightLong size={16} />
            </button>
          </section>
        </div>
      </div>
    </main>
  );
};

export default AccountBookInfoModal;
