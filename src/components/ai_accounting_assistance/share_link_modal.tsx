import React from 'react';
import { Button } from '@/components/button/button';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';

interface IShareModalProps {
  copyLink: string;
  onClose: () => void;
}

const ShareModal: React.FC<IShareModalProps> = ({ copyLink, onClose }) => {
  const { toastHandler } = useModalContext();

  const copyHandler = () => {
    navigator.clipboard.writeText(copyLink);

    toastHandler({
      id: 'copy_share_link_success',
      type: ToastType.SUCCESS,
      content: 'Copied!',
      closeable: true,
    });
  };

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex flex-col items-center gap-12px rounded-lg bg-surface-neutral-surface-lv2 px-40px py-16px">
        <h2 className="text-4xl font-bold text-text-neutral-primary">Share Link</h2>
        <div className="flex items-center gap-8px">
          <div className="bg-input-surface-input-disable px-12px py-8px text-input-text-secondary">
            {copyLink}
          </div>
          <Button type="button" onClick={copyHandler}>
            Copy
          </Button>
        </div>
        <Button type="button" variant="tertiary" className="w-fit" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default ShareModal;
