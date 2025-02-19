import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { IoCloseOutline } from 'react-icons/io5';
import { ITeam } from '@/interfaces/team';
import UploadArea from '@/components/upload_area/upload_area';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IFileUIBeta } from '@/interfaces/file';
import { UploadType } from '@/constants/file';
import { useTranslation } from 'next-i18next';

interface UploadTeamPictureModalProps {
  teamToUploadPicture: ITeam;
  setTeamToUploadPicture: Dispatch<SetStateAction<ITeam | undefined>>;
}

const UploadTeamPictureModal = ({
  teamToUploadPicture,
  setTeamToUploadPicture,
}: UploadTeamPictureModalProps) => {
  const { t } = useTranslation(['team']);
  const [isLoading, setIsLoading] = useState(false);
  const { trigger: uploadFileAPI } = APIHandler<IFileUIBeta>(APIName.FILE_UPLOAD);
  // ToDo: (20250218 - Liz) 等後端提供變更團隊圖片的 API 後再使用
  //   const { trigger: uploadTeamPictureAPI } = APIHandler<?>(
  //     APIName.?
  //   );

  const closeUploadTeamPictureModal = () => {
    setTeamToUploadPicture(undefined);
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
            type: UploadType.COMPANY,
            targetId: String(teamToUploadPicture.id), // ToDo: (20250218 - Liz) 等後端提供需要的 targetId 再修改
          },
          body: formData,
        });

        if (!uploadFileSuccess || !fileMeta) {
          // Deprecated: (20250218 - Liz)
          // eslint-disable-next-line no-console
          console.error('Failed to upload file:', file.name);
          return;
        }

        // ToDo: (20250218 - Liz) 打 API 更新團隊的圖片

        // const { success, error } = await uploadTeamPictureAPI({
        //   params: { teamId: teamToUploadPicture.id },
        //   body: { fileId: fileMeta.id },
        // });

        // if (!success) {
        //   // Deprecated: (20250218 - Liz)
        //   // eslint-disable-next-line no-console
        //   console.error('更新團隊的圖片失敗! error message:', error?.message);
        //   return;
        // }

        closeUploadTeamPictureModal();
        // ToDo: (20250218 - Liz) 更新畫面
      } catch (error) {
        // Deprecated: (20250218 - Liz)
        // eslint-disable-next-line no-console
        console.error('Failed to upload file:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col gap-24px rounded-lg bg-surface-neutral-surface-lv2 p-40px">
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

export default UploadTeamPictureModal;
