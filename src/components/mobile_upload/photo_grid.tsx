import Image from 'next/image';
import React from 'react';
import { IFileWithUrl, UploadMode } from '@/components/mobile_upload/camera_with_frame';
import { Button } from '@/components/button/button';
import { MdArrowBack } from 'react-icons/md';

interface PhotoGridProps {
  selectedCertificates: IFileWithUrl[];
  onRemove: (file: IFileWithUrl) => void;
  setUploadMode: (mode: UploadMode) => void;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ selectedCertificates, onRemove, setUploadMode }) => {
  return (
    <>
      <div className="flex h-100px shrink-0 items-center bg-surface-neutral-solid-dark p-2">
        <Button
          className="p-2 text-stroke-neutral-invert"
          type="button"
          variant={null}
          onClick={() => {
            setUploadMode(UploadMode.CAMERA);
          }}
        >
          <MdArrowBack size={24} />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {selectedCertificates.map((file) => (
          <div key={file.name} className="relative">
            {/* 使用 next/image 顯示來自遠端的圖片 */}
            <Image
              src={file.url}
              alt={file.name}
              width={150}
              height={150}
              className="h-auto w-full rounded"
              onClick={() => {}} // TODO: open photo modal
            />
            <button
              type="button"
              className="absolute bottom-2 right-2 rounded-full bg-yellow-500 p-1"
            >
              +
            </button>
          </div>
        ))}
      </div>
      <div className="flex h-105px shrink-0 -translate-y-20px items-center justify-between rounded-t-lg bg-surface-neutral-solid-dark p-2">
        {selectedCertificates.map((file) => (
          <div key={file.name} className="relative">
            <Image src={URL.createObjectURL(file)} alt={file.name} className="h-12 w-12 rounded" />
            <button
              type="button"
              className="absolute right-0 top-0 rounded-full bg-red-500 p-1 text-white"
              onClick={() => onRemove(file)}
            >
              x
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

export default PhotoGrid;
