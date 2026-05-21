import { useTranslation } from "@/i18n/i18n_context";
import { formatDate } from "@/lib/utils/date";

export default function UsedStamp({
  className = "",
  usedAt = null,
}: {
  className?: string;
  usedAt?: Date | string | null;
}) {
  const { t } = useTranslation();
  return (
    <div className={`pointer-events-none select-none ${className}`}>
      <svg
        width="140"
        height="140"
        viewBox="0 0 140 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-80 mix-blend-multiply"
      >
        <circle
          cx="70"
          cy="70"
          r="62"
          stroke="#DC2626"
          strokeWidth="4"
          strokeDasharray="8 6"
          opacity="0.8"
        />
        <circle
          cx="70"
          cy="70"
          r="54"
          stroke="#DC2626"
          strokeWidth="2"
          opacity="0.6"
        />
        <g transform="rotate(-20 70 70)">
          <text
            x="72"
            y={usedAt ? "66" : "78"}
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="24"
            fontWeight="900"
            fill="#DC2626"
            textAnchor="middle"
            letterSpacing="4"
          >
            {t("user_coupon.status.used")}
          </text>
          {usedAt && (
            <text
              x="70"
              y="86"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="8"
              fontWeight="700"
              fill="#DC2626"
              textAnchor="middle"
              letterSpacing="1"
            >
              {formatDate(usedAt, "yyyy-MM-dd HH:mm")}
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
