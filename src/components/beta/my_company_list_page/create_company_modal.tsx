import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IoCloseOutline, IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { useUserCtx } from '@/contexts/user_context';
import { CompanyTag } from '@/constants/company';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType, ToastPosition } from '@/interfaces/toastify';

interface CreateCompanyModalProps {
  isModalOpen: boolean;
  toggleModal: () => void;
}

const CreateCompanyModal = ({ isModalOpen, toggleModal }: CreateCompanyModalProps) => {
  const { t } = useTranslation(['company', 'common']);
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [tag, setTag] = useState<CompanyTag>(CompanyTag.ALL);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { createCompany } = useUserCtx();
  const { toastHandler } = useModalContext();

  const toggleDropdown = () => {
    setIsDropdownOpen((prevState) => !prevState);
  };

  const handleSubmit = async () => {
    setIsLoading(true); // 開始 API 請求時設為 loading 狀態

    try {
      const { success, code } = await createCompany({ name: companyName, taxId, tag });

      if (success) {
        toggleModal();
      } else {
        toastHandler({
          id: 'create-company-failed',
          type: ToastType.ERROR,
          content: <p>Create company failed. Error code: {code}</p>,
          closeable: true,
          position: ToastPosition.TOP_CENTER,
        });
      }
    } catch (error) {
      // Deprecated: (20241104 - Liz)
      // eslint-disable-next-line no-console
      console.log('CreateCompanyModal handleSubmit error:', error);
    } finally {
      setIsLoading(false); // API 回傳後解除 loading 狀態
    }
  };

  return isModalOpen ? (
    <main className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col rounded-lg bg-surface-neutral-surface-lv2">
        <section className="flex items-center justify-between py-16px pl-40px pr-20px">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {t('company:INFO.CREATE')}
          </h1>
          <button type="button" onClick={toggleModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>

        <section className="flex flex-col gap-24px px-40px py-16px">
          <div className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">{t('company:INFO.NAME')}</h4>
            <input
              type="text"
              placeholder={t('common:PLACEHOLDER.ENTER_NAME')}
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">{t('company:INFO.TAX_ID')}</h4>
            <input
              type="text"
              placeholder={t('common:PLACEHOLDER.ENTER_NUMBER')}
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">{t('company:INFO.WORK_TAG')}</h4>

            <div className="relative flex">
              <button
                type="button"
                className="flex flex-auto items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM"
                onClick={toggleDropdown}
              >
                <p className="px-12px py-10px text-base font-medium">
                  {t('company:TAG.' + tag.toUpperCase())}
                </p>

                <div className="px-12px py-10px">
                  {isDropdownOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute inset-0 top-full z-10 flex h-max w-full translate-y-8px flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                  {Object.values(CompanyTag).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setTag(item);
                        toggleDropdown();
                      }}
                      className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                    >
                      {t('company:TAG.' + item.toUpperCase())}
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
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            Submit
          </button>
        </section>
      </div>
    </main>
  ) : null;
};

export default CreateCompanyModal;
