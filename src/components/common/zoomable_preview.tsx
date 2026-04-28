"use client";

import { useState, useRef, ReactNode, MouseEvent, TouchEvent } from "react";

import { useTranslation } from "@/i18n/i18n_context";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface IZoomablePreviewProps {
  children: ReactNode;
  fallbackText?: string;
  hasContent: boolean;
  className?: string;
}

export default function ZoomablePreview({
  children,
  fallbackText = undefined,
  hasContent,
  className = undefined,
}: IZoomablePreviewProps) {
  const { t } = useTranslation();

  // Info: (20260305 - Julian) zoom & drag state
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));

  const handleZoomOut = () => {
    setScale((s) => {
      const newScale = Math.max(s - 0.25, 0.5);
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  const handleZoomReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Info: (20260409 - Julian) 滑鼠的拖曳事件 (for desktop)
  const handleMouseDown = (e: MouseEvent) => {
    if (scale <= 1) return; // Info: (20260409 - Julian) 只有放大時才允許拖曳
    e.preventDefault(); // Info: (20260409 - Julian) 阻止預設行為
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleMouseLeave = () => {
    if (isDragging) setIsDragging(false);
  };

  // Info: (20260409 - Julian) 觸控的拖曳事件 (for mobile)
  const handleTouchStart = (e: TouchEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y,
    };
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.current.x,
      y: e.touches[0].clientY - dragStart.current.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  return (
    <div className={className}>
      <div className="relative flex size-full flex-col border-0 border-gray-200 bg-gray-100 p-0 lg:border-r lg:p-4">
        {/* Info: (20260305 - Julian) Zoom Controls */}
        <div className="absolute top-2 right-2 z-10 flex gap-2 rounded-lg bg-white/90 p-1 text-gray-400 shadow-sm backdrop-blur lg:top-6 lg:right-6">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            title={t("ocr.zoom_out") as string}
            className="enable:hover:bg-gray-200 rounded p-1.5 disabled:opacity-50"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={handleZoomReset}
            disabled={scale === 1}
            title={t("ocr.zoom_reset") as string}
            className="enable:hover:bg-gray-200 rounded p-1.5 disabled:opacity-50"
          >
            <Maximize size={16} />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 3}
            title={t("ocr.zoom_in") as string}
            className="enable:hover:bg-gray-200 rounded p-1.5 disabled:opacity-50"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        <div
          role="presentation"
          className={`flex flex-1 items-center justify-center overflow-hidden border-0 border-gray-200 bg-white p-0 lg:rounded-lg lg:border lg:p-4 ${
            scale > 1
              ? isDragging
                ? "cursor-grabbing touch-none select-none"
                : "cursor-grab touch-none"
              : ""
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onDragStart={(e) => e.preventDefault()}
        >
          {hasContent ? (
            <div
              className="flex size-full origin-center items-center justify-center transition-transform duration-200 will-change-transform"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                // Info: (20260305 - Julian) Disable transition during drag for smoothness
                transitionDuration: isDragging ? "0ms" : "200ms",
              }}
            >
              {children}
            </div>
          ) : (
            <span className="text-gray-400">{fallbackText}</span>
          )}
        </div>
      </div>
    </div>
  );
}
