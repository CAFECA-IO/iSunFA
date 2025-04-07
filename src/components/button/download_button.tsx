import React from 'react';
import { Button } from '@/components/button/button';
import { MdOutlineFileDownload } from 'react-icons/md';

interface DownloadButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ onClick, disabled }) => {
  return (
    <Button
    //  Info: (20250401 - Anna)
      // onClick={onClick}
      onClick={() => {
        // eslint-disable-next-line no-console
        console.log('🟢 DownloadButton clicked');
        onClick();
      }}
      disabled={disabled}
      variant={'tertiary'}
      size={'defaultSquare'}
      className="group flex h-9 w-9 flex-col items-center justify-center rounded-xs border border-navy-blue-500 bg-transparent p-2.5"
    >
      <div className="flex items-center justify-center">
        <MdOutlineFileDownload
          size={16}
          className="fill-navy-blue-500 transition-colors group-hover:fill-neutral-25"
        />
      </div>
    </Button>
  );
};

export default DownloadButton;
