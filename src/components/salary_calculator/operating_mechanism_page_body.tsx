"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import CalculatorHeader from "@/components/salary_calculator/calculator_header";
import { timestampToString } from "@/lib/utils/common";

interface IOperatingMechanismData {
  version: string;
  lastUpdated: number;
  content: string;
}

const OperatingMechanismContent: React.FC = () => {
  const { t } = useTranslation();

  const [data, setData] = useState<IOperatingMechanismData | null>(null);

  useEffect(() => {
    fetch("/api/v2/salary_calculator_operating_mechanism")
      .then((response) => response.json())
      .then((d: IOperatingMechanismData) => {
        setData(d);
      });
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center px-5 lg:px-25">
        Loading...
      </div>
    );
  }

  const { version, lastUpdated, content } = data;

  const lastUpdatedTimestamp = new Date(lastUpdated).getTime() / 1000;
  const formattedDate = timestampToString(lastUpdatedTimestamp).dateWithSlash;

  const subtitle = `${version} - ${formattedDate}`;

  const formattedContent = content
    .replace(
      /<h1/g,
      '<h1 class="mt-14 text-lg font-semibold text-text-neutral-primary"',
    )
    .replace(
      /<h2/g,
      '<h2 class="mt-[10px] text-md font-semibold text-text-neutral-secondary"',
    )
    .replace(
      /<ol/g,
      '<ol class="ml-5 list-decimal list-outside text-text-neutral-secondary"',
    )
    .replace(
      /<ul/g,
      '<ul class="ml-5 list-disc list-outside text-text-neutral-secondary"',
    )
    .replace(
      /<p/g,
      '<p class="text-base font-medium text-text-neutral-secondary"',
    );

  return (
    <div className="flex flex-col items-stretch p-5 lg:p-[80px]">
      {/* Info: (20251112 - Julian) Title & Version */}
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-text-neutral-primary text-center text-xl font-semibold">
          {t("calculator.operating_mechanism.main_title")}
        </h1>
        <p className="text-text-neutral-tertiary text-xs font-normal">
          {subtitle}
        </p>
      </div>

      {/* Info: (20251112 - Julian) Content */}
      <article dangerouslySetInnerHTML={{ __html: formattedContent }} />
    </div>
  );
};

const OperatingMechanismPageBody: React.FC = () => {
  return (
    <main className="bg-surface-neutral-main-background min-h-screen overflow-x-hidden">
      {/* Info: (20251112 - Julian) Header */}
      <CalculatorHeader />

      {/* Info: (20251112 - Julian) Main Content */}
      <OperatingMechanismContent />
    </main>
  );
};

export default OperatingMechanismPageBody;
