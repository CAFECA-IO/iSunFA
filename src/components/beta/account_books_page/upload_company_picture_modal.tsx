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

interface UploadCompanyPictureModalProps {
  accountBookToUploadPicture: IAccountBookWithTeam;
  setAccountBookToUploadPicture: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setRefreshKey?: Dispatch<SetStateAction<number>>;
}

const UploadCompanyPictureModal = ({
  accountBookToUploadPicture,
  setAccountBookToUploadPicture,
  setRefreshKey,
}: UploadCompanyPictureModalProps) => {
  const { t } = useTranslation(['account_book']);
  const { connectedAccountBook, connectAccountBook } = useUserCtx();
  const [isLoading, setIsLoading] = useState(false);
  const { trigger: uploadFileAPI } = APIHandler<IFileUIBeta>(APIName.FILE_UPLOAD);
  const { trigger: uploadAccountBookCompanyPictureAPI } = APIHandler<IAccountBook>(
    APIName.COMPANY_PUT_ICON
  );

  const closeUploadAccountBookCompanyPictureModal = useCallback(() => {
    setAccountBookToUploadPicture(undefined);
  }, [setAccountBookToUploadPicture]);

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
            targetId: String(accountBookToUploadPicture.id),
          },
          body: formData,
        });

        if (!uploadFileSuccess || !fileMeta) {
          // Deprecated: (20241212 - Liz)
          // eslint-disable-next-line no-console
          console.error('Failed to upload file:', file.name);
          return;
        }

        // Info: (20241212 - Liz) 打 API 更新帳本的公司圖片
        const { success, error } = await uploadAccountBookCompanyPictureAPI({
          params: { Id: accountBookToUploadPicture.id }, // ToDo: (20250212 - Liz) 因應設計稿修改將公司改為帳本，後端 API 也需要將Id 修改成 accountBookId
          body: { fileId: fileMeta.id },
        });

        if (!success) {
          // Deprecated: (20241212 - Liz)
          // eslint-disable-next-line no-console
          console.error('更新帳本的公司圖片失敗! error message:', error?.message);
          return;
        }

        closeUploadAccountBookCompanyPictureModal();
        if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20241212 - Liz) This is a workaround to refresh the account book list after creating a new account book (if use filterSection)

        const isChangingSelectedCompany =
          connectedAccountBook?.id === accountBookToUploadPicture.id;

        // Info: (20241212 - Liz) 如果是改變已選擇的帳本的公司圖片，就打 API 選擇該帳本以更新公司圖片
        if (isChangingSelectedCompany) {
          connectAccountBook(accountBookToUploadPicture.id);
        }
      } catch (error) {
        // Deprecated: (20241212 - Liz)
        // eslint-disable-next-line no-console
        console.error('Failed to upload file:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      closeUploadAccountBookCompanyPictureModal,
      accountBookToUploadPicture.id,
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
          <button type="button" onClick={closeUploadAccountBookCompanyPictureModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>

        <UploadArea isDisabled={false} handleUpload={handleUpload} />
      </div>
    </main>
  );
};

export default UploadCompanyPictureModal;
