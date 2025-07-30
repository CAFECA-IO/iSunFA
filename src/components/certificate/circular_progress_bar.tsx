import React from 'react';

interface CircularProgressBarProps {
  size: number; // Info: (20240926 - tzuhan) 圓形直徑
  progress: number; // Info: (20240926 - tzuhan) 進度百分比
  strokeWidth: number; // Info: (20240926 - tzuhan) 線條寬度
  remainingText: string; // Info: (20240926 - tzuhan) 顯示的剩餘文字
}

const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
  size,
  progress,
  strokeWidth,
  remainingText,
}) => {
  // Info: (20240926 - tzuhan) 圓的周長
  // const radius = (size - strokeWidth) / 2;
  // const circumference = radius * 2 * Math.PI;

  // Info: (20240926 - tzuhan) 根據進度計算 dashoffset
  // const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center">
      <div
        // Info: (20250627 - Julian) @tzuhan 我用 CSS 重寫了這個元件，和原本 SVG 的差別在於
        // 1. 缺少圓形端點 => 但尺寸很小的時候看不出來
        // 2. 圖形實際上不是真的圓圈，而是一個使用 conic-gradient 的大圓和白色的小圓組成，如果使用在白色背景以外的地方就會穿幫
        // => 如果之後有其他地方要用，也許可以新增一個 backgroundColor 屬性來解決這個問題
        style={{
          width: `${size}px`, // Info: (20250627 - Julian) 圓圈直徑
          height: `${size}px`, // Info: (20250627 - Julian) 圓圈直徑
          aspectRatio: '1',
          border: `${strokeWidth}px solid transparent`, // Info: (20250627 - Julian) 進度條的寬度
          background: `linear-gradient(white, white) padding-box,
            conic-gradient(#FFA502 ${progress}%, #D9D9D9 0%) border-box`, // Info: (20250627 - Julian) 進度條顏色
          borderRadius: '50%',
          transition: 'all 0.3s ease-in-out',
        }}
      ></div>
      <span className="ml-2 font-semibold text-text-neutral-primary">{remainingText}</span>
    </div>
  );
};

export default CircularProgressBar;
