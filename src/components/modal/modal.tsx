import React, { ReactElement } from 'react';
import { RxCross1 } from 'react-icons/rx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數
  children: ReactElement;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  // Info: (20240924 - tzuhan) 不顯示模態框時返回 null
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div className="relative flex max-h-900px w-90vw max-w-800px flex-col rounded-sm bg-surface-neutral-surface-lv2 p-20px md:max-h-95vh">
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={onClose}
        >
          <RxCross1 size={32} />
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
