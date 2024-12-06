const compressWithQuality = async (
  canvas: HTMLCanvasElement,
  fileType: string,
  quality: number
): Promise<Blob | null> => {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, fileType, quality);
  });
};

const compressImageRecursively = async (
  minQuality: number,
  maxQuality: number,
  targetSize: number,
  canvas: HTMLCanvasElement,
  fileType: string,
  attempt: number = 0, // Info: (20241206 - tzuhan) 避免無窮迴圈
  maxAttempts: number = 20 // Info: (20241206 - tzuhan) 最大嘗試次數
): Promise<Blob> => {
  // Deprecated: (20241206 - tzuhan) for debug purpose
  // eslint-disable-next-line no-console
  console.log('Info: (20241206 - tzuhan) 嘗試次數:', attempt, '質量範圍:', minQuality, maxQuality);

  const quality = (minQuality + maxQuality) / 2;

  // Deprecated: (20241206 - tzuhan) for debug purpose
  // eslint-disable-next-line no-console
  console.log('Info: (20241206 - tzuhan) 嘗試次數:', attempt, '質量:', quality);
  const compressedBlob = await compressWithQuality(canvas, fileType, quality);

  if (!compressedBlob) {
    throw new Error('Info: (20241206 - tzuhan) 壓縮失敗，無法生成 Blob');
  }

  // Info: (20241206 - tzuhan) 停止條件：當嘗試次數達到上限或質量範圍足夠小時退出
  if (attempt >= maxAttempts || maxQuality - minQuality < 0.0005) {
    return compressedBlob;
  }

  // Deprecated: (20241206 - tzuhan) for debug purpose
  // eslint-disable-next-line no-console
  console.log(
    'Info: (20241206 - tzuhan) 壓縮後大小:',
    compressedBlob.size,
    '目標大小*1.1:',
    targetSize * 1.1,
    '目標大小*0.9:',
    targetSize * 0.9
  );

  if (compressedBlob.size > targetSize * 1.1) {
    // Info: (20241206 - tzuhan) 壓縮結果過大，減小質量
    return compressImageRecursively(
      minQuality,
      quality - 0.01,
      targetSize,
      canvas,
      fileType,
      attempt + 1
    );
  } else if (compressedBlob.size < targetSize * 0.9) {
    // Info: (20241206 - tzuhan) 壓縮結果過小，增加質量
    return compressImageRecursively(
      quality + 0.01,
      maxQuality,
      targetSize,
      canvas,
      fileType,
      attempt + 1
    );
  } else {
    // Info: (20241206 - tzuhan) 壓縮成功，返回壓縮後 Blob
    return compressedBlob;
  }
};

export const compressImageToTargetSize = async (
  file: File,
  targetSize = 1 * 1024 * 1024, // Info: (20241206 - tzuhan) 默認壓縮目標大小 1MB
  maxWidth = 2048, // Info: (20241206 - tzuhan) 最大寬度
  maxHeight = 2048 // Info: (20241206 - tzuhan) 最大高度
): Promise<{ file: File; previewUrl: string }> => {
  let compressedFile = file;
  let previewUrl = URL.createObjectURL(file);

  try {
    // Deprecated: (20241206 - tzuhan) for debug purpose
    // eslint-disable-next-line no-console
    console.log('Info: (20241206 - tzuhan) 原始文件大小:', file.size, '目標大小:', targetSize);
    if (file.size > targetSize) {
      const image = new Image();

      // Info: (20241206 - tzuhan) 加載圖片
      const imageLoadPromise = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = URL.createObjectURL(file);
      });
      await imageLoadPromise;

      // Info: (20241206 - tzuhan) 計算壓縮後的尺寸
      const canvas = document.createElement('canvas');
      let { width, height } = image;
      // Deprecated: (20241206 - tzuhan) for debug purpose
      // eslint-disable-next-line no-console
      console.log('Info: (20241206 - tzuhan) 原始寬度:', width, '高度:', height);

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          width = maxWidth;
          height = Math.floor((image.height * maxWidth) / image.width);
        } else {
          height = maxHeight;
          width = Math.floor((image.width * maxHeight) / image.height);
        }
      }

      canvas.width = width;
      canvas.height = height;
      // Deprecated: (20241206 - tzuhan) for debug purpose
      // eslint-disable-next-line no-console
      console.log('Info: (20241206 - tzuhan) Canvas 寬度:', canvas.width, '高度:', canvas.height);

      // Info: (20241206 - tzuhan) 繪製圖片到 Canvas
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(image, 0, 0, width, height);

      // Info: (20241206 - tzuhan) 將尺寸壓縮後的圖片轉換為 Blob
      const resizedBlob = await compressWithQuality(canvas, file.type, 1);

      if (!resizedBlob) {
        throw new Error('Failed to resize image');
      }
      // Deprecated: (20241206 - tzuhan) for debug purpose
      // eslint-disable-next-line no-console
      console.log(`Resized image: ${resizedBlob.size} bytes`);

      // Info: (20241206 - tzuhan) 檢查尺寸壓縮後的文件大小
      if (resizedBlob.size <= targetSize) {
        // Deprecated: (20241206 - tzuhan) for debug purpose
        // eslint-disable-next-line no-console
        console.log(`Resized image is already smaller than target: ${resizedBlob.size} bytes`);
        compressedFile = new File([resizedBlob], file.name, { type: file.type });
        previewUrl = URL.createObjectURL(resizedBlob);
      } else {
        // Info: (20241206 - tzuhan) 如果尺寸壓縮後大小仍然超過目標，進行質量壓縮
        // Deprecated: (20241206 - tzuhan) for debug purpose
        // eslint-disable-next-line no-console
        console.log('Proceeding to quality compression...');

        // Info: (20241206 - tzuhan) 二分法壓縮至目標大小
        const compressedBlob = await compressImageRecursively(
          0.05,
          0.95,
          targetSize,
          canvas,
          file.type
        );

        // Deprecated: (20241206 - tzuhan) for debug purpose
        // eslint-disable-next-line no-console
        console.log('Info: (20241206 - tzuhan) 壓縮後 Blob 大小:', compressedBlob.size);
        // Info: (20241206 - tzuhan) 創建壓縮後的文件
        compressedFile = new File([compressedBlob], file.name, { type: file.type });
        previewUrl = URL.createObjectURL(compressedBlob);
      }
    }
  } catch (error) {
    // Deprecated: (20241206 - tzuhan) for debug purpose
    // eslint-disable-next-line no-console
    console.error('Info: (20241206 - tzuhan) 壓縮失敗:', error);
  }

  return { file: compressedFile, previewUrl };
};
