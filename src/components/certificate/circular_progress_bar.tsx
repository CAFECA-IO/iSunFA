import React from 'react';

interface CircularProgressBarProps {
  size: number; // 圓形直徑
  progress: number; // 進度百分比
  strokeWidth: number; // 線條寬度
  remainingText: string; // 顯示的剩餘文字
}

const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
  size,
  progress,
  strokeWidth,
  remainingText,
}) => {
  // 圓的周長
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // 根據進度計算 dashoffset
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#D9D9D9" // 背景圓的顏色
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#FFA502" // 進度條的顏色
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round" // 圓形端點
        />
      </svg>
      <span className="ml-2 font-semibold text-gray-800">{remainingText}</span>
    </div>
  );
};

export default CircularProgressBar;
