import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FaPlus, FaMinus } from 'react-icons/fa6';
import { Button } from '@/components/button/button';

const MAGNIFICATION_MAX = 500;
const MAGNIFICATION_MIN = 100;

const ImageZoom = ({
  imageUrl,
  className,
  controlPosition = 'top-right', // Info: (20250428 - Anna) 預設位置右上角
}: {
  imageUrl: string;
  className?: string;
  controlPosition?: 'top-right' | 'bottom-right' | 'bottom-center'; // Info: (20250527 - Anna) 可選為位置右上角 or 右下角 or 下方中間
}) => {
  // Info: (20250307 - Julian) 縮放倍率
  const [magnification, setMagnification] = useState<number>(100);
  // Info: (20250307 - Julian) 是否處於縮放狀態(滑鼠是否在圖片上)
  const [isZoomIn, setIsZoomIn] = useState<boolean>(false);
  // Info: (20250307 - Julian) 滑鼠滾輪的 deltaY
  const [mouseDeltaY, setMouseDeltaY] = useState<number>(0);
  // Info: (20250307 - Julian) 是否正在拖曳
  const [dragging, setDragging] = useState(false);
  // Info: (20250307 - Julian) 圖片的位置
  const [position, setPosition] = useState({ x: 0, y: 0 });
  // Info: (20250307 - Julian) 拖曳的起始位置
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // Info: (20250307 - Julian) 圖片容器的 ref
  const imageContainerRef = useRef<HTMLDivElement>(null);
  // Info: (20250310 - Julian) 圖片的 ref
  const imageRef = useRef<HTMLImageElement>(null);

  // Info: (20250310 - Julian) ==================== 縮放 ====================
  // Info: (20250307 - Julian) 控制縮放倍率
  const handleZoomIn = () => {
    setMagnification((prev) => {
      // Info: (20250307 - Julian) 限制縮放倍率最大為 250%
      const newMagnification = Math.min(prev + 50, MAGNIFICATION_MAX);
      // Info: (20250307 - Julian) 當縮放倍率為 100% 時，重置圖片位置
      if (newMagnification === MAGNIFICATION_MIN) setPosition({ x: 0, y: 0 });
      return newMagnification;
    });
  };
  const handleZoomOut = () => {
    setMagnification((prev) => {
      // Info: (20250307 - Julian) 限制縮放倍率最小為 100%
      const newMagnification = Math.max(prev - 50, MAGNIFICATION_MIN);
      // Info: (20250307 - Julian) 當縮放倍率為 100% 時，重置圖片位置
      if (newMagnification === MAGNIFICATION_MIN) setPosition({ x: 0, y: 0 });
      return newMagnification;
    });
  };

  // Info: (20250307 - Julian) 滑鼠位於圖片上時才執行縮放
  const handleMouseIn = () => setIsZoomIn(true);
  // Info: (20250310 - Julian) 滑鼠離開圖片時，停止縮放和拖曳，並重置滾輪 deltaY
  const handleMouseOut = () => {
    setIsZoomIn(false);
    setDragging(false);
    setMouseDeltaY(0);
  };

  // Info: (20250310 - Julian) ==================== 拖曳 ====================
  // Info: (20250307 - Julian) 按下滑鼠：找到游標的起始位置，開始拖曳
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault(); // Info: (20250307 - Julian) 阻止拉動圖片的預設行為
    setDragging(true);
    setStartPos({ x: event.clientX - position.x, y: event.clientY - position.y });
  };

  // Info: (20250310 - Julian) 計算拖曳邊界，避免圖片超出容器
  const getBoundedPosition = (x: number, y: number) => {
    if (!imageContainerRef.current || !imageRef.current) return { x, y };

    const container = imageContainerRef.current.getBoundingClientRect();
    const image = imageRef.current.getBoundingClientRect();

    // Info: (20250310 - Julian) 圖片的最大移動範圍: (圖片寬度 - 容器寬度) / 2
    const maxX = Math.max(0, (image.width - container.width) / 2);
    const maxY = Math.max(0, (image.height - container.height) / 2);

    return {
      x: Math.min(maxX, Math.max(-maxX, x)), // Info: (20250310 - Julian) 限制拖曳範圍: -maxX <= x <= maxX
      y: Math.min(maxY, Math.max(-maxY, y)), // Info: (20250310 - Julian) 限制拖曳範圍: -maxY <= y <= maxY
    };
  };

  // Info: (20250307 - Julian) 拖曳滑鼠：計算滑鼠的移動距離，更新圖片的位置
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;

    // Info: (20250310 - Julian) 新的 X 軸位置：滑鼠的 X 軸位置 - 起始 X 軸位置
    const newX = event.clientX - startPos.x;
    // Info: (20250310 - Julian) 新的 Y 軸位置：滑鼠的 Y 軸位置 - 起始 Y 軸位置
    const newY = event.clientY - startPos.y;

    setPosition(getBoundedPosition(newX, newY));
  };

  // Info: (20250307 - Julian) 放開滑鼠：停止拖曳
  const handleMouseUp = () => setDragging(false);

  // Info: (20250310 - Julian) ==================== 監聽事件 ====================
  useEffect(() => {
    // Info: (20250307 - Julian) 紀錄滑鼠滾輪的 deltaY
    const handleWheel = (event: WheelEvent) => {
      if (!isZoomIn) return; // Info: (20250307 - Julian) 滑鼠不在圖片上時，不追蹤滾輪
      setMouseDeltaY(event.deltaY);
    };

    window.addEventListener('wheel', handleWheel);
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isZoomIn]);

  useEffect(() => {
    if (isZoomIn) {
      if (mouseDeltaY > 0) {
        handleZoomOut(); // Info: (20250307 - Julian) 滑鼠往下滾動，縮小圖片
      } else if (mouseDeltaY < 0) {
        handleZoomIn(); // Info: (20250307 - Julian) 滑鼠往上滾動，放大圖片
      }
    }
  }, [mouseDeltaY]);

  useEffect(() => {
    // Info: (20250310 - Julian) 縮放時，重新計算圖片的位置，避免超出範圍
    const newPosition = getBoundedPosition(position.x, position.y);
    setPosition(newPosition);
  }, [magnification]);

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Info: (20250307 - Julian) 縮放倍率 */}
      <div
        className={`${controlPosition === 'top-right' ? 'ml-auto py-16px' : ''} ${controlPosition === 'bottom-right' ? 'absolute bottom-0 right-0 m-16px' : ''} ${controlPosition === 'bottom-center' ? 'absolute -bottom-20 left-1/2 m-16px -translate-x-1/2' : ''} hidden items-center gap-12px text-button-stroke-secondary tablet:flex`}
      >
        <Button
          type="button"
          size="smallSquare"
          variant="tertiaryOutline"
          onClick={handleZoomIn}
          disabled={magnification === MAGNIFICATION_MAX}
        >
          <FaPlus />
        </Button>
        <p className="whitespace-nowrap text-lg font-medium">{magnification} %</p>
        <Button
          type="button"
          size="smallSquare"
          variant="tertiaryOutline"
          onClick={handleZoomOut}
          disabled={magnification === MAGNIFICATION_MIN}
        >
          <FaMinus />
        </Button>
      </div>
      {/* Info: (20250307 - Julian) 圖片外層容器 */}
      <div
        ref={imageContainerRef}
        onMouseEnter={handleMouseIn}
        onMouseLeave={handleMouseOut}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative ${className} overflow-hidden p-2 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ userSelect: 'none' }} // Info: (20250307 - Julian) 防止選取內容
      >
        {/* Info: (20250307 - Julian) 圖片 */}
        <Image
          ref={imageRef}
          src={imageUrl}
          alt="certificate"
          fill
          objectFit="contain"
          style={{
            transform: `scale(${magnification / 100})`,
            transformOrigin: 'center center',
            position: 'absolute',
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        />
      </div>
    </div>
  );
};

export default ImageZoom;
