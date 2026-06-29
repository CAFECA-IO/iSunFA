import { useState, useCallback, useRef, useEffect } from "react";

export interface IPosition {
  x: number;
  y: number;
}

export interface IUseZoomPanOptions {
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
}

const DEFAULT_MIN_SCALE = 0.3;
const DEFAULT_MAX_SCALE = 3;
const DEFAULT_INITIAL_SCALE = 1;
const DEFAULT_ZOOM_STEP = 0.15;

// Info: (20260629 - Julian) 縮放/平移 Hook
export const useZoomPan = (options: IUseZoomPanOptions = {}) => {
  const {
    initialScale = DEFAULT_INITIAL_SCALE,
    minScale = DEFAULT_MIN_SCALE,
    maxScale = DEFAULT_MAX_SCALE,
  } = options;

  const [scale, setScale] = useState<number>(initialScale);
  const [position, setPosition] = useState<IPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<IPosition>({ x: 0, y: 0 });

  // Info: (20260629 - Julian) 使用 ref 來儲存最新狀態，避免事件處理器重建問題
  const stateRef = useRef({ position, isDragging, dragStart, scale });

  useEffect(() => {
    stateRef.current = { position, isDragging, dragStart, scale };
  }, [position, isDragging, dragStart, scale]);

  // Info: (20260629 - Julian) 放大 scale
  const zoomIn = useCallback(
    (e?: React.MouseEvent | MouseEvent) => {
      e?.stopPropagation();
      setScale((prev) => Math.min(maxScale, prev + DEFAULT_ZOOM_STEP));
    },
    [maxScale],
  );

  // Info: (20260629 - Julian) 縮小 scale
  const zoomOut = useCallback(
    (e?: React.MouseEvent | MouseEvent) => {
      e?.stopPropagation();
      setScale((prev) => Math.max(minScale, prev - DEFAULT_ZOOM_STEP));
    },
    [minScale],
  );

  // Info: (20260629 - Julian) 重置 scale & position
  const resetZoom = useCallback(
    (e?: React.MouseEvent | MouseEvent) => {
      e?.stopPropagation();
      setScale(initialScale);
      setPosition({ x: 0, y: 0 });
    },
    [initialScale],
  );

  // Info: (20260629 - Julian) 手動拖曳控制器，供原生事件監聽使用 (如 mermaid_chart.tsx)
  const startDrag = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({
      x: clientX - stateRef.current.position.x,
      y: clientY - stateRef.current.position.y,
    });
  }, []);

  // Info: (20260629 - Julian) 更新拖曳點
  const updateDrag = useCallback((clientX: number, clientY: number) => {
    if (!stateRef.current.isDragging) return;
    setPosition({
      x: clientX - stateRef.current.dragStart.x,
      y: clientY - stateRef.current.dragStart.y,
    });
  }, []);

  // Info: (20260629 - Julian) 停止拖曳
  const endDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Info: (20260629 - Julian) ==== React 合成事件處理器 ====
  // Info: (20260629 - Julian) 鼠標按下事件
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; //Info: (20260629 - Julian) 僅限左鍵
      startDrag(e.clientX, e.clientY);
    },
    [startDrag],
  );

  // Info: (20260629 - Julian) 鼠標移動事件
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      updateDrag(e.clientX, e.clientY);
    },
    [updateDrag],
  );

  // Info: (20260629 - Julian) 鼠標放開或移出事件
  const handleMouseUpOrLeave = useCallback(() => {
    endDrag();
  }, [endDrag]);

  // Info: (20260629 - Julian) 觸控開始事件
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY);
    },
    [startDrag],
  );

  // Info: (20260629 - Julian) 觸控移動事件
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      updateDrag(touch.clientX, touch.clientY);
    },
    [updateDrag],
  );

  return {
    scale,
    setScale,
    position,
    setPosition,
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    stateRef,
    zoomIn,
    zoomOut,
    resetZoom,
    startDrag,
    updateDrag,
    endDrag,
    dragHandlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUpOrLeave,
      onMouseLeave: handleMouseUpOrLeave,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleMouseUpOrLeave,
    },
  };
};
