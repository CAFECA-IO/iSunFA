interface IProgressCircleProps {
  size: number;
  progress: number;
  color: string;
}

const ProgressCircle = ({ size, progress, color }: IProgressCircleProps) => {
  const textX = progress < 10 ? 70 : progress < 100 ? 53 : 43;
  const validProgress = progress > 100 ? 100 : progress < 0 ? 0 : progress;

  return (
    <svg width={size} height={size} viewBox="0 0 182 173">
      <defs>
        <clipPath id="arch">
          <path d="M2.22936 107.558C5.15161 122.249 11.6845 135.934 21.1823 147.403C24.1544 150.992 29.5316 150.968 32.8266 147.673C36.1217 144.378 36.0775 139.063 33.1814 135.412C23.2853 122.938 17.3749 107.159 17.3749 90C17.3749 49.6142 50.1141 16.875 90.4999 16.875C130.886 16.875 163.625 49.6142 163.625 90C163.625 107.159 157.715 122.938 147.819 135.412C144.922 139.063 144.878 144.378 148.173 147.673C151.468 150.968 156.846 150.992 159.818 147.403C169.316 135.933 175.848 122.249 178.771 107.558C182.243 90.0998 180.461 72.0038 173.649 55.5585C166.837 39.1131 155.302 25.0571 140.501 15.1677C125.701 5.27841 108.3 1.06133e-07 90.5 0C72.6997 -1.06133e-07 55.2991 5.27841 40.4987 15.1677C25.6983 25.0571 14.1628 39.1131 7.35088 55.5585C0.538996 72.0038 -1.2433 90.0998 2.22936 107.558Z" />
        </clipPath>
      </defs>

      <g id="progress-bar" clipPath="url(#arch)">
        {/* Info:(20240612 - Julian) background */}
        <circle r="80" cx="90" cy="90" fill="transparent" stroke="#CDD1D9" strokeWidth="22" />

        {/* Info:(20240612 - Julian) progress */}
        <circle
          r="80"
          cx="90"
          cy="90"
          fill="transparent"
          stroke={color}
          strokeWidth="22"
          strokeDasharray={`${validProgress * 4} 999999`}
          strokeLinecap="round"
          transform="rotate(130 90 90)"
        />
      </g>

      <text
        id="percentage"
        x={textX}
        y="170"
        fill="#27354E"
        fontSize="44"
        fontWeight="600"
        fontFamily="Barlow"
      >
        {progress}%
      </text>
    </svg>
  );
};

export default ProgressCircle;
