interface IProgressBarProps {
  progressRate: number;
  progressRateChangeHandler: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProgressBar = ({ progressRate, progressRateChangeHandler }: IProgressBarProps) => {
  return (
    <div className="flex w-full flex-col items-start gap-8px">
      <p className="text-sm font-semibold text-navyBlue2">Progress</p>
      <div className="flex w-full flex-col gap-x-20px gap-y-10px md:flex-row">
        {/* Info: (20240502 - Julian) Progress Bar */}
        <input
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
