import { Dispatch, SetStateAction, useState } from 'react';
import Image from 'next/image';
import { ICompanyAndRole } from '@/interfaces/company';
import { IoArrowForward, IoClose } from 'react-icons/io5';
import { FaRegCircleCheck } from 'react-icons/fa6';
import { FiEdit2, FiTag, FiTrash2 } from 'react-icons/fi';
import CompanyTag from '@/components/beta/account_books_page/company_tag';
import { CANCEL_COMPANY_ID } from '@/constants/company';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import useOuterClick from '@/lib/hooks/use_outer_click';

interface ICompanyItemProps {
  myCompany: ICompanyAndRole;
  setCompanyToEdit: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
  setCompanyToDelete: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
  setCompanyToUploadAvatar: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
}

const CompanyItem = ({
  myCompany,
  setCompanyToEdit,
  setCompanyToDelete,
  setCompanyToUploadAvatar,
}: ICompanyItemProps) => {
  const { t } = useTranslation(['company']);
  const { selectCompany, selectedCompany } = useUserCtx();
  const [isLoading, setIsLoading] = useState(false);

  const isCompanySelected = myCompany.company.id === selectedCompany?.id;
  const {
    targetRef: optionsDropdownRef,
    componentVisible: isOptionsDropdownOpen,
    setComponentVisible: setIsOptionsDropdownOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleOptionsDropdown = () => {
    setIsOptionsDropdownOpen((prev) => !prev);
  };

  const closeOptionsDropdown = () => {
    setIsOptionsDropdownOpen(false);
  };

  const openChangeTagModal = () => {
    setCompanyToEdit(myCompany);
    closeOptionsDropdown();
  };

  const openDeleteCompanyModal = () => {
    setCompanyToDelete(myCompany);
    closeOptionsDropdown();
  };

  const openUploadCompanyAvatarModal = () => {
    setCompanyToUploadAvatar(myCompany);
    closeOptionsDropdown();
  };

  // Info: (20241113 - Liz) 打 API 選擇公司
  const handleConnect = async () => {
    if (isLoading) return;

    setIsLoading(true);

    const companyId = isCompanySelected ? CANCEL_COMPANY_ID : myCompany.company.id;

    try {
      const data = selectCompany(companyId);

      if (data) {
        // Deprecated: (20241113 - Liz)
        // eslint-disable-next-line no-console
        console.log('selectCompany success:', data);
      } else {
        // Deprecated: (20241113 - Liz)
        // eslint-disable-next-line no-console
        console.log('selectCompany failed!');
      }
    } catch (error) {
      // Deprecated: (20241113 - Liz)
      // eslint-disable-next-line no-console
      console.log('CompanyList handleConnect error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      key={myCompany.company.id}
      className="flex items-center gap-120px rounded-xxs bg-surface-neutral-surface-lv2 px-24px py-8px shadow-Dropshadow_XS"
    >
      <button type="button" onClick={openUploadCompanyAvatarModal} className="group relative">
        <Image
          src={myCompany.company.imageId}
          alt={myCompany.company.name}
          width={60}
          height={60}
          className="h-60px w-60px rounded-sm border-2 border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 object-contain"
        ></Image>

        <div className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-sm border border-stroke-neutral-quaternary text-sm text-black opacity-0 backdrop-blur-sm group-hover:opacity-100">
          <FiEdit2 size={24} />
        </div>
      </button>

      <div className="flex flex-auto items-center gap-8px">
        <p className="max-w-170px truncate text-base font-medium text-text-neutral-solid-dark">
          {myCompany.company.name}
        </p>

        <div className="relative flex items-center" ref={optionsDropdownRef}>
          <button type="button" onClick={toggleOptionsDropdown}>
            <Image
              src="/icons/square_mouse_pointer.svg"
              width={16}
              height={16}
              alt="square_mouse_pointer"
            />
          </button>

          {isOptionsDropdownOpen && (
            <div className="absolute left-0 top-full z-10 flex h-max w-max translate-y-8px flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_XS">
              <button
                type="button"
                onClick={openChangeTagModal}
                className="flex items-center gap-12px rounded-xs px-12px py-8px text-sm font-medium text-dropdown-text-primary hover:bg-dropdown-surface-item-hover"
              >
                <FiTag size={16} className="text-icon-surface-single-color-primary" />
                <p>{t('company:ACCOUNT_BOOKS_PAGE_BODY.CHANGE_WORK_TAG')}</p>
              </button>

              <button
                type="button"
                className="flex items-center gap-12px rounded-xs px-12px py-8px text-sm font-medium text-dropdown-text-primary hover:bg-dropdown-surface-item-hover"
                onClick={openDeleteCompanyModal}
              >
                <FiTrash2 size={16} className="text-icon-surface-single-color-primary" />
                <p>{t('company:ACCOUNT_BOOKS_PAGE_BODY.DELETE')}</p>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex w-90px justify-center">
        <CompanyTag tag={myCompany.tag} />
      </div>

      <div className="flex w-120px items-center justify-end">
        <button
          type="button"
          className="group relative text-button-text-secondary"
          onClick={handleConnect}
          disabled={isLoading}
        >
          {isCompanySelected ? (
            <div className="flex items-center gap-4px rounded-xs border border-surface-state-success bg-surface-state-success px-16px py-8px group-hover:opacity-0">
              <p className="text-sm font-medium">{t('company:ACCOUNT_BOOKS_PAGE_BODY.LINKED')}</p>
              <FaRegCircleCheck size={16} />
            </div>
          ) : (
            <div className="flex items-center gap-4px rounded-xs border border-button-stroke-secondary px-16px py-8px hover:bg-button-surface-soft-secondary-hover">
              <p className="text-sm font-medium">{t('company:ACCOUNT_BOOKS_PAGE_BODY.CONNECT')}</p>
              <IoArrowForward size={16} />
            </div>
          )}

          {isCompanySelected && (
            <div className="absolute inset-0 flex items-center justify-center gap-4px rounded-xs border border-surface-state-success-soft bg-surface-state-success-soft px-16px py-8px text-sm opacity-0 group-hover:opacity-100">
              <p className="text-sm font-medium">{t('company:ACCOUNT_BOOKS_PAGE_BODY.CANCEL')}</p>
              <IoClose size={16} />
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default CompanyItem;
