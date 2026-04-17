import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

const ICON_THEMES = {
  emerald: {
    box: "bg-emerald-100 text-emerald-600",
    bg: "text-emerald-500",
  },
  orange: {
    box: "bg-orange-100 text-orange-600",
    bg: "text-orange-500",
  },
  blue: {
    box: "bg-blue-100 text-blue-600",
    bg: "text-blue-500",
  },
  rose: {
    box: "bg-rose-100 text-rose-600",
    bg: "text-rose-500",
  },
  gray: {
    box: "bg-gray-100 text-gray-600",
    bg: "text-gray-500",
  },
};

export interface IAdminMetricCardProps {
  title: string | ReactNode;
  value: string | ReactNode;
  icon: LucideIcon;
  colorTheme?: keyof typeof ICON_THEMES;

  // Info: (20260417 - Luphia) Optional Content
  prefix?: string | ReactNode;
  unit?: string | ReactNode;
  badgeNode?: ReactNode;

  // Info: (20260417 - Luphia) Layout Variants
  showSmallIcon?: boolean;
  bgIconPosition?: "top-right" | "bottom-right";

  // Info: (20260417 - Luphia) Custom Stylings
  containerClassName?: string;
  titleClassName?: string;
  valueClassName?: string;
  unitClassName?: string;
}

export default function AdminMetricCard({
  title,
  value,
  icon: Icon,
  colorTheme = "gray",
  prefix,
  unit,
  badgeNode,
  showSmallIcon = true,
  bgIconPosition = "bottom-right",
  containerClassName = "bg-white border border-gray-200",
  titleClassName = "text-gray-400 font-semibold",
  valueClassName = "text-gray-800 text-xl font-bold",
  unitClassName = "text-gray-500 text-xs",
}: IAdminMetricCardProps) {
  const theme = ICON_THEMES[colorTheme] || ICON_THEMES.gray;

  return (
    <div
      className={`rounded-xl p-6 shadow-sm relative overflow-hidden group transition ${containerClassName}`}
    >
      <div className="flex justify-between items-start z-10 w-full relative">
        <div>
          <p
            className={`text-[10px] uppercase tracking-wider mb-1 ${titleClassName}`}
          >
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className={`tracking-tight ${valueClassName}`}>
              {prefix} {value}
            </h3>
            {unit && (
              <span className={`text-sm font-semibold ${unitClassName}`}>
                {unit}
              </span>
            )}
            {badgeNode && <div className="ml-1">{badgeNode}</div>}
          </div>
        </div>

        {showSmallIcon && (
          <div className={`p-2 rounded-xl shrink-0 ${theme.box}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {bgIconPosition === "bottom-right" ? (
        <div
          className={`absolute -bottom-4 -right-4 opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 z-0 ${theme.bg}`}
        >
          <Icon className="w-32 h-32" />
        </div>
      ) : (
        <div
          className={`absolute top-0 right-0 p-4 opacity-5 pointer-events-none z-0 ${theme.bg}`}
        >
          <Icon className="h-16 w-16" />
        </div>
      )}
    </div>
  );
}
