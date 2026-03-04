import React from "react";
import Image from "next/image";
import { useTranslation } from "@/i18n/i18n_context";
import NumericInput from "@/components/common/numeric_input";

interface IAmountInputProps {
  title: string;
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  required?: boolean;
  minimum?: number;
  maximum?: number;
}

const AmountInput: React.FC<IAmountInputProps> = ({
  title,
  value,
  setValue,
  required,
  minimum,
  maximum,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-gray-700">
        {title} {required && <span className="text-red-500">*</span>}
      </p>
      <div className="flex h-11 items-center overflow-hidden rounded-lg bg-white ring-2 ring-gray-200 transition-all focus-within:ring-2 focus-within:ring-orange-500">
        <NumericInput
          className="flex-1 bg-transparent px-3 py-2 text-right text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400"
          value={value}
          setValue={setValue}
          min={minimum ?? 0}
          max={maximum ?? Number.MAX_SAFE_INTEGER}
          isDecimal
          hasComma
          required={required}
        />
        <div className="flex h-full items-center gap-2 bg-gray-50 border-l border-gray-200 px-4 py-2 text-xs font-bold text-gray-500">
          <Image
            src="/currencies/twd.svg"
            width={16}
            height={16}
            alt="TWD"
            className="overflow-hidden rounded-full shadow-sm"
          />
          <p>{t("currency_alias.twd")}</p>
        </div>
      </div>
    </div>
  );
};

export default AmountInput;
