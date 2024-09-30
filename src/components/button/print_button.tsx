import React from 'react';
import { Button } from '@/components/button/button';
import { IoPrintOutline } from 'react-icons/io5';

interface PrintButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const PrintButton: React.FC<PrintButtonProps> = ({ onClick, disabled }) => {
  return (
    <Button
      disabled={disabled}
      onClick={onClick}
      variant={'tertiary'}
      className="group flex h-9 w-9 flex-col items-center justify-center rounded-xs border border-navy-blue-500 bg-transparent p-2.5"
    >
      <div className="flex items-center justify-center">
        <IoPrintOutline
          size={16}
          className="stroke-navy-blue-500 transition-colors group-hover:fill-navy-blue-400 group-hover:stroke-neutral-25"
        />
      </div>
    </Button>
  );
};

export default PrintButton;
