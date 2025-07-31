import { ChangeEvent, DragEvent, useCallback, useState, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { IoCloseOutline } from 'react-icons/io5';
import { FaPlus, FaMinus } from 'react-icons/fa6';
import { FiTrash2, FiSave } from 'react-icons/fi';
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
  const { t } = useTranslation(['account_book', 'common']);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null); // Info: (20250430 - Liz) 儲存選擇的圖片 base64 字串
  const [crop, setCrop] = useState({ x: 0, y: 0 }); // Info: (20250430 - Liz) 裁切的位置
  const [zoom, setZoom] = useState(1); // Info: (20250430 - Liz) 縮放比例
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null); // Info: (20250430 - Liz) 使用者選擇的裁切區域的像素資訊
  const [isDragging, setIsDragging] = useState(false);

  // Info: (20250429 - Liz) 當裁切完成時，react-easy-crop 會呼叫這個 callback，將裁切區域的資料儲存起來，並產生 previewUrl
  const onCropComplete = useCallback((_: unknown, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

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

  // Info: (20250429 - Liz) 拖曳上傳圖片，當檔案被放到區域裡的時候觸發
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) readImageFile(file);
    setIsDragging(false);
  };

  // Info: (20250429 - Liz) 拖曳圖片時，顯示拖曳區域的樣式。只要拖曳的檔案移動到這個區域上方就會一直觸發
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  // Info: (20250430 - Liz) 拖曳檔案離開這個區域時觸發
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

  // Info: (20250429 - Liz) 移除已選圖片
  const handleRemove = () => {
    setImageSrc(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-90vw flex-col gap-lv-5 rounded-lg bg-surface-neutral-surface-lv2 px-20px py-16px tablet:w-400px tablet:p-40px">
        <section className="flex items-center">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-primary">
            {t('account_book:UPLOAD_COMPANY_AVATAR_MODAL.TITLE')}
          </h1>
          <button type="button" onClick={closeModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>

        <section className="flex flex-col gap-24px">
          {imageSrc ? (
            <div className="relative h-320px w-full">
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
                'relative flex flex-col items-center justify-center gap-20px overflow-hidden rounded-md border border-dashed border-drag-n-drop-stroke-primary bg-drag-n-drop-surface-primary p-40px hover:cursor-pointer hover:border-drag-n-drop-stroke-focus hover:bg-drag-n-drop-surface-hover tablet:h-320px tablet:w-320px',
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

              <div className="flex flex-col items-center gap-4px text-center text-sm font-medium tablet:text-base">
                <p className="text-drag-n-drop-text-primary">
                  {t('common:UPLOAD_AREA.DROP_YOUR_FILES_HERE_OR')}
                  <span className="text-link-text-primary">{t('common:UPLOAD_AREA.BROWSE')}</span>
                </p>

                <p className="text-xs text-drag-n-drop-text-note tablet:text-sm">
                  {t('common:UPLOAD_AREA.MAXIMUM_SIZE')}
                </p>
              </div>

              {/* Info: (20250624 - Julian) 按鈕區域，點擊時觸發檔案選擇 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute h-full w-full"
              ></button>
            </div>
          )}

          {imageSrc && (
            <div className="flex items-center justify-center gap-12px px-20px">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(z + 0.1, 3))}
                className="rounded-xs border border-button-stroke-secondary p-10px text-button-text-secondary"
              >
                <FaPlus size={16} />
              </button>
              <span>{Math.round(zoom * 100)} %</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(z - 0.1, 1))}
                className="rounded-xs border border-button-stroke-secondary p-10px text-button-text-secondary"
              >
                <FaMinus size={16} />
              </button>
            </div>
          )}
        </section>

        {/* Info: (20250430 - Liz) Footer Buttons */}
        <section className="flex items-center justify-between">
          {imageSrc && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-4px text-sm font-medium text-button-text-secondary"
            >
              <FiTrash2 size={16} />
              <span className="text-start">
                {t('account_book:UPLOAD_COMPANY_AVATAR_MODAL.REMOVE_PICTURE')}
              </span>
            </button>
          )}

          <div className="ml-auto flex items-center gap-12px">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary"
            >
              <span>{t('common:COMMON.CANCEL')}</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert"
            >
              <span>{t('common:COMMON.SAVE')}</span>
              <FiSave size={16} />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ChangePictureModal;
