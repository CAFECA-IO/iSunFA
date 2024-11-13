import React, { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { ISUNFA_ROUTE } from '@/constants/url';
import { DOMAIN } from '@/constants/config';
import { Button } from '@/components/button/button';
import { useQRCode } from 'next-qrcode';
import { IoCloseOutline } from 'react-icons/io5';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import Image from 'next/image';

interface CertificateQRCodeModalProps {
  toggleQRCode: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數
  handleRoomCreate: (token: string) => void;
}

const CertificateQRCodeModal: React.FC<CertificateQRCodeModalProps> = ({
  toggleQRCode,
  handleRoomCreate,
}) => {
  const { t } = useTranslation(['certificate', 'common']);
  const { Canvas } = useQRCode();
  const { selectedCompany } = useUserCtx();
  const isDev = true; // Deprecated: (20241122 - tzuhan) debug purpose
  const {
    success,
    data: token,
    code,
  } = APIHandler<string>(
    APIName.ROOM_ADD,
    {
      params: {
        companyId: selectedCompany?.id,
      },
    },
    true
  );

  const displayedQRCode = success && token && (
    <div className="mx-20 my-10 flex flex-col items-center">
      {/* Info: (20240924 - tzuhan) 發票縮略圖 */}
      <Canvas
        text={`${isDev ? 'http://192.168.2.29:3000' : DOMAIN}/${ISUNFA_ROUTE.UPLOAD}?token=${token}`}
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
        href={`${isDev ? 'http://localhost:3000' : DOMAIN}/${ISUNFA_ROUTE.UPLOAD}?token=${token}`}
        target="_blank"
        rel="noreferrer"
      >{`${isDev ? 'http://localhost:3000' : DOMAIN}/${ISUNFA_ROUTE.UPLOAD}?token=${token}`}</a>
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
    if (token) handleRoomCreate(token);
  }, [token]);

  return (
    <main className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col rounded-lg bg-surface-neutral-surface-lv2">
        <section className="flex items-center justify-between py-16px pl-40px pr-20px">
          <h1 className="flex flex-col items-center justify-center gap-2 border-b border-stroke-neutral-quaternary p-2 text-xl font-semibold text-card-text-title">
            <div className="text-xl font-semibold">{t('certificate:UPLOAD.URL')}</div>
            <div className="text-xs font-normal text-card-text-sub">
              {t('certificate:UPLOAD.FOR_MOBILE')}
            </div>
          </h1>
          <button type="button" onClick={toggleQRCode}>
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
