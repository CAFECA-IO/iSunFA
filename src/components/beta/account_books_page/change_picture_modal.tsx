import { ChangeEvent, DragEvent, useCallback, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { IoCloseOutline } from 'react-icons/io5';
import Image from 'next/image';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { cn } from '@/lib/utils/common';

type CroppedAreaPixels = {
  width: number;
  height: number;
  x: number;
  y: number;
};

// Info: (20250430 - Liz) 裁切圖片的函式。使用 canvas 將圖片裁切成指定的區域，並轉換成 Blob 格式
const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: CroppedAreaPixels
): Promise<Blob | null> => {
  const image = new window.Image();
  image.src = imageSrc;

  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || null);
    }, 'image/jpeg');
  });
};

interface ChangePictureModalProps {
  closeModal: () => void;
  onSave: (croppedImage: Blob) => void;
}

const ChangePictureModal = ({ closeModal, onSave }: ChangePictureModalProps) => {
  const { t } = useTranslation(['account_book', 'common', 'certificate']);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null); // Info: (20250430 - Liz) 儲存選擇的圖片 base64 字串
  const [crop, setCrop] = useState({ x: 0, y: 0 }); // Info: (20250430 - Liz) 裁切的位置
  const [zoom, setZoom] = useState(1); // Info: (20250430 - Liz) 縮放比例
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null); // Info: (20250430 - Liz) 使用者選擇的裁切區域的像素資訊
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Info: (20250429 - Liz) 當裁切完成時，react-easy-crop 會呼叫這個 callback，將裁切區域的資料儲存起來，並產生 previewUrl
  // const onCropComplete = useCallback((_: unknown, croppedPixels: Area) => {
  //   setCroppedAreaPixels(croppedPixels);
  // }, []);
  const onCropComplete = useCallback(
    async (_: unknown, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
      if (imageSrc) {
        const croppedBlob = await getCroppedImg(imageSrc, croppedPixels);
        if (croppedBlob) {
          const preview = URL.createObjectURL(croppedBlob);
          setPreviewUrl(preview);
        }
      }
    },
    [imageSrc]
  );

  // Info: (20250429 - Liz) 讀取圖片檔案函式。使用 FileReader 把圖片轉成 base64，並更新到 imageSrc
  const readImageFile = (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
  };

  // Info: (20250429 - Liz) 處理選擇圖片。當使用者選擇檔案時，讀取圖片檔案
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readImageFile(file);
  };

  // Info: (20250429 - Liz) 拖曳上傳圖片
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) readImageFile(file);
    setIsDragging(false);
  };

  // Info: (20250429 - Liz) 拖曳圖片時，顯示拖曳區域的樣式
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);

  // Info: (20250429 - Liz) 儲存裁切結果
  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
    if (croppedImage) {
      onSave(croppedImage);
      closeModal();
    }
  };

  // Info: (20250429 - Liz) 移除已選圖片及預覽
  const handleRemove = () => {
    setImageSrc(null);
    setPreviewUrl(null);
  };

  // Info: (20250429 - Liz) 避免記憶體外洩，component unmount 時清除 blob URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col gap-24px rounded-lg bg-surface-neutral-surface-lv2 p-40px">
        <section className="flex items-center">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
            {t('account_book:UPLOAD_COMPANY_AVATAR_MODAL.TITLE')}
          </h1>
          <button type="button" onClick={closeModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>

        <section className="border-2 border-red-500">
          {imageSrc ? (
            <div className="relative h-256px w-full">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          ) : (
            <div
              className={cn(
                'flex h-320px w-320px flex-col items-center justify-center gap-20px rounded-md border border-dashed border-drag-n-drop-stroke-primary bg-drag-n-drop-surface-primary p-40px',
                {
                  'border-drag-n-drop-stroke-focus bg-drag-n-drop-surface-hover': isDragging,
                }
              )}
              onDrop={handleDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                ref={fileInputRef}
              />

              <Image src="/icons/upload_file.svg" width={55} height={60} alt="upload file icon" />

              <div className="flex items-center gap-4px">
                <span className="text-base font-medium text-drag-n-drop-text-primary">
                  {t('common:UPLOAD_AREA.DROP_YOUR_FILES_HERE_OR')}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-base font-medium text-link-text-primary"
                >
                  {t('common:UPLOAD_AREA.BROWSE')}
                </button>
              </div>

              <p className="text-sm font-medium text-drag-n-drop-text-note">
                {t('common:UPLOAD_AREA.MAXIMUM_SIZE')}
              </p>
            </div>
          )}

          {imageSrc && (
            <div className="flex items-center justify-center gap-4 border-2 border-lime-400">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(z + 0.1, 3))}
                className="rounded bg-gray-200 px-3 py-1"
              >
                +
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(z - 0.1, 1))}
                className="rounded bg-gray-200 px-3 py-1"
              >
                -
              </button>
            </div>
          )}
        </section>

        {/* Info: (20250429 - Liz) 預覽區塊 */}
        {imageSrc && previewUrl && (
          <div className="text-center">
            <p className="text-sm text-gray-600">Preview</p>
            <Image src={previewUrl} alt="Preview" width={96} height={96} />
          </div>
        )}

        <div className="flex justify-between">
          {imageSrc && (
            <button type="button" onClick={handleRemove} className="text-sm text-red-500">
              Remove Profile Picture
            </button>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={closeModal} className="rounded bg-gray-300 px-4 py-2">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ChangePictureModal;
