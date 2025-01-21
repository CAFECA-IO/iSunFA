import Image from 'next/image';
import React, { useRef, useState } from 'react';

type MagnifierProps = {
  imageUrl: string;
  useNaturalSize?: boolean; // Info: (20250107 - tzuhan) 是否使用原始尺寸
  magnifierSize?: number; // Info: (20241218 - tzuhan) 放大鏡的大小
  zoomLevelX?: number; // Info: (20241218 - tzuhan) X方向的放大倍數
  className?: string; // Info: (20241218 - tzuhan) 自訂樣式
};

const Magnifier: React.FC<MagnifierProps> = ({
  imageUrl,
  useNaturalSize = false,
  magnifierSize = 150,
  zoomLevelX = 3,
  className = '',
}) => {
  const [magnifierStyle, setMagnifierStyle] = useState({
    display: 'none ',
    top: '0px',
    left: '0px',
    backgroundPosition: '0% 0%',
    backgroundSize: '100% 100%',
  });

  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const { left, top, width, height } = rect;
    const zoomLevelY = (height / width) * zoomLevelX;

    // Info: (20250107 - tzuhan) 取得圖片的原始尺寸
    const { naturalWidth, naturalHeight } = imgRef.current;

    // Info: (20241218 - tzuhan) 滑鼠相對於圖片的位置
    const offsetX = e.clientX - left;
    const offsetY = e.clientY - top;

    // Info: (20241218 - tzuhan) 限制滑鼠在圖片範圍內
    if (offsetX < 0 || offsetY < 0 || offsetX > width || offsetY > height) return;

    // Info: (20241218 - tzuhan) 計算背景位置的百分比
    const xPercent = (offsetX / width) * 100;
    const yPercent = (offsetY / height) * 100;

    // Info: (20250107 - tzuhan) 使用原始尺寸計算放大後的背景尺寸
    const backgroundSizeX = (useNaturalSize ? naturalWidth : 200) * zoomLevelX;
    const backgroundSizeY = (useNaturalSize ? naturalHeight : 200) * zoomLevelY;

    const magnifierOffset = magnifierSize / 3;
    // Info: (20241218 - tzuhan) 更新放大鏡的樣式
    setMagnifierStyle({
      display: 'block',
      top: `${e.clientY - magnifierOffset}px`,
      left: `${e.clientX - magnifierOffset}px`,
      backgroundPosition: `${xPercent}% ${yPercent}%`,
      backgroundSize: `${backgroundSizeX}% ${backgroundSizeY}%`,
    });
  };

  const handleMouseLeave = () => {
    setMagnifierStyle((prev) => ({ ...prev, display: 'none ' }));
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Info: (20241217 - tzuhan) 原始圖片 */}
      <Image
        ref={imgRef}
        src={imageUrl}
        alt="Zoomable"
        className="mx-auto h-auto max-h-full max-w-full select-none object-contain"
        priority
      />

      {/* Info: (20241217 - tzuhan) 放大鏡 */}
      <div
        className="pointer-events-none fixed rounded-full border-2 border-input-stroke-input"
        style={{
          ...magnifierStyle,
          width: `${magnifierSize}px`,
          height: `${magnifierSize}px`,
          backgroundImage: `url(${imageUrl})`,
          backgroundRepeat: 'no-repeat',
          transform: 'translate(-50%, -50%)',
          zIndex: 100,
        }}
      />
    </div>
  );
};

export default Magnifier;
