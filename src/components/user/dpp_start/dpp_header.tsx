import { Building, ArrowLeft } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

interface IDppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightNode?: React.ReactNode;
}

export function DppHeader({
  title: titleProp = undefined,
  subtitle: subtitleProp = undefined,
  showBack = false,
  onBack = () => {},
  rightNode = null,
}: IDppHeaderProps) {
  const { t } = useTranslation();
  const title =
    titleProp || t("digital_product_passport.simulator.header_title");
  const subtitle =
    subtitleProp || t("digital_product_passport.simulator.header_subtitle");
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden opacity-30 blur-3xl"
        aria-hidden="true"
      >
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-br from-orange-400 to-amber-200 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>
      <div className="relative z-10 flex flex-shrink-0 items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-start gap-4">
          {showBack && (
            <button
              onClick={onBack}
              className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="flex items-center text-xl font-bold text-gray-900">
              {!showBack && (
                <Building className="mr-3 h-6 w-6 text-orange-500" />
              )}
              {title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
        {rightNode && <div>{rightNode}</div>}
      </div>
    </>
  );
}
