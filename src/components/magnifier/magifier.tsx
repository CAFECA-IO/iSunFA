import Image from 'next/image';
import React, { useRef, useState } from 'react';

type MagnifierProps = {
  imageUrl: string;
  width: number;
  height: number;
  magnifierSize?: number; // Info: (20241217 - tzuhan) 放大鏡的大小
  zoomLevel?: number; // Info: (20241217 - tzuhan) 放大倍數
  className?: string;
};

const Magnifier: React.FC<MagnifierProps> = ({
  imageUrl,
  width: imageWidth,
  height: imageHeight,
  magnifierSize = 150,
  zoomLevel = 2,
  className = '',
}) => {
  const [magnifierStyle, setMagnifierStyle] = useState<{
    display: string;
    top: string | number;
    left: string | number;
    backgroundPosition: string;
  }>({ display: 'none', top: 0, left: 0, backgroundPosition: '0% 0%' });
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;

    const { top, left, width, height } = imgRef.current.getBoundingClientRect();
    const offsetX = e.clientX - left; // Info: (20241217 - tzuhan) 滑鼠相對於圖片的 X 偏移量
    const offsetY = e.clientY - top; // Info: (20241217 - tzuhan) 滑鼠相對於圖片的 Y 偏移量

    const xPercent = (offsetX / width) * 100;
    const yPercent = (offsetY / height) * 100;

    // Info: (20241217 - tzuhan) 設置放大鏡位置，偏移量讓滑鼠游標在邊緣
    const magnifierOffset = 10; // Info: (20241217 - tzuhan) 放大鏡與滑鼠的間距
    // Deprecated: (20241217 - tzuhan) debug log
    // eslint-disable-next-line no-console
    console.log('e.clientX:', e.clientX, 'e.clientY:', e.clientY);
    setMagnifierStyle({
      display: 'block',
      top: `${e.clientX - magnifierOffset}px`,
      left: `${e.clientY - magnifierOffset}px`,
      backgroundPosition: `${xPercent}% ${yPercent}%`,
    });
  };

  const handleMouseLeave = () => {
    setMagnifierStyle({ ...magnifierStyle, display: 'none' });
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
        className="h-auto w-full select-none"
        width={imageWidth}
        height={imageHeight}
      />

      {/* Info: (20241217 - tzuhan) 放大鏡 */}
      <div
        className="pointer-events-none absolute rounded-full border-2 border-input-stroke-input"
        style={{
          ...magnifierStyle,
          width: `${magnifierSize}px`,
          height: `${magnifierSize}px`,
          backgroundImage: `url(${imageUrl})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${zoomLevel * 100}% ${zoomLevel * 100}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: 100,
        }}
      />
    </div>
  );
};

export default Magnifier;
