import { Dispatch, SetStateAction, useRef, useState } from 'react';
import Image from 'next/image';
import { IAccountBookWithTeam, CANCEL_ACCOUNT_BOOK_ID } from '@/interfaces/account_book';
import { FiTag, FiTrash2, FiMoreVertical } from 'react-icons/fi';
import { TbBuilding } from 'react-icons/tb';
import { PiShareFatBold } from 'react-icons/pi';
import CompanyTag from '@/components/beta/account_books_page/company_tag';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import useClickOutside from '@/lib/hooks/use_click_outside';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ITransferAccountBook } from '@/interfaces/team';
import { cn } from '@/lib/utils/common';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import loggerFront from '@/lib/utils/logger_front';

interface AccountBookItemProps {
  accountBook: IAccountBookWithTeam;
  setAccountBookToEdit: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setAccountBookToTransfer: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setAccountBookToChangeTag: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setAccountBookToDelete: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setRefreshKey?: React.Dispatch<React.SetStateAction<number>>;
  openDropdownId: string | null; // Info: (20250407 - Liz) 用來控制 OptionsDropdown 的開關 id
  setOpenDropdownId: Dispatch<SetStateAction<string | null>>;
}

const AccountBookItem = ({
  accountBook,
  setAccountBookToEdit,
  setAccountBookToTransfer,
  setAccountBookToChangeTag,
  setAccountBookToDelete,
  setRefreshKey,
  openDropdownId,
  setOpenDropdownId,
}: AccountBookItemProps) => {
  const { t } = useTranslation(['account_book']);
  const { connectAccountBook, connectedAccountBook, disconnectAccountBook } = useUserCtx();
  const { toastHandler } = useModalContext();
  const [isLoading, setIsLoading] = useState(false);
  const isAccountBookConnected = accountBook.id === connectedAccountBook?.id;
  const teamRole = accountBook.team.role;

  const optionsDropdownRef = useRef<HTMLDivElement>(null);
  const thisDropdownId = `${accountBook.id}`; // Info: (20250527 - Liz) 用帳本 ID 作為 OptionsDropdown 的 id，以便區分不同帳本的選單
  const isOptionsDropdownOpen = openDropdownId === thisDropdownId; // Info: (20250527 - Liz) 用來判斷 OptionsDropdown 是否開啟

  // Info: (20250527 - Liz) 使用外部點擊來關閉 OptionsDropdown (只有在開啟時綁定)
  useClickOutside(optionsDropdownRef, () => {
    if (isOptionsDropdownOpen) {
      setOpenDropdownId(null);
    }
  });

  // Info: (20250326 - Liz) 取消轉移帳本 API
  const { trigger: cancelTransferAPI } = APIHandler<ITransferAccountBook>(
    APIName.CANCEL_TRANSFER_ACCOUNT_BOOK
  );

  // Info: (20250527 - Liz) 判斷使用者是否有權限進行各種操作
  const deletePermission = convertTeamRoleCanDo({
    teamRole,
    canDo: TeamPermissionAction.DELETE_ACCOUNT_BOOK,
  });

  const editTagPermission = convertTeamRoleCanDo({
    teamRole,
    canDo: TeamPermissionAction.MODIFY_TAG,
  });

  const requestTransferPermission = convertTeamRoleCanDo({
    teamRole,
    canDo: TeamPermissionAction.REQUEST_ACCOUNT_BOOK_TRANSFER,
  });

  const cancelTransferPermission = convertTeamRoleCanDo({
    teamRole,
    canDo: TeamPermissionAction.CANCEL_ACCOUNT_BOOK_TRANSFER,
  });

  const editPermission = convertTeamRoleCanDo({
    teamRole,
    canDo: TeamPermissionAction.MODIFY_ACCOUNT_BOOK,
  });

  // Info: (20250527 - Liz) 判斷是否有權限顯示 OptionsDropdown
  const hasPermission =
    deletePermission.can ||
    editTagPermission.can ||
    requestTransferPermission.can ||
    editPermission.can;

  const toggleOptionsDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Info: (20250407 - Liz) 避免點擊選單時觸發父元素的點擊事件
    setOpenDropdownId(isOptionsDropdownOpen ? null : thisDropdownId); // Info: (20250527 - Liz) 切換 OptionsDropdown 的開關狀態
  };
  const closeOptionsDropdown = () => setOpenDropdownId(null);

  // Info: (20250428 - Liz) 開啟編輯帳本 modal
  const openEditAccountBookModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Info: (20250407 - Liz) 避免點擊選單時觸發父元素的點擊事件
    setAccountBookToEdit(accountBook);
    closeOptionsDropdown();
  };

  const openAccountBookTransferModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Info: (20250407 - Liz) 避免點擊選單時觸發父元素的點擊事件
    setAccountBookToTransfer(accountBook);
    closeOptionsDropdown();
  };

  const openChangeTagModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Info: (20250407 - Liz) 避免點擊選單時觸發父元素的點擊事件
    setAccountBookToChangeTag(accountBook);
    closeOptionsDropdown();
  };

  const openDeleteCompanyModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Info: (20250407 - Liz) 避免點擊選單時觸發父元素的點擊事件
    setAccountBookToDelete(accountBook);
    closeOptionsDropdown();
  };

  // Info: (20250422 - Liz) 打 API 取消連結帳本
  const handleDisconnect = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { success } = await disconnectAccountBook(accountBook.id);

      if (!success) {
        // Info: (20250625 - Julian) 取消連結失敗的 toast
        toastHandler({
          id: ToastId.DISCONNECT_ACCOUNT_BOOK_FAILED,
          type: ToastType.ERROR,
          content: t('account_book:TOAST.FAILED_DISCONNECT_ACCOUNT_BOOK'),
          closeable: true,
        });
      }
    } catch (error) {
      loggerFront.error('disconnectAccountBook error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Info: (20241113 - Liz) 打 API 連結帳本 (原為公司)
  const handleConnect = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const accountBookId = isAccountBookConnected ? CANCEL_ACCOUNT_BOOK_ID : accountBook.id;
    try {
      // Info: (20250422 - Liz) 如果選擇的帳本已經是連結的帳本，則取消連結
      if (accountBook.id === connectedAccountBook?.id) {
        await handleDisconnect();
        return;
      }

      const { success } = await connectAccountBook(accountBookId);

      if (!success) {
        // Info: (20250625 - Julian) 連結失敗的 toast
        toastHandler({
          id: ToastId.CONNECT_ACCOUNT_BOOK_FAILED,
          type: ToastType.ERROR,
          content: t('account_book:TOAST.FAILED_CONNECT_ACCOUNT_BOOK'),
          closeable: true,
        });
      }
    } catch (error) {
      loggerFront.error('connectAccountBook error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Info: (20250326 - Liz) 打 API 取消轉移帳本
  const cancelTransfer = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { success } = await cancelTransferAPI({
        params: { accountBookId: accountBook.id },
      });

      if (!success) {
        // Info: (20250625 - Julian) 取消轉移失敗的 toast
        toastHandler({
          id: ToastId.CANCEL_TRANSFER_ACCOUNT_BOOK_FAILED,
          type: ToastType.ERROR,
          content: t('account_book:TOAST.FAILED_CANCEL_TRANSFER'),
          closeable: true,
        });
      }

      if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20250326 - Liz) This is a workaround to refresh the account book list after creating a new account book (if use filterSection)
    } catch (error) {
      loggerFront.error('cancelTransferAPI error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const optionDropdown = hasPermission && (
    <div className="relative">
      <button type="button" onClick={toggleOptionsDropdown} className="p-8px">
        <FiMoreVertical size={22} />
      </button>

      {isOptionsDropdownOpen && (
        <div className="absolute right-0 top-full z-10 flex h-max w-max translate-y-8px flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_XS">
          {/* Info: (20250428 - Liz) 編輯帳本 */}
          {editPermission.can && (
            <button
              type="button"
              onClick={openEditAccountBookModal}
              className="flex items-center gap-12px rounded-xs px-12px py-8px text-sm font-medium text-dropdown-text-primary hover:bg-dropdown-surface-item-hover"
            >
              <TbBuilding size={16} className="text-icon-surface-single-color-primary" />
              <span>{t('account_book:EDIT_ACCOUNT_BOOK_MODAL.EDIT_ACCOUNT_BOOK')}</span>
            </button>
          )}

          {/* Info: (20250213 - Liz) 轉移帳本 */}
          {requestTransferPermission.can && (
            <button
              type="button"
              onClick={openAccountBookTransferModal}
              className="flex items-center gap-12px rounded-xs px-12px py-8px text-sm font-medium text-dropdown-text-primary hover:bg-dropdown-surface-item-hover"
            >
              <PiShareFatBold size={16} className="text-icon-surface-single-color-primary" />
              <span>{t('account_book:ACCOUNT_BOOK_TRANSFER_MODAL.ACCOUNT_BOOK_TRANSFER')}</span>
            </button>
          )}

          {/* Info: (20250213 - Liz) 變更工作標籤 */}
          {editTagPermission.can && (
            <button
              type="button"
              onClick={openChangeTagModal}
              className="flex items-center gap-12px rounded-xs px-12px py-8px text-sm font-medium text-dropdown-text-primary hover:bg-dropdown-surface-item-hover"
            >
              <FiTag size={16} className="text-icon-surface-single-color-primary" />
              <span>{t('account_book:ACCOUNT_BOOKS_PAGE_BODY.CHANGE_WORK_TAG')}</span>
            </button>
          )}

          {/* Info: (20250213 - Liz) 刪除帳本 */}
          {deletePermission.can && (
            <button
              type="button"
              className="flex items-center gap-12px rounded-xs px-12px py-8px text-sm font-medium text-dropdown-text-primary hover:bg-dropdown-surface-item-hover"
              onClick={openDeleteCompanyModal}
            >
              <FiTrash2 size={16} className="text-icon-surface-single-color-primary" />
              <span>{t('account_book:ACCOUNT_BOOKS_PAGE_BODY.DELETE')}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Info: (20250602 - Liz) Desktop Version */}
      <main className="hidden rounded-sm bg-surface-neutral-surface-lv2 tablet:flex">
        <div
          onClick={handleConnect}
          className={cn(
            'flex flex-auto cursor-pointer items-center rounded-sm border border-stroke-neutral-quaternary px-24px py-12px laptop:gap-40px',
            {
              'border-stroke-brand-primary bg-surface-brand-primary-30': isAccountBookConnected,
              'hover:bg-surface-brand-primary-10': !isAccountBookConnected,
              'pointer-events-none': isLoading,
            }
          )}
        >
          {/* Info: (20250326 - Liz) Account Book Image & Name 顯示帳本圖片 & 名稱 */}
          <section className="flex flex-auto items-center gap-24px">
            <Image
              src={accountBook.imageId}
              alt={accountBook.name}
              width={60}
              height={60}
              className="h-60px w-60px rounded-sm border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 object-contain"
            />

            <div className="flex items-center justify-between gap-8px">
              <p className="max-w-110px truncate text-base font-medium text-text-neutral-solid-dark laptop:max-w-170px">
                {accountBook.name}
              </p>
            </div>
          </section>

          {/* Info: (20250326 - Liz) Work Tag 顯示工作標籤 */}
          <div className="flex w-90px justify-center">
            <CompanyTag tag={accountBook.tag} />
          </div>

          {/* Info: (20250326 - Liz) Transferring 顯示正在轉移中 */}
          {accountBook.isTransferring && (
            <section className="flex w-140px items-center justify-center gap-16px">
              <p className="text-nowrap text-sm font-medium">
                {t('account_book:ACCOUNT_BOOKS_PAGE_BODY.WAITING_FOR_TRANSFERRING')}...
              </p>

              {cancelTransferPermission.can && (
                <button
                  type="button"
                  className="text-nowrap text-sm font-semibold text-link-text-primary"
                  onClick={cancelTransfer}
                >
                  {t('account_book:ACCOUNT_BOOKS_PAGE_BODY.CANCEL')}
                </button>
              )}
            </section>
          )}

          {/* Info: (20250407 - Liz) OptionsDropdown 選單 */}
          {optionDropdown}
        </div>
      </main>

      {/* Info: (20250602 - Liz) Mobile Version */}
      <main className="rounded-sm bg-surface-neutral-surface-lv2 tablet:hidden">
        <div
          onClick={handleConnect}
          className={cn(
            'flex flex-auto cursor-pointer items-center rounded-sm border border-stroke-neutral-quaternary p-lv-5',
            {
              'border-stroke-brand-primary bg-surface-brand-primary-30': isAccountBookConnected,
              'hover:bg-surface-brand-primary-10': !isAccountBookConnected,
              'pointer-events-none': isLoading,
            }
          )}
        >
          {/* Info: (20250326 - Liz) Account Book Image & Name 顯示帳本圖片 & 名稱 & Tag */}
          <section className="mr-lv-7 flex flex-auto items-center gap-24px">
            <Image
              src={accountBook.imageId}
              alt={accountBook.name}
              width={60}
              height={60}
              className="h-60px w-60px rounded-sm border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 object-contain"
            />

            <div className="flex flex-col items-start justify-between gap-8px">
              <p className="max-w-100px truncate text-base font-medium text-text-neutral-solid-dark">
                {accountBook.name}
              </p>
              <div>
                <CompanyTag tag={accountBook.tag} />
              </div>
            </div>
          </section>

          {/* Info: (20250326 - Liz) Transferring 顯示正在轉移中 */}
          {accountBook.isTransferring && (
            <section className="flex w-140px items-center justify-center gap-8px">
              <p className="text-nowrap text-sm font-medium">
                {t('account_book:ACCOUNT_BOOKS_PAGE_BODY.WAITING_FOR_TRANSFERRING')}...
              </p>

              {cancelTransferPermission.can && (
                <button
                  type="button"
                  className="text-nowrap text-sm font-semibold text-link-text-primary"
                  onClick={cancelTransfer}
                >
                  {t('account_book:ACCOUNT_BOOKS_PAGE_BODY.CANCEL')}
                </button>
              )}
            </section>
          )}

          {/* Info: (20250623 - Julian) OptionsDropdown 選單 */}
          {optionDropdown}
        </div>
      </main>
    </>
  );
};

export default AccountBookItem;
