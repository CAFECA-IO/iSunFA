"use client";

import { FC } from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import {
  MOVEMENT_ALERT_REASON_I18N_KEY,
  MOVEMENT_ALERT_STYLE,
  MovementAlertLevel,
} from "@/constants/hr_management";
import { IMovementAlert } from "@/interfaces/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IMovementAlertBadgeProps {
  alert: IMovementAlert;
  /** Info: (20260811 - Julian) 卡片上空間小，只顯示圖示與極短文字 */
  compact?: boolean;
}

const ICON_BY_LEVEL = {
  [MovementAlertLevel.URGENT]: AlertTriangle,
  [MovementAlertLevel.IN_PROGRESS]: Clock,
  [MovementAlertLevel.COMPLETED]: CheckCircle2,
};

/**
 * Info: (20260811 - Julian) 自動化警示徽章。
 *
 * 顏色與文字都由 `resolveCaseAlert` 決定，這裡不做任何判斷。
 * 除顏色之外還帶圖示與文字，對紅綠色盲使用者較友善。
 */
const MovementAlertBadge: FC<IMovementAlertBadgeProps> = ({
  alert,
  compact = false,
}) => {
  const { t } = useTranslation();
  const Icon = ICON_BY_LEVEL[alert.level];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${MOVEMENT_ALERT_STYLE[alert.level]} ${compact ? "text-[10px]" : "text-xs"}`}
    >
      <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {t(MOVEMENT_ALERT_REASON_I18N_KEY[alert.reason])}
    </span>
  );
};

export default MovementAlertBadge;
