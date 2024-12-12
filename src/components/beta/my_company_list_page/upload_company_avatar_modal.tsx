import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { IoCloseOutline } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { ICompany, ICompanyAndRole } from '@/interfaces/company';
import { IFileUIBeta } from '@/interfaces/file';
import { UploadType } from '@/constants/file';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import UploadArea from '@/components/upload_area/upload_area';
import { useUserCtx } from '@/contexts/user_context';

interface UploadCompanyAvatarModalProps {
  companyToUploadAvatar: ICompanyAndRole;
  isModalOpen: boolean;
  setCompanyToUploadAvatar: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
  setRefreshKey?: Dispatch<SetStateAction<number>>;
}

const UploadCompanyAvatarModal = ({
  companyToUploadAvatar,
  isModalOpen,
  setCompanyToUploadAvatar,
  setRefreshKey,
}: UploadCompanyAvatarModalProps) => {
  const { t } = useTranslation(['company']);
  const { selectedCompany, selectCompany } = useUserCtx();
  const [isLoading, setIsLoading] = useState(false);
  const { trigger: uploadFileAPI } = APIHandler<IFileUIBeta>(APIName.FILE_UPLOAD);
  const { trigger: uploadCompanyAvatarAPI } = APIHandler<ICompany>(APIName.COMPANY_PUT_ICON);

  const closeUploadCompanyAvatarModal = useCallback(() => {
    setCompanyToUploadAvatar(undefined);
  }, [setCompanyToUploadAvatar]);

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
            targetId: String(companyToUploadAvatar.company.id),
          },
          body: formData,
        });

        if (!uploadFileSuccess || !fileMeta) {
          // Deprecated: (20241212 - Liz)
          // eslint-disable-next-line no-console
          console.error('Failed to upload file:', file.name);
          return;
        }

        // Info: (20241212 - Liz) 打 API 更新公司頭像
        const { success, error } = await uploadCompanyAvatarAPI({
          params: { companyId: companyToUploadAvatar.company.id },
          body: { fileId: fileMeta.id },
        });

        if (!success) {
          // Deprecated: (20241212 - Liz)
          // eslint-disable-next-line no-console
          console.error('Failed to update company avatar! error message:', error?.message);
          return;
        }

        closeUploadCompanyAvatarModal();
        if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20241212 - Liz) This is a workaround to refresh the company list after creating a new company

        const isChangingSelectedCompany = selectedCompany?.id === companyToUploadAvatar.company.id;

        // Info: (20241212 - Liz) 如果是改變已選擇的公司，就打 API 再重新選擇一次以更新公司頭像
        if (isChangingSelectedCompany) {
          selectCompany(companyToUploadAvatar.company.id);
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
      closeUploadCompanyAvatarModal,
      companyToUploadAvatar.company.id,
      isLoading,
      selectedCompany?.id,
      setRefreshKey,
    ]
  );

  return isModalOpen ? (
    <main className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col gap-24px rounded-lg bg-surface-neutral-surface-lv2 p-40px">
        <section className="flex items-center">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
            {t('company:UPLOAD_COMPANY_AVATAR_MODAL.CHANGE_COMPANY_AVATAR')}
          </h1>
          <button type="button" onClick={closeUploadCompanyAvatarModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>

        <UploadArea isDisabled={false} withScanner={false} handleUpload={handleUpload} />
      </div>
    </main>
  ) : null;
};

export default UploadCompanyAvatarModal;
