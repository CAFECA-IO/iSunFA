import Image from 'next/image';
import React from 'react';

interface SelectedPhotosPreviewProps {
  selectedPhotos: { url: string; name: string }[];
  onRemove: (photo: { url: string; name: string }) => void;
}

const SelectedPhotosPreview: React.FC<SelectedPhotosPreviewProps> = ({
  selectedPhotos,
  onRemove,
}) => {
  return (
    <div className="flex space-x-2 rounded-lg bg-gray-200 p-4">
      {selectedPhotos.map((photo) => (
        <div key={`preview-${photo.name}`} className="relative">
          <Image src={photo.url} alt={photo.name} className="h-12 w-12 rounded" />
          <button
            type="button"
            className="absolute right-0 top-0 rounded-full bg-red-500 p-1 text-white"
            onClick={() => onRemove(photo)}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
};

export default SelectedPhotosPreview;
