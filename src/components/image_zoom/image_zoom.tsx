import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FaPlus, FaMinus } from 'react-icons/fa6';
import { Button } from '@/components/button/button';

const MAGNIFICATION_MAX = 250;
const MAGNIFICATION_MIN = 100;

const ImageZoom = ({ imageUrl, className }: { imageUrl: string; className?: string }) => {
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
  // Info: (20250307 - Julian) 圖片的 ref
  const imageRef = useRef<HTMLImageElement>(null);

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
  const handleMouseOut = () => setIsZoomIn(false);

  // Info: (20250307 - Julian) 計算邊界範圍
  const getBoundedPosition = (x: number, y: number) => {
    if (!imageContainerRef.current || !imageRef.current) return { x, y };

    const container = imageContainerRef.current.getBoundingClientRect();
    const image = imageRef.current.getBoundingClientRect();

    // Info: (20250307 - Julian) X 軸最大值：0 或 (圖片寬度 - 容器寬度) / 2
    const maxX = Math.max(0, (image.width - container.width) / 2);
    // Info: (20250307 - Julian) Y 軸最大值：0 或 (圖片高度 - 容器高度) / 2
    const maxY = Math.max(0, (image.height - container.height) / 2);

    return {
      x: Math.min(maxX, Math.max(-maxX, x)), // Info: (20250307 - Julian) X 範圍：-maxX ~ maxX
      y: Math.min(maxY, Math.max(-maxY, y)), // Info: (20250307 - Julian) Y 範圍：-maxY ~ maxY
    };
  };

  // Info: (20250307 - Julian) 按下滑鼠：找到游標的起始位置，開始拖曳
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault(); // Info: (20250307 - Julian) 阻止拉動圖片的預設行為
    setDragging(true);
    setStartPos({ x: event.clientX - position.x, y: event.clientY - position.y });
  };

  // Info: (20250307 - Julian) 拖曳滑鼠：計算滑鼠的移動距離，更新圖片的位置
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;

    // Info: (20250307 - Julian) 新的 X 軸位置：滑鼠的 X 軸位置 - 起始 X 軸位置
    const newX = event.clientX - startPos.x;
    // Info: (20250307 - Julian) 新的 Y 軸位置：滑鼠的 Y 軸位置 - 起始 Y 軸位置
    const newY = event.clientY - startPos.y;
    setPosition(getBoundedPosition(newX, newY));
  };

  // Info: (20250307 - Julian) 放開滑鼠：停止拖曳
  const handleMouseUp = () => setDragging(false);

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
        handleZoomOut();
      } else if (mouseDeltaY < 0) {
        handleZoomIn();
      }
    }
  }, [mouseDeltaY]);

  return (
    <div className="flex flex-col">
      {/* Info: (20250307 - Julian) 縮放倍率 */}
      <div className="ml-auto flex items-center gap-12px py-16px text-button-stroke-secondary">
        <Button type="button" size="smallSquare" variant="tertiaryOutline" onClick={handleZoomIn}>
          <FaPlus />
        </Button>
        <p className="text-lg font-medium">{magnification} %</p>
        <Button type="button" size="smallSquare" variant="tertiaryOutline" onClick={handleZoomOut}>
          <FaMinus />
        </Button>
      </div>
      {/* Info: (20250307 - Julian) 圖片 */}
      <div
        ref={imageContainerRef}
        onMouseEnter={handleMouseIn}
        onMouseLeave={handleMouseOut}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative ${className} overflow-hidden ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ userSelect: 'none' }} // Info: (20250307 - Julian) 防止選取內容
      >
        <Image
          ref={imageRef}
          src={imageUrl}
          alt="certificate"
          fill
          objectFit="contain"
          style={{
            transform: `scale(${magnification / 100}) translate(${position.x}px, ${position.y}px)`,
            transition: dragging ? 'none' : 'transform 0.2s',
          }}
        />
      </div>
    </div>
  );
};

export default ImageZoom;
