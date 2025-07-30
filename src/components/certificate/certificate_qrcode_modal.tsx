import React from 'react';
import { useTranslation } from 'next-i18next';
import { ISUNFA_ROUTE } from '@/constants/url';
import { Button } from '@/components/button/button';
import { useQRCode } from 'next-qrcode';
import { RxCross2 } from 'react-icons/rx';
import Image from 'next/image';
import { IRoom } from '@/interfaces/room';

interface CertificateQRCodeModalProps {
  room: IRoom | null;
  success?: boolean;
  code?: string;
  toggleQRCode: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數
}

const CertificateQRCodeModal: React.FC<CertificateQRCodeModalProps> = ({
  room,
  success,
  code,
  toggleQRCode,
}) => {
  const { t } = useTranslation(['certificate', 'common']);
  const { Canvas } = useQRCode();
  const domain = process.env.NEXT_PUBLIC_DOMAIN;

  const displayedQRCode =
    success && room ? (
      <div className="mx-24 my-5 flex flex-col items-center">
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
      </div>
    ) : success === undefined ? (
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
    ) : (
      <div className="text-center text-red-500">Error: {code}</div>
    );

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-90vw flex-col rounded-lg bg-surface-neutral-surface-lv2 tablet:w-400px">
        <section className="relative">
          <h1 className="flex flex-col items-center justify-center gap-2 p-2 text-xl font-semibold text-card-text-title">
            <div className="text-xl font-semibold">{t('certificate:UPLOAD.PHONE_SCANNER')}</div>
            <div className="text-xs font-normal text-card-text-sub">
              {t('certificate:UPLOAD.SCAN_WITH_PHONE')}
            </div>
          </h1>
          <button type="button" onClick={toggleQRCode} className="absolute right-24px top-24px">
            <RxCross2 size={24} />
          </button>
        </section>
        {displayedQRCode}
        <div className="flex justify-end gap-2 px-4 py-3">
          <Button
            type="button"
            variant="tertiaryOutline"
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
