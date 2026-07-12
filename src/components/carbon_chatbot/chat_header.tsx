import { Bot, Circle, User } from "lucide-react";

import { useTranslation } from "@/i18n/i18n_context";

export function ChatHeader() {
  const { t } = useTranslation();
  return (
    <div className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-orange-600 p-2.5 text-white shadow-sm">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-[15px] font-bold tracking-wide text-gray-900">
            {t("carbon_chatbot.title")} - {t("carbon_chatbot.ai_name")}
          </h1>
          <p className="mt-0.5 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
            {t("carbon_chatbot.platform_name")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-8">
        <div className="hidden items-center gap-2 text-[11px] font-bold tracking-wider text-green-600 sm:flex">
          <Circle className="h-2.5 w-2.5 fill-green-500" />
          {t("carbon_chatbot.system_online")}
        </div>
        <div className="hidden items-center gap-3 text-[11px] font-medium text-gray-400 sm:flex">
          <span className="block h-4 w-px bg-gray-200"></span>
          {t("carbon_chatbot.database_version")}:{" "}
          {process.env.NEXT_PUBLIC_DATABASE_VERSION || "2026.Q3.v1"}
        </div>
        <div className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-gray-50 shadow-sm transition-colors hover:bg-gray-100">
          <User className="h-4 w-4 text-gray-500" />
        </div>
      </div>
    </div>
  );
}
