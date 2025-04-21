import { Dispatch } from 'react';
import { useTranslation } from 'next-i18next';
import { IoCloseOutline, IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { FaArrowRightLong } from 'react-icons/fa6';
import { cn } from '@/lib/utils/common';
import Image from 'next/image';
import { cityDistrictMap, CityList } from '@/constants/city_district';
import { WORK_TAG } from '@/interfaces/account_book';
import { Step1FormAction, Step1FormState } from '@/constants/account_book';
import { ITeam } from '@/interfaces/team';

interface StepOneFormProps {
  teamList: ITeam[];
  handleNext: () => void;
  closeCreateAccountBookModal: () => void;
  step1FormState: Step1FormState;
  step1FormDispatch: Dispatch<Step1FormAction>;
}
const StepOneForm = ({
  teamList,
  handleNext,
  closeCreateAccountBookModal,
  step1FormState,
  step1FormDispatch,
}: StepOneFormProps) => {
  const { t } = useTranslation(['dashboard', 'city_district']);

  const {
    companyName,
    responsiblePerson,
    taxId,
    taxSerialNumber,
    contactPerson,
    isSameAsResponsiblePerson,
    phoneNumber,
    tag,
    team,
    city,
    district,
    districtOptions,
    enteredAddress,
    isTagDropdownOpen,
    isTeamDropdownOpen,
    isCityDropdownOpen,
    isDistrictDropdownOpen,
    companyNameError,
    responsiblePersonError,
    taxIdError,
    taxSerialNumberError,
    teamError,
    tagError,
  } = step1FormState;

  const handleChange =
    (field: keyof Step1FormState) =>
    (
      value:
        | Step1FormState[keyof Step1FormState]
        | ((prev: Step1FormState[keyof Step1FormState]) => Step1FormState[keyof Step1FormState])
    ) => {
      step1FormDispatch({ type: 'UPDATE_FIELD', field, value });
    };

  const toggleTagDropdown = () => {
    handleChange('isTagDropdownOpen')((prev) => !prev);
    // Info: (20250409 - Liz) 關閉其他下拉選單
    if (isTeamDropdownOpen) handleChange('isTeamDropdownOpen')(false);
    if (isCityDropdownOpen) handleChange('isCityDropdownOpen')(false);
    if (isDistrictDropdownOpen) handleChange('isDistrictDropdownOpen')(false);
  };

  const toggleTeamDropdown = () => {
    handleChange('isTeamDropdownOpen')((prev) => !prev);
    // Info: (20250409 - Liz) 關閉其他下拉選單
    handleChange('isTagDropdownOpen')(false);
    handleChange('isCityDropdownOpen')(false);
    handleChange('isDistrictDropdownOpen')(false);
  };

  const toggleCityDropdown = () => {
    handleChange('isCityDropdownOpen')((prev) => !prev);
    // Info: (20250409 - Liz) 關閉其他下拉選單
    handleChange('isTagDropdownOpen')(false);
    handleChange('isTeamDropdownOpen')(false);
    handleChange('isDistrictDropdownOpen')(false);
  };

  const toggleDistrictDropdown = () => {
    handleChange('isDistrictDropdownOpen')((prev) => !prev);
    // Info: (20250409 - Liz) 關閉其他下拉選單
    handleChange('isTagDropdownOpen')(false);
    handleChange('isTeamDropdownOpen')(false);
    handleChange('isCityDropdownOpen')(false);
  };

  // ToDo: (20250418 - Liz) 驗證必填欄位後才可以進入第二步驟
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

    if (!responsiblePerson) {
      handleChange('responsiblePersonError')(
        t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_RESPONSIBLE_PERSON')
      );
      isValid = false;
    } else {
      handleChange('responsiblePersonError')(null);
    }

    if (!taxId) {
      handleChange('taxIdError')(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_TAX_ID'));
      isValid = false;
    } else {
      handleChange('taxIdError')(null);
    }

    if (!taxSerialNumber) {
      handleChange('taxSerialNumberError')(
        t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_ENTER_TAX_SERIAL_NUMBER')
      );
      isValid = false;
    } else {
      handleChange('taxSerialNumberError')(null);
    }

    if (!team) {
      handleChange('teamError')(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_SELECT_A_TEAM'));
      isValid = false;
    } else {
      handleChange('teamError')(null);
    }

    if (!tag) {
      handleChange('tagError')(t('dashboard:ACCOUNT_BOOK_INFO_MODAL.PLEASE_SELECT_A_WORK_TAG'));
      isValid = false;
    } else {
      handleChange('tagError')(null);
    }

    return isValid;
  };

  const onClickNext = () => {
    const isValid = validateRequiredFields();
    if (!isValid) return;
    // Info: (20250418 - Liz) 驗證通過後進入第二步驟
    handleNext();
  };

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
                    onChange={(e) => handleChange('companyName')(e.target.value)}
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
                    onChange={(e) => handleChange('responsiblePerson')(e.target.value)}
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
                    onChange={(e) => handleChange('taxId')(e.target.value)}
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
                    onChange={(e) => handleChange('taxSerialNumber')(e.target.value)}
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
              <span>{t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CONTACT_INFO')}</span>
            </div>
            <div className="h-1px flex-auto bg-divider-stroke-lv-1"></div>
          </section>

          <section className="flex items-start gap-14px">
            {/* Info: (20250410 - Liz) 聯絡人 */}
            <div className="flex flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">
                {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CONTACT_PERSON')}
              </h4>

              <div className="flex flex-auto overflow-hidden rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow-Dropshadow_SM">
                <input
                  type="text"
                  placeholder={t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ENTER_CONTACT_PERSON')}
                  className="min-w-0 flex-auto bg-transparent px-12px py-10px text-base font-medium outline-none placeholder:text-input-text-input-placeholder"
                  value={isSameAsResponsiblePerson ? responsiblePerson : contactPerson}
                  onChange={(e) => handleChange('contactPerson')(e.target.value)}
                />
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isSameAsResponsiblePerson}
                  //   onClick={() => setIsSameAsResponsiblePerson((prev) => !prev)}
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
                onChange={(e) => handleChange('phoneNumber')(e.target.value)}
              />
            </div>
          </section>

          <section className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.BUSINESS_ADDRESS')}
            </h4>

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

              {/* Info: (20250410 - Liz) 使用者輸入地址(街道巷弄樓層) */}
              <input
                type="text"
                placeholder={t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ENTER_FULL_ADDRESS')}
                className="flex-auto rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
                value={enteredAddress}
                onChange={(e) => handleChange('enteredAddress')(e.target.value)}
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
              onClick={onClickNext}
              className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            >
              <span>{t('dashboard:ACCOUNT_BOOK_INFO_MODAL.NEXT')}</span>
              <FaArrowRightLong size={16} />
            </button>
          </section>
        </div>
      </div>
    </main>
  );
};

export default StepOneForm;
