"use client";

import { useState, useRef, ReactNode } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface IZoomablePreviewProps {
  children: ReactNode;
  fallbackText?: string;
  hasContent: boolean;
}

export default function ZoomablePreview({
  children,
  fallbackText,
  hasContent,
}: IZoomablePreviewProps) {
  const { t } = useTranslation();

  // zoom & drag state
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return; // Only allow drag when zoomed in
    e.preventDefault(); // Prevent native image drag & text selection
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
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

  return (
    <div className="relative flex w-1/2 flex-col border-r border-gray-200 bg-gray-100 p-4">
      {/* Zoom Controls */}
      <div className="absolute top-6 right-6 z-10 flex gap-2 rounded-lg bg-white/90 p-1 shadow-sm backdrop-blur">
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
        className={`flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white p-4 ${
          scale > 1
            ? isDragging
              ? "cursor-grabbing select-none"
              : "cursor-grab"
            : ""
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDragStart={(e) => e.preventDefault()}
      >
        {hasContent ? (
          <div
            className="origin-center transition-transform duration-200 will-change-transform"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              // Disable transition during drag for smoothness
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
  );
}
