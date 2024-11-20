import React, { useState, useCallback, useEffect } from 'react';
import { IFileUIBeta } from '@/interfaces/file';
import Pusher, { Channel } from 'pusher-js';
import { getPusherInstance } from '@/lib/utils/pusher_client';
import { FREE_COMPANY_ID } from '@/constants/config';
import InvoiceUpload from '@/components/invoice_upload.tsx/invoice_upload';
import FloatingUploadPopup from '@/components/floating_upload_popup/floating_upload_popup';
import CertificateQRCodeModal from '@/components/certificate/certificate_qrcode_modal';
import { PRIVATE_CHANNEL, ROOM_EVENT } from '@/constants/pusher';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { ICertificate } from '@/interfaces/certificate';
import { ProgressStatus } from '@/constants/account';

interface CertificateFileUploadProps {}

const CertificateFileUpload: React.FC<CertificateFileUploadProps> = () => {
  const { userAuth, selectedCompany } = useUserCtx();
  const [token, setToken] = useState<string | undefined>(undefined);
  const companyId = selectedCompany?.id || FREE_COMPANY_ID;

  const [pusher, setPusher] = useState<Pusher | undefined>(undefined);
  const [channel, setChannel] = useState<Channel | undefined>(undefined);
  const [files, setFiles] = useState<IFileUIBeta[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedFileCount, setUploadFileCount] = useState<number>(0);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState<boolean>(false);
  const { trigger: delectRoomAPI } = APIHandler<boolean>(APIName.ROOM_DELETE);
  const { trigger: getRoomFilesAPI } = APIHandler<IFileUIBeta[]>(APIName.ROOM_GET_BY_ID);
  const { trigger: createCertificateAPI } = APIHandler<ICertificate>(APIName.CERTIFICATE_POST_V2);

  const pauseFileUpload = useCallback((file: IFileUIBeta, index: number) => {
    setFiles((prev) => {
      const updateFiles = [...prev];
      if (file.id === updateFiles[index].id) {
        updateFiles[index].status = ProgressStatus.PAUSED;
      } else {
        const indexUpdate = updateFiles.findIndex((f) => f.id === file.id);
        updateFiles[indexUpdate].status = ProgressStatus.PAUSED;
      }
      return updateFiles;
    });
  }, []);

  const deleteFile = useCallback((file: IFileUIBeta, index: number) => {
    setFiles((prev) => {
      const updateFiles = [...prev];
      if (file.id === updateFiles[index].id) {
        updateFiles[index].status = ProgressStatus.PAUSED;
      } else {
        const indexUpdate = updateFiles.findIndex((f) => f.id === file.id);
        updateFiles[indexUpdate].status = ProgressStatus.PAUSED;
      }
      return updateFiles;
    });
  }, []);

  const toggleQRCodeModal = () => {
    setIsQRCodeModalOpen((prev) => !prev);
  };

  const createCertificate = useCallback(async (fileId: number, index: number) => {
    try {
      const { success: successCreated, data } = await createCertificateAPI({
        params: {
          companyId,
        },
        body: {
          fileId,
        },
      });
      if (successCreated) {
        setFiles((prev) => {
          const updateFiles = [...prev];
          updateFiles[index].certificateId = data?.id;
          updateFiles[index].progress = 100;
          updateFiles[index].status = ProgressStatus.SUCCESS;
          return prev;
        });
      }
    } catch (error) {
      setFiles((prev) => {
        const updateFiles = [...prev];
        updateFiles[index].status = ProgressStatus.FAILED;
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    let uploading = false;
    let uploadCounts = 0;
    files.map(async (file, index) => {
      if (file.id && !file.certificateId && file.status !== ProgressStatus.PAUSED) {
        await createCertificate(file.id!, index);
        if (isUploading === false) {
          uploading = true;
          setIsUploading(uploading);
        }
        uploadCounts += 1;
      }
    });
    setUploadFileCount(uploadCounts);
  }, [files]);

  const handleNewFilesComing = useCallback(async (data: { message: string }) => {
    // Deprecated: (20241120 - tzuhan) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(`handleNewFilesComing: data`, data);
    const { success: successGetNewFiles, data: newFiles } = await getRoomFilesAPI({
      query: { token },
    });
    if (successGetNewFiles && newFiles) {
      setFiles((prev) => [...prev, ...newFiles]);
    }
  }, []);

  const handleRoomJoin = useCallback(() => {
    setIsQRCodeModalOpen(false);
  }, []);

  const handleRoomDelete = useCallback(async () => {
    await delectRoomAPI({
      query: {
        token,
      },
    });
  }, []);

  const handleRoomCreate = useCallback((roomToken: string) => {
    setToken(roomToken);
    const pusherInstance = getPusherInstance(userAuth?.id);
    setPusher(pusherInstance);

    const privateChannel = pusherInstance.subscribe(`${PRIVATE_CHANNEL.ROOM}-${roomToken}`);
    setChannel(privateChannel);
    privateChannel.bind(ROOM_EVENT.JOIN, handleRoomJoin);
    privateChannel.bind(ROOM_EVENT.DELETE, handleRoomDelete);
    privateChannel.bind(ROOM_EVENT.NEW_FILE, handleNewFilesComing);
  }, []);

  useEffect(() => {
    return () => {
      if (channel) {
        channel.unbind_all();
        channel.unsubscribe();
      }
      if (pusher) {
        pusher.disconnect();
      }
    };
  }, []);

  return (
    <>
      {isQRCodeModalOpen && (
        <CertificateQRCodeModal
          handleRoomCreate={handleRoomCreate}
          toggleQRCode={toggleQRCodeModal}
        />
      )}
      <InvoiceUpload
        isDisabled={false}
        withScanner
        toggleQRCode={toggleQRCodeModal}
        setFiles={setFiles}
        showErrorMessage={false}
      />
      <FloatingUploadPopup
        files={files}
        uploadedFileCount={uploadedFileCount}
        isUploading={isUploading}
        pauseFileUpload={pauseFileUpload}
        deleteFile={deleteFile}
      />
    </>
  );
};

export default CertificateFileUpload;
