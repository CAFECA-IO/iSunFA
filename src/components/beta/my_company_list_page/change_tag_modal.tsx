import React, { useState } from 'react';
import { IoCloseOutline, IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { ICompany } from '@/interfaces/company';
import { COMPANY_TAG } from '@/constants/company';

interface ChangeTagModalProps {
  companyToEdit: ICompany | null;
  isModalOpen: boolean;
  toggleModal: () => void;
  setIsCallingAPI?: React.Dispatch<React.SetStateAction<boolean>>;
}

const ChangeTagModal = ({
  companyToEdit,
  isModalOpen,
  toggleModal,
  setIsCallingAPI,
}: ChangeTagModalProps) => {
  const { t } = useTranslation(['company']);
  const { updateCompany } = useUserCtx();

  const [tag, setTag] = useState<COMPANY_TAG>(COMPANY_TAG.ALL);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen((prevState) => !prevState);
  };

  // Info: (20241113 - Liz) 打 API 變更公司的 tag
  const handleChangeTag = async () => {
    if (!companyToEdit) return;

    setIsLoading(true); // 開始 API 請求時設為 loading 狀態

    if (setIsCallingAPI) {
      setIsCallingAPI((prevState) => !prevState);
    }

    try {
      const data = await updateCompany({
        companyId: companyToEdit.id,
        action: 'updateTag',
        tag,
      });

      if (data) {
        // Info: (20241113 - Liz) 更新成功後清空表單並關閉 modal
        setTag(COMPANY_TAG.ALL);
        toggleModal();

        // Deprecated: (20241113 - Liz)
        // eslint-disable-next-line no-console
        console.log('打 API 變更標籤成功, api return data:', data);
      } else {
        // Deprecated: (20241113 - Liz)
        // eslint-disable-next-line no-console
        console.log('變更公司標籤失敗');
      }
    } catch (error) {
      // Deprecated: (20241113 - Liz)
      // eslint-disable-next-line no-console
      console.log('ChangeTagModal handleChangeTag error:', error);
    } finally {
      setIsLoading(false); // API 回傳後解除 loading 狀態
      if (setIsCallingAPI) {
        setIsCallingAPI((prevState) => !prevState);
      }
    }
  };

  return isModalOpen ? (
    <main className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col rounded-lg bg-surface-neutral-surface-lv2">
        <section className="flex items-center justify-between py-16px pl-40px pr-20px">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {t('company:PAGE_BODY.CHANGE_WORK_TAG')}
          </h1>
          <button type="button" onClick={toggleModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>

        <section className="flex flex-col gap-24px px-40px py-16px">
          {/* Company Name */}
          <div className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('company:INFO.COMPANY_NAME')}
            </h4>
            <input
              disabled
              type="text"
              placeholder="Enter number"
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
              value={companyToEdit?.name}
            />
          </div>

          {/* Work Tag / Company Tag */}
          <div className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">{t('company:INFO.WORK_TAG')}</h4>

            <div className="relative flex">
              <button
                type="button"
                className="flex flex-auto items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM"
                onClick={toggleDropdown}
              >
                <p className="px-12px py-10px text-base font-medium">
                  {t(`company:TAG.${tag.toUpperCase()}`)}
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
                      {t(`company:TAG.${item.toUpperCase()}`)}
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
            onClick={toggleModal}
            className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
          >
            {t('company:PAGE_BODY.CANCEL')}
          </button>

          <button
            type="button"
            onClick={handleChangeTag}
            disabled={isLoading}
            className="rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            {t('company:PAGE_BODY.SAVE')}
          </button>
        </section>
      </div>
    </main>
  ) : null;
};

export default ChangeTagModal;
