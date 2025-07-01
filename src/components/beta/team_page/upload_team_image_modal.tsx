import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { IoCloseOutline } from 'react-icons/io5';
import { ITeam, ITeamWithImage } from '@/interfaces/team';
import UploadArea from '@/components/upload_area/upload_area';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IFileUIBeta } from '@/interfaces/file';
import { UploadType } from '@/constants/file';
import { useTranslation } from 'next-i18next';
import loggerFront from '@/lib/utils/logger_front';

interface UploadTeamImageModalProps {
  teamToChangeImage: ITeam;
  setTeamToChangeImage: Dispatch<SetStateAction<ITeam | undefined>>;
  getTeamData: () => Promise<void>;
}

const UploadTeamImageModal = ({
  teamToChangeImage,
  setTeamToChangeImage,
  getTeamData,
}: UploadTeamImageModalProps) => {
  const { t } = useTranslation(['team']);
  const [isLoading, setIsLoading] = useState(false);
  const { trigger: uploadFileAPI } = APIHandler<IFileUIBeta>(APIName.FILE_UPLOAD);
  const { trigger: uploadTeamPictureAPI } = APIHandler<ITeamWithImage>(APIName.PUT_TEAM_ICON);

  const closeUploadTeamPictureModal = () => {
    setTeamToChangeImage(undefined);
  };

  const handleUpload = useCallback(
    async (file: File) => {
      if (isLoading) return;
      setIsLoading(true);

      try {
        // Info: (20250218 - Liz) 打 API 上傳檔案
        const formData = new FormData();
        formData.append('file', file);
        const { success: uploadFileSuccess, data: fileMeta } = await uploadFileAPI({
          query: {
            type: UploadType.TEAM,
            targetId: Number(teamToChangeImage.id), // Info: (20250304 - Liz) teamId
          },
          body: formData,
        });

        if (!uploadFileSuccess || !fileMeta) {
          loggerFront.error('Failed to upload file:', file.name);
          return;
        }

        // Info: (20250304 - Liz) 打 API 更新團隊的圖片
        const { success, data, error } = await uploadTeamPictureAPI({
          params: { teamId: teamToChangeImage.id },
          body: { fileId: fileMeta.id },
        });

        if (!success) {
          loggerFront.error('更新團隊的圖片失敗! error message:', error?.message);
          return;
        }

        loggerFront.log('success:', success, 'data:', data);

        closeUploadTeamPictureModal();
        // Info: (20250310 - Liz) 更新畫面(重新取得團隊資料)
        getTeamData();
      } catch (error) {
        loggerFront.error('Failed to upload file:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-90vw flex-col gap-24px rounded-lg bg-surface-neutral-surface-lv2 px-20px py-16px tablet:w-400px tablet:p-40px">
        <section className="flex items-center">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
            {t('team:TEAM_PAGE.CHANGE_TEAM_PICTURE')}
          </h1>
          <button type="button" onClick={closeUploadTeamPictureModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>

        <UploadArea isDisabled={false} handleUpload={handleUpload} />
      </div>
    </main>
  );
};

export default UploadTeamImageModal;
