import { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import NumericInput from '@/components/numeric_input/numeric_input';

interface IProgressBarProps {
  progressRate: number;
  setProgressRate: React.Dispatch<React.SetStateAction<number>>;
}

const ProgressBar = ({ progressRate, setProgressRate }: IProgressBarProps) => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);

  useEffect(() => {
    // Info: (20240509 - Julian) 找到 sliderProgress 的 style element
    const styleElement = document.getElementById('sliderStyle');

    // Info: (20240509 - Julian) 如果有找到 style element，則更新 style element 的內容
    if (styleElement) {
      // Info: (20240509 - Julian) 將進度條的背景色設定為線性漸層，並根據進度比例設定顏色
      styleElement.textContent = `
        .sliderProgress::-webkit-slider-runnable-track {
          background: linear-gradient(90deg, #FFA502 ${progressRate}%, #cdd1d9 ${progressRate}%);
        }
      `;
    } else {
      // Info: (20240509 - Julian) 如果沒有找到 style element，則建立一個新的 style element
      const newStyleElement = document.createElement('style');
      newStyleElement.id = 'sliderStyle';
      newStyleElement.textContent = `
        .sliderProgress::-webkit-slider-runnable-track {
          background: linear-gradient(90deg, #FFA502 ${progressRate}%, #cdd1d9 ${progressRate}%);
        }
      `;
      // Info: (20240509 - Julian) 將新的 style element 加入到 document head
      document.head.appendChild(newStyleElement);
    }
  }, [progressRate]);

  // Info: (20240509 - Julian) 進度條變更事件
  const progressRateChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = Number(e.target.value);
    if (!Number.isNaN(input)) {
      // Info: (20240425 - Julian) 限制輸入範圍 0 ~ 100
      if (input <= 100 && input >= 0) {
        setProgressRate(input);
      }
    }
  };

  return (
    <div className="flex w-full flex-col items-start gap-8px">
      <p className="text-sm font-semibold text-input-text-primary">{t('common:COMMON.PROGRESS')}</p>
      <div className="flex w-full flex-col gap-x-20px gap-y-10px md:flex-row">
        {/* Info: (20240502 - Julian) Progress Bar */}
        <input
          id="slider-progress"
          name="slider-progress"
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
          className={`flex h-46px w-full items-center justify-between divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background transition-all duration-300 ease-in-out`}
        >
          <NumericInput
            id="input-progress-rate"
            name="input-progress-rate"
            value={progressRate}
            setValue={setProgressRate}
            onChange={progressRateChangeHandler}
            min={0}
            max={100}
            className="flex-1 bg-transparent px-10px outline-none"
          />
          <div className="flex items-center gap-4px p-12px text-sm text-input-text-input-placeholder">
            <p>%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
