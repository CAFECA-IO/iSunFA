import React, { useState, useCallback, useEffect } from 'react';
import { IFileUIBeta } from '@/interfaces/file';
import { Channel } from 'pusher-js';
import { getPusherInstance } from '@/lib/utils/pusher_client';
import { FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import InvoiceUpload from '@/components/invoice_upload.tsx/invoice_upload';
import CertificateQRCodeModal from '@/components/certificate/certificate_qrcode_modal';
import { PRIVATE_CHANNEL, ROOM_EVENT } from '@/constants/pusher';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { ICertificate } from '@/interfaces/certificate';
import { ProgressStatus } from '@/constants/account';
import { IRoom } from '@/interfaces/room';
import { ICertificateRC2Input, ICertificateRC2Output } from '@/interfaces/certificate_rc2';
import { CertificateDirection, CurrencyCode } from '@/constants/certificate';

interface CertificateFileUploadProps {
  isDisabled: boolean;
  certificateDirection?: CertificateDirection;
  setFiles: React.Dispatch<React.SetStateAction<IFileUIBeta[]>>;
}

const CertificateFileUpload: React.FC<CertificateFileUploadProps> = ({
  isDisabled,
  setFiles,
  certificateDirection,
}) => {
  const { userAuth, connectedAccountBook } = useUserCtx();
  const accountBookId = connectedAccountBook?.id || FREE_ACCOUNT_BOOK_ID;
  const [room, setRoom] = useState<IRoom | null>(null);
  const [getRoomSuccess, setGetRoomSuccess] = useState<boolean | undefined>(undefined);
  const [getRoomCode, setGetRoomCode] = useState<string | undefined>(undefined);
  const [channel, setChannel] = useState<Channel | undefined>(undefined);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState<boolean>(false);
  const { trigger: createRoomAPI } = APIHandler<IRoom>(APIName.ROOM_ADD);
  const { trigger: deleteRoomAPI } = APIHandler<boolean>(APIName.ROOM_DELETE);
  // const { trigger: getRoomByIdAPI } = APIHandler<IRoom>(APIName.ROOM_GET_BY_ID); // Info: (20241121 - tzuhan) 目前沒有用的，目前用 pusher 傳來的是足夠的
  const { trigger: createCertificateAPI } = APIHandler<ICertificate>(APIName.CERTIFICATE_POST_V2);
  const { trigger: createCertificateRC2Input } = APIHandler<ICertificateRC2Input>(
    APIName.CREATE_CERTIFICATE_RC2_INPUT
  );
  const { trigger: createCertificateRC2Output } = APIHandler<ICertificateRC2Output>(
    APIName.CREATE_CERTIFICATE_RC2_OUTPUT
  );

  // Info: (20241204 - tzuhan) 通用文件狀態更新函數
  const updateFileStatus = (
    fileId: number | null,
    fileName: string,
    status: ProgressStatus,
    progress?: number,
    certificateId?: number
  ) => {
    const update = (f: IFileUIBeta) => ({
      ...f,
      status,
      progress: progress ?? f.progress,
      certificateId,
    });
    setFiles((prev) =>
      prev.map((f) => ((f.id && fileId && f.id === fileId) || f.name === fileName ? update(f) : f))
    );
  };

  // Info: (20241204 - tzuhan) 創建憑證
  const createCertificate = useCallback(
    async (fileId: number) => {
      try {
        let success: boolean;
        let data: ICertificate | ICertificateRC2Input | ICertificateRC2Output | null = null;
        if (certificateDirection) {
          switch (certificateDirection) {
            case CertificateDirection.INPUT: {
              const result = await createCertificateRC2Input({
                params: { accountBookId: connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID },
                body: {
                  fileId,
                  direction: CertificateDirection.INPUT,
                  isGenerated: false,
                  currencyCode: CurrencyCode.TWD,
                },
              });
              success = result.success;
              data = result.data;
              break;
            }
            case CertificateDirection.OUTPUT: {
              const result = await createCertificateRC2Output({
                params: { accountBookId: connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID },
                body: {
                  fileId,
                  direction: CertificateDirection.OUTPUT,
                  isGenerated: false,
                  currencyCode: CurrencyCode.TWD,
                },
              });
              success = result.success;
              data = result.data;
              break;
            }
            default:
              success = false;
              data = null;
              break;
          }
        } else {
          const result = await createCertificateAPI({
            params: { accountBookId },
            body: { fileIds: [fileId] },
          });
          success = result.success;
          data = result.data;
        }
        if (success && data) {
          updateFileStatus(fileId, '', ProgressStatus.SUCCESS, 100, data.id);
        }
      } catch (error) {
        updateFileStatus(fileId, '', ProgressStatus.FAILED);
      }
    },
    [accountBookId]
  );

  // Info: (20241204 - tzuhan) 處理來自 Pusher 的新文件
  const handleNewFilesComing = useCallback(async (data: { message: string }) => {
    const newFile: IFileUIBeta = {
      ...JSON.parse(data.message),
      progress: 80,
      status: ProgressStatus.IN_PROGRESS,
    };

    setIsQRCodeModalOpen(false);
    setFiles((prev) => [...prev, newFile]);

    if (newFile.id) {
      await createCertificate(newFile.id);
    } else {
      updateFileStatus(newFile.id, newFile.name, ProgressStatus.FAILED);
    }
  }, []);

  // Info: (20241204 - tzuhan) 處理加入房間
  const handleRoomJoin = useCallback(() => {
    setIsQRCodeModalOpen(false);
  }, []);

  // Info: (20241204 - tzuhan) 處理刪除房間
  const handleRoomDelete = useCallback(async () => {
    if (room) {
      await deleteRoomAPI({
        params: { roomId: room.id },
        body: { password: room.password },
      });
    }
  }, [room]);

  // Info: (20241204 - tzuhan) 獲取房間資料
  const createRoom = useCallback(async () => {
    const { success, code, data: newRoom } = await createRoomAPI();
    setGetRoomSuccess(success);
    setGetRoomCode(code);
    if (success && newRoom) setRoom(newRoom);
  }, [createRoomAPI]);

  // Info: (20241204 - tzuhan) 切換 QR 代碼模態框
  const toggleQRCodeModal = useCallback(() => {
    setIsQRCodeModalOpen((prev) => {
      if (!prev && !room) {
        createRoom();
      } else if (channel && !channel.subscribed) {
        channel.subscribe();
      }
      return !prev;
    });
  }, [room, channel]);

  // Info: (20241204 - tzuhan) 訂閱 Pusher 頻道並清理
  useEffect(() => {
    if (!room) return;

    const pusherInstance = getPusherInstance(userAuth?.id);
    const privateChannel = pusherInstance.subscribe(`${PRIVATE_CHANNEL.ROOM}-${room.id}`);

    privateChannel.bind(ROOM_EVENT.JOIN, handleRoomJoin);
    privateChannel.bind(ROOM_EVENT.DELETE, handleRoomDelete);
    privateChannel.bind(ROOM_EVENT.NEW_FILE, handleNewFilesComing);

    setChannel(privateChannel);

    // Deprecate: (20241204 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line consistent-return
    return () => {
      privateChannel.unbind_all();

      pusherInstance.unsubscribe(`${PRIVATE_CHANNEL.ROOM}-${room.id}`);
      handleRoomDelete();
    };
  }, [room]);

  return (
    <>
      {isQRCodeModalOpen && (
        <CertificateQRCodeModal
          room={room}
          success={getRoomSuccess}
          code={getRoomCode}
          toggleQRCode={toggleQRCodeModal}
        />
      )}
      <InvoiceUpload
        isDisabled={isDisabled}
        toggleQRCode={toggleQRCodeModal}
        setFiles={setFiles}
        certificateDirection={certificateDirection}
      />
    </>
  );
};

export default CertificateFileUpload;
