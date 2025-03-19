import { Dispatch, SetStateAction, useState } from 'react';
import Image from 'next/image';
import { IAccountBookForUserWithTeam, CANCEL_ACCOUNT_BOOK_ID } from '@/interfaces/account_book';
import { IoArrowForward, IoClose } from 'react-icons/io5';
import { FaRegCircleCheck } from 'react-icons/fa6';
import { FiEdit2, FiTag, FiTrash2, FiUnlock } from 'react-icons/fi';
import { PiShareFatBold } from 'react-icons/pi';
import CompanyTag from '@/components/beta/account_books_page/company_tag';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import useOuterClick from '@/lib/hooks/use_outer_click';

interface AccountBookItemProps {
  accountBook: IAccountBookForUserWithTeam;
  setAccountBookToTransfer: Dispatch<SetStateAction<IAccountBookForUserWithTeam | undefined>>;
  setAccountBookToEdit: Dispatch<SetStateAction<IAccountBookForUserWithTeam | undefined>>;
  setAccountBookToDelete: Dispatch<SetStateAction<IAccountBookForUserWithTeam | undefined>>;
  setAccountBookToUploadPicture: Dispatch<SetStateAction<IAccountBookForUserWithTeam | undefined>>;
  setAccountBookToChangePrivacy: Dispatch<SetStateAction<IAccountBookForUserWithTeam | undefined>>;
}

