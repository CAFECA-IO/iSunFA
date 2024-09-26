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
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Info: (20240926 - tzuhan) 根據進度計算 dashoffset
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#D9D9D9" // Info: (20240926 - tzuhan) 背景圓的顏色
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#FFA502" // Info: (20240926 - tzuhan) 進度條的顏色
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round" // Info: (20240926 - tzuhan) 圓形端點
        />
      </svg>
      <span className="ml-2 font-semibold text-gray-800">{remainingText}</span>
    </div>
  );
};

export default CircularProgressBar;
