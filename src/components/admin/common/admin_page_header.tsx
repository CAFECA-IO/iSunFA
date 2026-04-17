import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface IAdminPageHeaderProps {
  icon: LucideIcon;
  iconColorClass?: string;
  title: string;
  subtitle: string;
  rightNode?: ReactNode;
}

export default function AdminPageHeader({
  icon: Icon,
  iconColorClass = "text-orange-500",
  title,
  subtitle,
  rightNode,
}: IAdminPageHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end min-w-0">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-800">
          <Icon className={`h-6 w-6 ${iconColorClass}`} />
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          {subtitle}
        </p>
      </div>

      {rightNode && (
        <div className="flex flex-col w-full sm:w-auto sm:flex-row sm:items-center gap-4 min-w-0">
          {rightNode}
        </div>
      )}
    </div>
  );
}
