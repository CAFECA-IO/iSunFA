import { Dispatch } from 'react';
import { IoCloseOutline, IoChevronDown, IoChevronUp, IoSaveOutline } from 'react-icons/io5';
import { TiArrowBack } from 'react-icons/ti';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import {
  FILING_FREQUENCY_OPTIONS,
  FILING_METHOD_OPTIONS,
  DECLARANT_FILING_METHOD,
  Step2FormState,
  Step2FormAction,
} from '@/constants/account_book';

interface StepTwoBusinessTaxSettingProps {
  closeAccountBookInfoModal: () => void;
  step2FormState: Step2FormState;
  step2FormDispatch: Dispatch<Step2FormAction>;
  handleBack: () => void;
  handleSubmit: () => Promise<void>;
  isLoading: boolean;
}

const StepTwoForm = ({
  closeAccountBookInfoModal,
  step2FormState,
  step2FormDispatch,
  handleBack,
  handleSubmit,
  isLoading,
}: StepTwoBusinessTaxSettingProps) => {
  const { t } = useTranslation(['dashboard']);

  const {
    filingFrequency,
    filingMethod,
    declarantFilingMethod,

    declarantName,
    declarantPersonalId,
    declarantPhoneNumber,

    filingFrequencyError,
    filingMethodError,
    declarantFilingMethodError,

    declarantNameError,
    declarantPersonalIdError,
    declarantPhoneNumberError,

    isFilingFrequencyDropdownOpen,
    isFilingMethodDropdownOpen,
    isDeclarantFilingMethodDropdownOpen,
  } = step2FormState;

  const handleChange =
    (field: keyof Step2FormState) =>
    (
      value:
        | Step2FormState[keyof Step2FormState]
        | ((prev: Step2FormState[keyof Step2FormState]) => Step2FormState[keyof Step2FormState])
    ) => {
      step2FormDispatch({ type: 'UPDATE_FIELD', field, value });
    };

  const toggleFilingFrequencyDropdown = () => {
    handleChange('isFilingFrequencyDropdownOpen')((prev) => !prev);
    // Info: (20250418 - Liz) 關閉其他下拉選單
    handleChange('isFilingMethodDropdownOpen')(false);
    handleChange('isDeclarantFilingMethodDropdownOpen')(false);
  };

  const toggleFilingMethodDropdown = () => {
    handleChange('isFilingMethodDropdownOpen')((prev) => !prev);
    // Info: (20250421 - Liz) 關閉其他下拉選單
    handleChange('isFilingFrequencyDropdownOpen')(false);
    handleChange('isDeclarantFilingMethodDropdownOpen')(false);
  };

  const toggleDeclarantFilingMethodDropdown = () => {
    handleChange('isDeclarantFilingMethodDropdownOpen')((prev) => !prev);
    // Info: (20250418 - Liz) 關閉其他下拉選單
    handleChange('isFilingFrequencyDropdownOpen')(false);
    handleChange('isFilingMethodDropdownOpen')(false);
  };

  // ToDo: (20250418 - Liz) 驗證必填
  const validateRequiredFields = () => {
    if (!filingFrequency) {
      handleChange('filingFrequencyError')(
        t('dashboard:FILING_FREQUENCY.FILING_FREQUENCY_REQUIRED')
      );
      return false;
    }
    if (!filingMethod) {
      handleChange('filingMethodError')(t('dashboard:FILING_METHOD.FILING_METHOD_REQUIRED'));
      return false;
    }
    if (!declarantFilingMethod) {
      handleChange('declarantFilingMethodError')(
        t('dashboard:DECLARANT_FILING_METHOD.DECLARANT_FILING_METHOD_REQUIRED')
      );
      return false;
    }
    if (!declarantName) {
      handleChange('declarantNameError')(
        t('dashboard:STEP_TWO_BUSINESS_TAX_SETTING.DECLARANT_NAME_REQUIRED')
      );
      return false;
    }
    if (!declarantPersonalId) {
      handleChange('declarantPersonalIdError')(
        t('dashboard:STEP_TWO_BUSINESS_TAX_SETTING.DECLARANT_PERSONAL_ID_REQUIRED')
      );
      return false;
    }
    if (!declarantPhoneNumber) {
      handleChange('declarantPhoneNumberError')(
        t('dashboard:STEP_TWO_BUSINESS_TAX_SETTING.PHONE_NUMBER_REQUIRED')
      );
      return false;
    }

    return true;
  };

  // Info: (20250421 - Liz) 打 API 建立帳本(原為公司)
  const onClickSubmit = async () => {
    const success = validateRequiredFields(); // Info: (20250418 - Liz) 驗證必填
    if (!success) return;

    handleSubmit();
  };

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="min-w-800px overflow-hidden rounded-md bg-surface-neutral-surface-lv1">
        <header className="flex items-center justify-between px-40px pb-24px pt-40px">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-10px text-button-text-secondary"
          >
            <TiArrowBack size={24} />
            <span className="text-base font-medium">
              {t('dashboard:STEP_TWO_BUSINESS_TAX_SETTING.BACK')}
            </span>
          </button>
          <h1 className="grow text-center text-xl font-bold leading-8 text-text-neutral-secondary">
            {t('dashboard:STEP_TWO_BUSINESS_TAX_SETTING.BUSINESS_TAX_SETTING')}
          </h1>
          <button type="button" onClick={closeAccountBookInfoModal}>
            <IoCloseOutline size={24} />
          </button>
        </header>

        {/* Info: (20250418 - Liz) Body */}
        <main className="flex max-h-65vh flex-col gap-24px overflow-y-auto px-40px pb-40px">
          {/* Info: (20250418 - Liz) Divider - Declaration Setting */}
          <section className="flex items-center gap-16px">
            <div className="flex items-center gap-8px">
              <Image src="/icons/writing_note.svg" width={16} height={16} alt="writing_note" />
              <span className="text-sm font-medium text-divider-text-lv-1">
                {t('dashboard:STEP_TWO_BUSINESS_TAX_SETTING.DECLARATION_SETTING')}
              </span>
            </div>
            <div className="h-1px flex-auto bg-divider-stroke-lv-1"></div>
          </section>

          {/* Info: (20250418 - Liz) Filing Frequency */}
          <section className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('dashboard:FILING_FREQUENCY.FILING_FREQUENCY')}
              <span className="text-text-state-error"> *</span>
            </h4>

            <div className="relative flex flex-col">
              <button
                type="button"
                className="flex items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM"
                onClick={toggleFilingFrequencyDropdown}
              >
                <p className="px-12px py-10px text-base font-medium">
                  {filingFrequency ? (
                    t(`dashboard:FILING_FREQUENCY.${filingFrequency}`)
                  ) : (
                    <span className="text-text-neutral-secondary">
                      {t('dashboard:FILING_FREQUENCY.SELECT_FILING_FREQUENCY')}
                    </span>
                  )}
                </p>

                <div className="px-12px py-10px">
                  {isFilingFrequencyDropdownOpen ? (
                    <IoChevronUp size={20} />
                  ) : (
                    <IoChevronDown size={20} />
                  )}
                </div>
              </button>

              {filingFrequencyError && !isFilingFrequencyDropdownOpen && (
                <p className="text-right text-sm font-medium text-text-state-error">
                  {filingFrequencyError}
                </p>
              )}

              {isFilingFrequencyDropdownOpen && (
                <div className="absolute inset-x-0 top-full z-10 mt-8px">
                  <div className="mb-20px flex flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                    {FILING_FREQUENCY_OPTIONS.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => {
                          handleChange('filingFrequency')(option.label);
                          toggleFilingFrequencyDropdown();
                          handleChange('filingFrequencyError')(null);
                        }}
                        className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                      >
                        <span>{t(`dashboard:FILING_FREQUENCY.${option.label}`)}</span>
                        <span className="text-text-neutral-secondary">
                          {` (${t(`dashboard:FILING_FREQUENCY.${option.subLabel}`)})`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Info: (20250418 - Liz) Filing Method */}
          <section className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('dashboard:FILING_METHOD.FILING_METHOD')}
              <span className="text-text-state-error"> *</span>
            </h4>

            <div className="relative flex flex-col">
              <button
                type="button"
                className="flex items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM"
                onClick={toggleFilingMethodDropdown}
              >
                <p className="px-12px py-10px text-base font-medium">
                  {filingMethod ? (
                    t(`dashboard:FILING_METHOD.${filingMethod}`)
                  ) : (
                    <span className="text-text-neutral-secondary">
                      {t('dashboard:FILING_METHOD.SELECT_FILING_METHOD')}
                    </span>
                  )}
                </p>

                <div className="px-12px py-10px">
                  {isFilingMethodDropdownOpen ? (
                    <IoChevronUp size={20} />
                  ) : (
                    <IoChevronDown size={20} />
                  )}
                </div>
              </button>

              {filingMethodError && !isFilingMethodDropdownOpen && (
                <p className="text-right text-sm font-medium text-text-state-error">
                  {filingMethodError}
                </p>
              )}

              {isFilingMethodDropdownOpen && (
                <div className="absolute inset-x-0 top-full z-10 mt-8px">
                  <div className="mb-20px flex flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                    {FILING_METHOD_OPTIONS.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => {
                          handleChange('filingMethod')(option.label);
                          toggleFilingMethodDropdown();
                          handleChange('filingMethodError')(null);
                        }}
                        className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                      >
                        <span>{t(`dashboard:FILING_METHOD.${option.label}`)}</span>
                        <span className="text-text-neutral-secondary">
                          {` (${t(`dashboard:FILING_METHOD.${option.subLabel}`)})`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Info: (20250418 - Liz) Divider - Declarant */}
          <section className="flex items-center gap-16px">
            <div className="flex items-center gap-8px">
              <Image src="/icons/user_icon.svg" width={16} height={16} alt="user_icon" />
              <span className="text-sm font-medium text-divider-text-lv-1">
                {t('dashboard:STEP_TWO_BUSINESS_TAX_SETTING.DECLARANT')}
              </span>
            </div>
            <div className="h-1px flex-auto bg-divider-stroke-lv-1"></div>
          </section>

          {/* Info: (20250418 - Liz) (Declarant) Filing Method */}
          <section className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('dashboard:DECLARANT_FILING_METHOD.DECLARANT_FILING_METHOD')}
              <span className="text-text-state-error"> *</span>
            </h4>

            <div className="relative flex flex-col">
              <button
                type="button"
                className="flex items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM"
                onClick={toggleDeclarantFilingMethodDropdown}
              >
                <p className="px-12px py-10px text-base font-medium">
                  {declarantFilingMethod ? (
                    t(`dashboard:DECLARANT_FILING_METHOD.${declarantFilingMethod}`)
                  ) : (
                    <span className="text-text-neutral-secondary">
                      {t('dashboard:DECLARANT_FILING_METHOD.SELECT_DECLARANT_FILING_METHOD')}
                    </span>
                  )}
                </p>

                <div className="px-12px py-10px">
                  {isDeclarantFilingMethodDropdownOpen ? (
                    <IoChevronUp size={20} />
                  ) : (
                    <IoChevronDown size={20} />
                  )}
                </div>
              </button>

              {declarantFilingMethodError && !isDeclarantFilingMethodDropdownOpen && (
                <p className="text-right text-sm font-medium text-text-state-error">
                  {declarantFilingMethodError}
                </p>
              )}

              {isDeclarantFilingMethodDropdownOpen && (
                <div className="absolute inset-x-0 top-full z-10 mt-8px">
                  <div className="mb-20px flex flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                    {Object.values(DECLARANT_FILING_METHOD).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          handleChange('declarantFilingMethod')(option);
                          toggleDeclarantFilingMethodDropdown();
                          handleChange('declarantFilingMethodError')(null);
                        }}
                        className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                      >
                        <span>{t(`dashboard:DECLARANT_FILING_METHOD.${option}`)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Info: (20250418 - Liz) 申報人資料 */}
          <div className="flex items-start gap-40px">
            {/* Info: (20250418 - Liz) 申報人姓名 */}
            <div className="flex w-250px flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">
                {t('dashboard:STEP_TWO_BUSINESS_TAX_SETTING.DECLARANT_NAME')}
                <span className="text-text-state-error"> *</span>
              </h4>
              <input
                type="text"
                placeholder={t('dashboard:STEP_TWO_BUSINESS_TAX_SETTING.ENTER_DECLARANT_NAME')}
                className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
                value={declarantName}
                onChange={(e) => handleChange('declarantName')(e.target.value)}
              />
              {declarantNameError && !declarantName && (
                <p className="text-right text-sm font-medium text-text-state-error">
                  {declarantNameError}
                </p>
              )}
            </div>

            {/* Info: (20250410 - Liz) 負責人身分證字號 */}
            <div className="flex w-250px flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">
                {t('dashboard:STEP_TWO_BUSINESS_TAX_SETTING.DECLARANT_PERSONAL_ID')}
                <span className="text-text-state-error"> *</span>
              </h4>
              <input
                type="number"
                placeholder={t(
                  'dashboard:STEP_TWO_BUSINESS_TAX_SETTING.ENTER_DECLARANT_PERSONAL_ID'
                )}
                className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
                value={declarantPersonalId}
                onChange={(e) => handleChange('declarantPersonalId')(e.target.value)}
              />
              {declarantPersonalIdError && !declarantPersonalId && (
                <p className="text-right text-sm font-medium text-text-state-error">
                  {declarantPersonalIdError}
                </p>
              )}
            </div>

            {/* Info: (20250410 - Liz) 負責人電話號碼 */}
            <div className="flex w-250px flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">
                {t('dashboard:STEP_TWO_BUSINESS_TAX_SETTING.PHONE_NUMBER')}
                <span className="text-text-state-error"> *</span>
              </h4>
              <input
                type="number"
                placeholder={t('dashboard:STEP_TWO_BUSINESS_TAX_SETTING.ENTER_PHONE_NUMBER')}
                className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
                value={declarantPhoneNumber}
                onChange={(e) => handleChange('declarantPhoneNumber')(e.target.value)}
              />
              {declarantPhoneNumberError && !declarantPhoneNumber && (
                <p className="text-right text-sm font-medium text-text-state-error">
                  {declarantPhoneNumberError}
                </p>
              )}
            </div>
          </div>

          <section className="flex justify-end gap-12px">
            <button
              type="button"
              onClick={closeAccountBookInfoModal}
              className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
            >
              {t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CANCEL')}
            </button>

            <button
              type="button"
              onClick={onClickSubmit}
              disabled={isLoading}
              className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            >
              <p>{t('dashboard:COMMON.SAVE')}</p>
              <IoSaveOutline size={16} />
            </button>
          </section>
        </main>
      </div>
    </main>
  );
};

export default StepTwoForm;
