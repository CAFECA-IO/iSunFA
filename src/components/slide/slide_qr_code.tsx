'use client';

import QRCode from 'react-qr-code';

interface ISlideQRCodeProps {
  url: string;
  className?: string;
  size?: number;
}

export default function SlideQRCode({ url, className = '', size = 120 }: ISlideQRCodeProps) {
  return (
    <div className={`flex flex-col items-center gap-2 p-3 bg-white rounded-xl shadow-lg border border-gray-100 ${className}`}>
      <QRCode value={url} size={size} />
    </div>
  );
}
