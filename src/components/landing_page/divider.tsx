import React from 'react';
import Image from 'next/image';

const Divider: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="flex w-full items-center gap-lv-4">
      <div className="flex items-center gap-8px">
        <Image src="/icons/annoncement-megaphone.svg" alt="megaphone_icon" width={24} height={24} />
        <p className="text-sm font-medium">{text}</p>
      </div>
      <hr className="flex-1 border-landing-page-white" />
    </div>
  );
};

export default Divider;
