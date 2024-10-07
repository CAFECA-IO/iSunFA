import React from 'react';
import { ISUNFA_ROUTE } from '@/constants/url';
import { DOMAIN } from '@/constants/config';
import { RxCross1 } from 'react-icons/rx';
import { Button } from '@/components/button/button';
import { useQRCode } from 'next-qrcode';

interface CertificateQRCodeModalProps {
  isOpen: boolean;
  isOnTopOfModal: boolean;
  token: string;
  onClose: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數
}

const CertificateQRCodeModal: React.FC<CertificateQRCodeModalProps> = ({
  isOpen,
  isOnTopOfModal = false,
  token,
  onClose,
}) => {
  if (!isOpen) return null;
  const { Canvas } = useQRCode();
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div
      className={`fixed inset-0 z-70 flex items-center justify-center ${isOnTopOfModal ? '' : 'bg-black/50'}`}
    >
      <div className="relative flex max-h-90vh flex-col rounded-sm bg-surface-neutral-surface-lv2 md:max-h-100vh">
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={onClose}
        >
          <RxCross1 size={32} />
        </button>
        {/* Info: (20240924 - tzuhan) 模態框標題 */}
        <h2 className="flex flex-col items-center justify-center gap-2 border-b border-stroke-neutral-quaternary p-2 text-xl font-semibold text-card-text-title">
          <div className="text-xl font-semibold">Url</div>
          <div className="text-xs font-normal text-card-text-sub">for mobile upload</div>
        </h2>
        <div className="mx-20 my-10">
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
        </div>
        <div className="flex justify-end gap-2 border-t border-stroke-neutral-quaternary px-4 py-3">
          <Button
            type="button"
            variant="tertiaryOutlineGrey"
            className="p-2 px-4"
            onClick={onClose}
          >
            <div className="flex items-end gap-2">Close</div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateQRCodeModal;
