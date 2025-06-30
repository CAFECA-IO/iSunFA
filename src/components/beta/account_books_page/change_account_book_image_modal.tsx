import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { IoCloseOutline } from 'react-icons/io5';
import { useTranslation } from 'next-i18next';
import { IAccountBook, IAccountBookWithTeam } from '@/interfaces/account_book';
import { IFileUIBeta } from '@/interfaces/file';
import { UploadType } from '@/constants/file';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import UploadArea from '@/components/upload_area/upload_area';
import { useUserCtx } from '@/contexts/user_context';
import loggerFront from '@/lib/utils/logger_front';

interface ChangeAccountBookImageModalProps {
  accountBookToChangeImage: IAccountBookWithTeam;
  setAccountBookToChangeImage: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setRefreshKey?: Dispatch<SetStateAction<number>>;
  getAccountBookListByTeamId?: () => Promise<void>;
}

const ChangeAccountBookImageModal = ({
  accountBookToChangeImage,
  setAccountBookToChangeImage,
  setRefreshKey,
  getAccountBookListByTeamId,
}: ChangeAccountBookImageModalProps) => {
  const { t } = useTranslation(['account_book']);
  const { connectedAccountBook, connectAccountBook } = useUserCtx();
  const [isLoading, setIsLoading] = useState(false);
  const { trigger: uploadFileAPI } = APIHandler<IFileUIBeta>(APIName.FILE_UPLOAD);
  const { trigger: uploadAccountBookImageAPI } = APIHandler<IAccountBook>(
    APIName.ACCOUNT_BOOK_PUT_ICON
  );

  const closeChangeAccountBookImageModal = useCallback(() => {
    setAccountBookToChangeImage(undefined);
  }, [setAccountBookToChangeImage]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (isLoading) return;
      setIsLoading(true);

      try {
        // Info: (20241212 - Liz) 打 API 上傳檔案
        const formData = new FormData();
        formData.append('file', file);
        const { success: uploadFileSuccess, data: fileMeta } = await uploadFileAPI({
          query: {
            type: UploadType.COMPANY,
            targetId: String(accountBookToChangeImage.id),
          },
          body: formData,
        });

        if (!uploadFileSuccess || !fileMeta) {
          loggerFront.error('Failed to upload file:', file.name);
          return;
        }

        // Info: (20241212 - Liz) 打 API 更新帳本圖片
        const { success, error } = await uploadAccountBookImageAPI({
          params: { accountBookId: accountBookToChangeImage.id },
          body: { fileId: fileMeta.id },
        });

        if (!success) {
          loggerFront.error('更新帳本圖片失敗! error message:', error?.message);
          return;
        }

        closeChangeAccountBookImageModal();
        if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20241212 - Liz) This is a workaround to refresh the account book list after creating a new account book (if use filterSection)

        if (getAccountBookListByTeamId) getAccountBookListByTeamId(); // Info: (20250326 - Liz) 重新取得團隊帳本清單

        const isChangingSelectedCompany = connectedAccountBook?.id === accountBookToChangeImage.id;

        // Info: (20241212 - Liz) 如果是改變已選擇的帳本的圖片，就打 API 重新選擇該帳本以更新圖片
        if (isChangingSelectedCompany) {
          connectAccountBook(accountBookToChangeImage.id);
        }
      } catch (error) {
        loggerFront.error('Failed to upload file:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      closeChangeAccountBookImageModal,
      accountBookToChangeImage.id,
      isLoading,
      connectedAccountBook?.id,
      setRefreshKey,
    ]
  );

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col gap-24px rounded-lg bg-surface-neutral-surface-lv2 p-40px">
        <section className="flex items-center">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
            {t('account_book:UPLOAD_COMPANY_AVATAR_MODAL.TITLE')}
          </h1>
          <button type="button" onClick={closeChangeAccountBookImageModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>

        <UploadArea isDisabled={false} handleUpload={handleUpload} />
      </div>
    </main>
  );
};

export default ChangeAccountBookImageModal;
