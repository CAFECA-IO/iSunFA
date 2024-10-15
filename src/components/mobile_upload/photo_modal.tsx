import Image from 'next/image';
import React from 'react';

interface PhotoModalProps {
  photo: { url: string; name: string };
  onClose: () => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({ photo, onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="relative">
        <Image src={photo.url} alt={photo.name} className="max-h-full max-w-full" />
        <button
          type="button"
          className="absolute right-4 top-4 rounded-full bg-white p-2"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default PhotoModal;
