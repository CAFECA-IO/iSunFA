import React, { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { ISUNFA_ROUTE } from '@/constants/url';
import { Button } from '@/components/button/button';
import { useQRCode } from 'next-qrcode';
import { IoCloseOutline } from 'react-icons/io5';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import Image from 'next/image';
import { IRoom } from '@/interfaces/room';

interface CertificateQRCodeModalProps {
  toggleQRCode: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數
  handleRoomCreate: (room: IRoom) => void;
}

const CertificateQRCodeModal: React.FC<CertificateQRCodeModalProps> = ({
  toggleQRCode,
  handleRoomCreate,
}) => {
  const { t } = useTranslation(['certificate', 'common']);
  const { Canvas } = useQRCode();
  const { success, data: room, code } = APIHandler<IRoom>(APIName.ROOM_ADD, {}, true);
  const domain = process.env.NEXT_PUBLIC_DOMAIN;

  const displayedQRCode = success && room && (
    <div className="mx-20 my-10 flex flex-col items-center">
      <Canvas
        text={`${domain}/${ISUNFA_ROUTE.UPLOAD}?token=${room.id}`}
        options={{
          errorCorrectionLevel: 'M',
          margin: 3,
          scale: 4,
          width: 300,
          color: {
            dark: '#304872',
            light: '#fff',
          },
        }}
      />
      <a
        className="mt-2 text-center text-xs text-card-text-sub"
        href={`${domain}/${ISUNFA_ROUTE.UPLOAD}?token=${room.id}`}
        target="_blank"
        rel="noreferrer"
      >{`${domain}/${ISUNFA_ROUTE.UPLOAD}?token=${room.id}`}</a>
    </div>
  );

  const displayedLoading = success === undefined && (
    <div className="flex flex-col items-center gap-2">
      <Image
        src="/elements/uploading.gif"
        className="rounded-xs"
        width={150}
        height={150}
        alt={t('common:COMMON.LOADING')}
      />
      <div>{t('common:COMMON.LOADING')}</div>
    </div>
  );
  const displayedError = success === false && code && <div>{code}</div>;

  useEffect(() => {
    if (room) handleRoomCreate(room);
  }, [room]);

  return (
    <main className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col rounded-lg bg-surface-neutral-surface-lv2">
        <section className="relative">
          <h1 className="flex flex-col items-center justify-center gap-2 border-b border-stroke-neutral-quaternary p-2 text-xl font-semibold text-card-text-title">
            <div className="text-xl font-semibold">{t('certificate:UPLOAD.URL')}</div>
            <div className="text-xs font-normal text-card-text-sub">
              {t('certificate:UPLOAD.FOR_MOBILE')}
            </div>
          </h1>
          <button type="button" onClick={toggleQRCode} className="absolute right-24px top-24px">
            <IoCloseOutline size={24} />
          </button>
        </section>
        {displayedError}
        {displayedLoading}
        {displayedQRCode}
        <div className="flex justify-end gap-2 border-t border-stroke-neutral-quaternary px-4 py-3">
          <Button
            type="button"
            variant="tertiaryOutlineGrey"
            className="p-2 px-4"
            onClick={toggleQRCode}
          >
            <div className="flex items-end gap-2">{t('common:COMMON.CLOSE')}</div>
          </Button>
        </div>
      </div>
    </main>
  );
};

export default CertificateQRCodeModal;
