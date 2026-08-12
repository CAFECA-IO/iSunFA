"use client";

import { FC } from "react";
import { HR_INPUT_CLASS } from "@/constants/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IOffboardingNoteFieldProps {
  id: string;
  value: string;
  onChange: (next: string) => void;
}

// Info: (20260811 - Julian) 每個分頁底部的備註事項：資產的損壞說明與 HR 的結算註記
const OffboardingNoteField: FC<IOffboardingNoteFieldProps> = ({
  id,
  value,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-5">
      <label
        htmlFor={id}
        className="text-xs font-bold tracking-wider text-gray-400 uppercase"
      >
        {t("hr_management.offboarding.note_title")}
      </label>
      <textarea
        id={id}
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("hr_management.offboarding.note_placeholder")}
        className={`mt-1.5 w-full resize-none ${HR_INPUT_CLASS}`}
      />
    </div>
  );
};

export default OffboardingNoteField;