const AccountBookItem = ({
  accountBook,
  setAccountBookToTransfer,
  setAccountBookToEdit,
  setAccountBookToDelete,
  setAccountBookToUploadPicture,
  setAccountBookToChangePrivacy,
}: AccountBookItemProps) => {
  const { t } = useTranslation(['account_book']);
  const { connectAccountBook, connectedAccountBook } = useUserCtx();
  const [isLoading, setIsLoading] = useState(false);
  const isAccountBookConnected = accountBook.company.id === connectedAccountBook?.id;

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

  const openAccountBookTransferModal = () => {
    setAccountBookToTransfer(accountBook);
    closeOptionsDropdown();
  };

  const openAccountBookPrivacyModal = () => {
    setAccountBookToChangePrivacy(accountBook);
    closeOptionsDropdown();
  };

  const openChangeTagModal = () => {
    setAccountBookToEdit(accountBook);
    closeOptionsDropdown();
  };

  const openDeleteCompanyModal = () => {
    setAccountBookToDelete(accountBook);
    closeOptionsDropdown();
  };

  const openUploadCompanyPictureModal = () => {
    setAccountBookToUploadPicture(accountBook);
    closeOptionsDropdown();
  };

  // Info: (20241113 - Liz) 打 API 連結帳本 (原為公司)
  const handleConnect = async () => {
    if (isLoading) return;

    setIsLoading(true);

    const accountBookId = isAccountBookConnected ? CANCEL_ACCOUNT_BOOK_ID : accountBook.company.id;

    try {
      const { success } = await connectAccountBook(accountBookId);

      // Deprecated: (20241113 - Liz)
      // eslint-disable-next-line no-console
      if (!success) console.log('connectAccountBook failed!');
    } catch (error) {
      // Deprecated: (20241113 - Liz)
      // eslint-disable-next-line no-console
      console.log('connectAccountBook error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ToDo: (20250303 - Liz) 打 API 取消轉移帳本
  const cancelTransfer = () => {
    // call api to cancel transfer account book to another team
  };

  return (
    <div
      key={accountBook.company.id}
      className="flex items-center gap-120px rounded-sm border-2 border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 px-24px py-12px"
    >
      <button type="button" onClick={openUploadCompanyPictureModal} className="group relative">
        <Image
          src={accountBook.company.imageId}
          alt={accountBook.company.name}
          width={60}
          height={60}
          className="h-60px w-60px rounded-sm border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 object-contain"
        ></Image>

        <div className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-sm border border-stroke-neutral-quaternary text-sm text-black opacity-0 backdrop-blur-sm group-hover:opacity-100">
          <FiEdit2 size={24} />
        </div>
      </button>

      <div className="flex flex-auto items-center justify-between gap-8px">
        <Image
          src="/icons/lock.svg"
          alt="lock"
          width={16}
          height={16}
          className={accountBook.company.isPrivate ? 'visible' : 'invisible'}
        ></Image>

        <p className="max-w-170px truncate text-base font-medium text-text-neutral-solid-dark">
          {accountBook.company.name}
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
              {/* Info: (20250213 - Liz) Account Book Transfer */}
              <button
                type="button"
                onClick={openAccountBookTransferModal}
                className="flex items-center gap-12px rounded-xs px-12px py-8px text-sm font-medium text-dropdown-text-primary hover:bg-dropdown-surface-item-hover"
              >
                <PiShareFatBold size={16} className="text-icon-surface-single-color-primary" />
                <span>{t('account_book:ACCOUNT_BOOK_TRANSFER_MODAL.ACCOUNT_BOOK_TRANSFER')}</span>
              </button>

              {/* Info: (20250227 - Liz) Account Book Privacy */}
              <button
                type="button"
                onClick={openAccountBookPrivacyModal}
                className="flex items-center gap-12px rounded-xs px-12px py-8px text-sm font-medium text-dropdown-text-primary hover:bg-dropdown-surface-item-hover"
              >
                <FiUnlock size={16} className="text-icon-surface-single-color-primary" />
                <span>
                  {t('account_book:ACCOUNT_BOOK_PRIVACY_MODAL.CHANGE_ACCOUNT_BOOK_PRIVACY')}
                </span>
              </button>

              {/* Info: (20250213 - Liz) Change Tag */}
              <button
                type="button"
                onClick={openChangeTagModal}
                className="flex items-center gap-12px rounded-xs px-12px py-8px text-sm font-medium text-dropdown-text-primary hover:bg-dropdown-surface-item-hover"
              >
                <FiTag size={16} className="text-icon-surface-single-color-primary" />
                <span>{t('account_book:ACCOUNT_BOOKS_PAGE_BODY.CHANGE_WORK_TAG')}</span>
              </button>

              {/* Info: (20250213 - Liz) Delete */}
              <button
                type="button"
                className="flex items-center gap-12px rounded-xs px-12px py-8px text-sm font-medium text-dropdown-text-primary hover:bg-dropdown-surface-item-hover"
                onClick={openDeleteCompanyModal}
              >
                <FiTrash2 size={16} className="text-icon-surface-single-color-primary" />
                <span>{t('account_book:ACCOUNT_BOOKS_PAGE_BODY.DELETE')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex w-90px justify-center">
        <CompanyTag tag={accountBook.tag} />
      </div>

      {accountBook.isTransferring && (
        <div className="flex w-120px items-center justify-end gap-16px">
          <p className="text-nowrap text-sm font-medium">
            {t('account_book:ACCOUNT_BOOKS_PAGE_BODY.WAITING_FOR_TRANSFERRING')}...
          </p>
          <button
            type="button"
            className="text-nowrap text-sm font-semibold text-link-text-primary"
            onClick={cancelTransfer}
          >
            {t('account_book:ACCOUNT_BOOKS_PAGE_BODY.CANCEL')}
          </button>
        </div>
      )}

      {/* Info: (20250303 - Liz) Connect Button */}
      {!accountBook.isTransferring && (
        <div className="flex w-120px items-center justify-end">
          <button
            type="button"
            className="group relative text-button-text-secondary"
            onClick={handleConnect}
            disabled={isLoading}
          >
            {isAccountBookConnected ? (
              <div className="flex items-center gap-4px rounded-xs border border-surface-state-success bg-surface-state-success px-16px py-8px group-hover:opacity-0">
                <p className="text-sm font-medium">
                  {t('account_book:ACCOUNT_BOOKS_PAGE_BODY.LINKED')}
                </p>
                <FaRegCircleCheck size={16} />
              </div>
            ) : (
              <div className="flex items-center gap-4px rounded-xs border border-button-stroke-secondary px-16px py-8px hover:bg-button-surface-soft-secondary-hover">
                <p className="text-sm font-medium">
                  {t('account_book:ACCOUNT_BOOKS_PAGE_BODY.CONNECT')}
                </p>
                <IoArrowForward size={16} />
              </div>
            )}

            {isAccountBookConnected && (
              <div className="absolute inset-0 flex items-center justify-center gap-4px rounded-xs border border-surface-state-success-soft bg-surface-state-success-soft px-16px py-8px text-sm opacity-0 group-hover:opacity-100">
                <p className="text-sm font-medium">
                  {t('account_book:ACCOUNT_BOOKS_PAGE_BODY.CANCEL')}
                </p>
                <IoClose size={16} />
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountBookItem;
