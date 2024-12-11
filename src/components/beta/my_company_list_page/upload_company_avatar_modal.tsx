import { ICompanyAndRole } from '@/interfaces/company';
import { Dispatch, SetStateAction } from 'react';
import { IoCloseOutline } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import UploadArea from '@/components/upload_area/upload_area';

interface UploadCompanyAvatarModalProps {
  companyToUploadAvatar: ICompanyAndRole;
  isModalOpen: boolean;
  setCompanyToUploadAvatar: Dispatch<SetStateAction<ICompanyAndRole | undefined>>;
  setRefreshKey?: React.Dispatch<React.SetStateAction<number>>;
}

const UploadCompanyAvatarModal = ({
  companyToUploadAvatar,
  isModalOpen,
  setCompanyToUploadAvatar,
  setRefreshKey,
}: UploadCompanyAvatarModalProps) => {
  const { t } = useTranslation(['company']);

  // Deprecated: (20241210 - Liz)
  // eslint-disable-next-line no-console
  console.log('companyToUploadAvatar:', companyToUploadAvatar, setRefreshKey);

  const closeUploadCompanyAvatarModal = () => {
    setCompanyToUploadAvatar(undefined);
  };

  const handleUpload = async (file: File) => {
    // Deprecated: (20241210 - Liz)
    // eslint-disable-next-line no-console
    console.log('handleUpload file:', file);

    // Info: (20241210 - Liz) 打 API 更新公司圖片 (暫時亂寫 等api完成再補)
    // try {
    //   const data = await updateCompanyAvatar(companyToUploadAvatar.company.id, file);
    //   if (data) {
    //     setRefreshKey((prev) => prev + 1);
    //   } else {
    //     // Deprecated: (20241210 - Liz)
    //     // eslint-disable-next-line no-console
    //     console.log('更新公司圖片失敗');
    //   }
    // } catch (error) {
    //   // Deprecated: (20241210 - Liz)
    //   // eslint-disable-next-line no-console
    //   console.error('UploadCompanyAvatarModal handleUpload error:', error);
    // }
  };

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
