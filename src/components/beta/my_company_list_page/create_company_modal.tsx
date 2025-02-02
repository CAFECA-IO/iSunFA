import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IoCloseOutline, IoChevronDown, IoChevronUp, IoAdd } from 'react-icons/io5';
import { useUserCtx } from '@/contexts/user_context';
import { COMPANY_TAG } from '@/constants/company';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType, ToastPosition } from '@/interfaces/toastify';

interface CreateCompanyModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  setRefreshKey?: React.Dispatch<React.SetStateAction<number>>;
  getCompanyList?: () => void;
}

const CreateCompanyModal = ({
  isModalVisible,
  modalVisibilityHandler,
  setRefreshKey,
  getCompanyList,
}: CreateCompanyModalProps) => {
  const { t } = useTranslation(['dashboard']);
  const { createCompany } = useUserCtx();
  const { toastHandler } = useModalContext();

  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [tag, setTag] = useState<COMPANY_TAG>(COMPANY_TAG.ALL);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen((prevState) => !prevState);
  };

  const handleSubmit = async () => {
    // Info: (20241114 - Liz) 防止重複點擊
    if (isLoading) return;

    // Info: (20241104 - Liz) 開始 API 請求時設為 loading 狀態
    setIsLoading(true);

    try {
      const { success, code, errorMsg } = await createCompany({ name: companyName, taxId, tag });

      if (success) {
        // Info: (20241114 - Liz) 新增公司成功後清空表單並關閉 modal
        setCompanyName('');
        setTaxId('');
        setTag(COMPANY_TAG.ALL);
        modalVisibilityHandler();

        if (getCompanyList) getCompanyList(); // Info: (20241209 - Liz) 重新取得公司列表

        if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20241114 - Liz) This is a workaround to refresh the company list after creating a new company
      } else {
        // Info: (20241114 - Liz) 新增公司失敗時顯示錯誤訊息
        toastHandler({
          id: 'create-company-failed',
          type: ToastType.ERROR,
          content: (
            <p>
              Create company failed. Error code: {code} Error message: {errorMsg}
            </p>
          ),
          closeable: true,
          position: ToastPosition.TOP_CENTER,
        });
      }
    } catch (error) {
      // Deprecated: (20241104 - Liz)
      // eslint-disable-next-line no-console
      console.log('CreateCompanyModal handleSubmit error:', error);
    } finally {
      // Info: (20241104 - Liz) API 回傳後解除 loading 狀態
      setIsLoading(false);
    }
  };

  return isModalVisible ? (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col rounded-lg bg-surface-neutral-surface-lv2">
        <section className="flex items-center justify-between py-16px pl-40px pr-20px">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {t('dashboard:CREATE_COMPANY_MODAL.CREATE_NEW_COMPANY')}
          </h1>
          <button type="button" onClick={modalVisibilityHandler}>
            <IoCloseOutline size={24} />
          </button>
        </section>

        <section className="flex flex-col gap-24px px-40px py-16px">
          <div className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('dashboard:CREATE_COMPANY_MODAL.COMPANY_NAME')}
            </h4>
            <input
              type="text"
              placeholder={t('dashboard:CREATE_COMPANY_MODAL.ENTER_NAME')}
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('dashboard:CREATE_COMPANY_MODAL.TAX_ID')}
            </h4>
            <input
              type="text"
              placeholder={t('dashboard:CREATE_COMPANY_MODAL.ENTER_NUMBER')}
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('dashboard:CREATE_COMPANY_MODAL.WORK_TAG')}
            </h4>

            <div className="relative flex">
              <button
                type="button"
                className="flex flex-auto items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM"
                onClick={toggleDropdown}
              >
                <p className="px-12px py-10px text-base font-medium">
                  {t('dashboard:COMPANY_TAG.' + tag.toUpperCase())}
                </p>

                <div className="px-12px py-10px">
                  {isDropdownOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute inset-0 top-full z-10 flex h-max w-full translate-y-8px flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                  {Object.values(COMPANY_TAG).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setTag(item);
                        toggleDropdown();
                      }}
                      className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                    >
                      {t('dashboard:COMPANY_TAG.' + item.toUpperCase())}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="flex justify-end gap-12px px-20px py-16px">
          <button
            type="button"
            onClick={modalVisibilityHandler}
            className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
          >
            {t('dashboard:CREATE_COMPANY_MODAL.CANCEL')}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            <p>{t('dashboard:CREATE_COMPANY_MODAL.ADD')}</p>
            <IoAdd size={16} />
          </button>
        </section>
      </div>
    </main>
  ) : null;
};

export default CreateCompanyModal;
