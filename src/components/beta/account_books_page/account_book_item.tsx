import { Dispatch, SetStateAction, useState } from 'react';
import Image from 'next/image';
import { IAccountBookWithTeam, CANCEL_ACCOUNT_BOOK_ID } from '@/interfaces/account_book';
import { FiEdit2, FiTag, FiTrash2, FiMoreVertical } from 'react-icons/fi';
import { PiShareFatBold } from 'react-icons/pi';
import CompanyTag from '@/components/beta/account_books_page/company_tag';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ITransferAccountBook } from '@/interfaces/team';
import { cn } from '@/lib/utils/common';

interface AccountBookItemProps {
  accountBook: IAccountBookWithTeam;
  setAccountBookToTransfer: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setAccountBookToEdit: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setAccountBookToDelete: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setAccountBookToUploadPicture: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setRefreshKey?: React.Dispatch<React.SetStateAction<number>>;
}

const AccountBookItem = ({
  accountBook,
  setAccountBookToTransfer,
  setAccountBookToEdit,
  setAccountBookToDelete,
  setAccountBookToUploadPicture,
  setRefreshKey,
}: AccountBookItemProps) => {
  const { t } = useTranslation(['account_book']);
  const { connectAccountBook, connectedAccountBook } = useUserCtx();
  const [isLoading, setIsLoading] = useState(false);
  const isAccountBookConnected = accountBook.id === connectedAccountBook?.id;
  const teamRole = accountBook.team.role;

  // Info: (20250326 - Liz) 取消轉移帳本 API
  const { trigger: cancelTransferAPI } = APIHandler<ITransferAccountBook>(
    APIName.CANCEL_TRANSFER_ACCOUNT_BOOK
  );

  const {
    targetRef: optionsDropdownRef,
    componentVisible: isOptionsDropdownOpen,
    setComponentVisible: setIsOptionsDropdownOpen,
  } = useOuterClick<HTMLDivElement>(false);

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

  const modifyImagePermission = convertTeamRoleCanDo({
    teamRole,
    canDo: TeamPermissionAction.MODIFY_ACCOUNT_BOOK,
  });

  const hasPermission =
    deletePermission.can || editTagPermission.can || requestTransferPermission.can;

  const toggleOptionsDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsOptionsDropdownOpen((prev) => !prev);
    e.stopPropagation(); // Info: (20250407 - Liz) 避免點擊選單時觸發父元素的點擊事件
  };

  const closeOptionsDropdown = () => {
    setIsOptionsDropdownOpen(false);
  };

  const openAccountBookTransferModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAccountBookToTransfer(accountBook);
    closeOptionsDropdown();
    e.stopPropagation(); // Info: (20250407 - Liz) 避免點擊選單時觸發父元素的點擊事件
  };

  const openChangeTagModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAccountBookToEdit(accountBook);
    closeOptionsDropdown();
    e.stopPropagation(); // Info: (20250407 - Liz) 避免點擊選單時觸發父元素的點擊事件
  };

  const openDeleteCompanyModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAccountBookToDelete(accountBook);
    closeOptionsDropdown();
    e.stopPropagation(); // Info: (20250407 - Liz) 避免點擊選單時觸發父元素的點擊事件
  };

  const openUploadCompanyPictureModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAccountBookToUploadPicture(accountBook);
    closeOptionsDropdown();
    e.stopPropagation(); // Info: (20250407 - Liz) 避免點擊選單時觸發父元素的點擊事件
  };

  // Info: (20241113 - Liz) 打 API 連結帳本 (原為公司)
  const handleConnect = async () => {
    if (isLoading) return;

    setIsLoading(true);

    const accountBookId = isAccountBookConnected ? CANCEL_ACCOUNT_BOOK_ID : accountBook.id;

    try {
      const { success } = await connectAccountBook(accountBookId);

      if (!success) {
        // Deprecated: (20241113 - Liz)
        // eslint-disable-next-line no-console
        console.log('連結帳本失敗'); // ToDo: (20250326 - Liz) 之後可以改成用 toast 顯示
      }
    } catch (error) {
      // Deprecated: (20241113 - Liz)
      // eslint-disable-next-line no-console
      console.log('connectAccountBook error:', error);
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
        // Deprecated: (20250326 - Liz)
        // eslint-disable-next-line no-console
        console.log('取消轉移帳本失敗'); // ToDo: (20250326 - Liz) 之後可以改成用 toast 顯示
        return;
      }

      if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20250326 - Liz) This is a workaround to refresh the account book list after creating a new account book (if use filterSection)
    } catch (error) {
      // Deprecated: (20250326 - Liz)
      // eslint-disable-next-line no-console
      console.log('cancelTransferAPI error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex rounded-sm bg-surface-neutral-surface-lv2">
      <div
        onClick={handleConnect}
        className={cn(
          'flex flex-auto cursor-pointer items-center gap-40px rounded-sm border border-stroke-neutral-quaternary px-24px py-12px',
          {
            'border-stroke-brand-primary bg-surface-brand-primary-30': isAccountBookConnected,
            'hover:bg-surface-brand-primary-10': !isAccountBookConnected,
            'pointer-events-none': isLoading,
          }
        )}
      >
        {/* Info: (20250326 - Liz) Account Book Image & Name */}
        <section className="flex w-300px flex-auto items-center gap-24px">
          <button
            type="button"
            onClick={openUploadCompanyPictureModal}
            className="group relative"
            disabled={!modifyImagePermission.can}
          >
            <Image
              src={accountBook.imageId}
              alt={accountBook.name}
              width={60}
              height={60}
              className="h-60px w-60px rounded-sm border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2 object-contain"
            ></Image>

            {modifyImagePermission.can && (
              <div className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-sm border border-stroke-neutral-quaternary text-sm text-black opacity-0 backdrop-blur-sm group-hover:opacity-100">
                <FiEdit2 size={24} />
              </div>
            )}
          </button>

          <div className="flex items-center justify-between gap-8px">
            <p className="max-w-170px truncate text-base font-medium text-text-neutral-solid-dark">
              {accountBook.name}
            </p>
          </div>
        </section>

        {/* Info: (20250326 - Liz) Work Tag */}
        <div className="flex w-90px justify-center">
          <CompanyTag tag={accountBook.tag} />
        </div>

        {/* Info: (20250326 - Liz) Transferring */}
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

        {/* Info: (20250407 - Liz) Edit Account Book */}
        {hasPermission && (
          <div ref={optionsDropdownRef} className="relative">
            <button type="button" onClick={toggleOptionsDropdown} className="p-8px">
              <FiMoreVertical size={22} />
            </button>

            {isOptionsDropdownOpen && (
              <div className="absolute right-0 top-full z-10 flex h-max w-max translate-y-8px flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_XS">
                {/* Info: (20250213 - Liz) Account Book Transfer */}
                {requestTransferPermission.can && (
                  <button
                    type="button"
                    onClick={openAccountBookTransferModal}
                    className="flex items-center gap-12px rounded-xs px-12px py-8px text-sm font-medium text-dropdown-text-primary hover:bg-dropdown-surface-item-hover"
                  >
                    <PiShareFatBold size={16} className="text-icon-surface-single-color-primary" />
                    <span>
                      {t('account_book:ACCOUNT_BOOK_TRANSFER_MODAL.ACCOUNT_BOOK_TRANSFER')}
                    </span>
                  </button>
                )}

                {/* Info: (20250213 - Liz) Change Tag */}
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

                {/* Info: (20250213 - Liz) Delete */}
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
        )}
      </div>
    </main>
  );
};

export default AccountBookItem;
