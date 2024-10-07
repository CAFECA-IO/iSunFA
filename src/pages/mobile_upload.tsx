// /pages/page2.tsx
import { Button } from '@/components/button/button';
import Image from 'next/image';
import { useState } from 'react';

interface ImageData {
  url: string;
  status: string;
}

const MobileUpload = () => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<ImageData[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedImages(Array.from(e.target.files));
    }
  };

  const uploadImages = async () => {
    setIsUploading(true);

    const imageUploads = await Promise.all(
      selectedImages.map(async (image) => {
        try {
          // 模擬上傳圖片並獲得 URL
          const url = URL.createObjectURL(image);
          return { url, status: 'success' };
        } catch (error) {
          return { url: '', status: 'failed' };
        }
      })
    );

    setUploadedImages(imageUploads);

    // 發送圖片和對應的狀態到伺服器
    try {
      const response = await fetch('/api/v2/pusher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: imageUploads }),
      });

      if (!response.ok) {
        throw new Error('Failed to send images');
      }
    } catch (error) {
      // Deprecated: (20241004 - tzuhan) Debugging purpose only
      // eslint-disable-next-line no-console
      console.log('Error sending images:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h1>Upload Images</h1>
      <input type="file" accept="image/*" multiple onChange={handleImageChange} />
      <Button onClick={uploadImages} disabled={isUploading || selectedImages.length === 0}>
        {isUploading ? 'Uploading...' : 'Send Images'}
      </Button>
      <div>
        <h2>Uploaded Images</h2>
        {uploadedImages.map((image, index) => (
          <div key={`pusher_mobile_${index + 1}`}>
            {image.status === 'success' ? (
              <Image src={image.url} alt={`Uploaded Image ${index}`} width={200} height={200} />
            ) : (
              <p>Image {index + 1} upload failed</p>
            )}
            <p>Status: {image.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileUpload;
