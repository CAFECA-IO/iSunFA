import { useEffect } from 'react';

interface IProgressBarProps {
  progressRate: number;
  progressRateChangeHandler: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProgressBar = ({ progressRate, progressRateChangeHandler }: IProgressBarProps) => {
  useEffect(() => {
    // Info: (20240509 - Julian) 找到 sliderProgress 的 style element
    const styleElement = document.getElementById('sliderStyle');

    // Info: (20240509 - Julian) 如果有找到 style element，則更新 style element 的內容
    if (styleElement) {
      // Info: (20240509 - Julian) 將進度條的背景色設定為線性漸層，並根據進度比例設定顏色
      styleElement.innerHTML = `
        .sliderProgress::-webkit-slider-runnable-track {
          background: linear-gradient(90deg, #FFA502 ${progressRate}%, #cdd1d9 ${progressRate}%);
        }
      `;
    } else {
      // Info: (20240509 - Julian) 如果沒有找到 style element，則建立一個新的 style element
      const newStyleElement = document.createElement('style');
      newStyleElement.id = 'sliderStyle';
      newStyleElement.innerHTML = `
        .sliderProgress::-webkit-slider-runnable-track {
          background: linear-gradient(90deg, #FFA502 ${progressRate}%, #cdd1d9 ${progressRate}%);
        }
      `;
      // Info: (20240509 - Julian) 將新的 style element 加入到 document head
      document.head.appendChild(newStyleElement);
    }
  }, [progressRate]);

  return (
    <div className="flex w-full flex-col items-start gap-8px">
      <p className="text-sm font-semibold text-navyBlue2">Progress</p>
      <div className="flex w-full flex-col gap-x-20px gap-y-10px md:flex-row">
        {/* Info: (20240502 - Julian) Progress Bar */}
        <input
          id="sliderProgress"
          type="range"
          min={0}
          max={100}
          step={1}
          value={progressRate}
          onChange={progressRateChangeHandler}
          className="sliderProgress"
        />
        {/* Info: (20240502 - Julian) Progress Rate Input */}
        <div
          className={`flex h-46px w-full items-center justify-between divide-x divide-lightGray3 rounded-sm border border-lightGray3 bg-white transition-all duration-300 ease-in-out`}
        >
          <input
            id="inputProgressRate"
            type="number"
            name="inputProgressRate"
            value={progressRate}
            onChange={progressRateChangeHandler}
            min={0}
            max={100}
            className="flex-1 bg-transparent px-10px outline-none"
          />

          <div className="flex items-center gap-4px p-12px text-sm text-lightGray4">
            <p>%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
