"use client";

import { ReactNode } from "react";
import { Leaf } from "lucide-react";
import LoginButton from "@/components/common/login_button";

interface IAuthPlaceholderProps {
  title: string;
  buttonLabel?: string;
  icon?: ReactNode;
}

export default function AuthPlaceholder({
  title,
  buttonLabel = undefined,
  icon = undefined,
}: IAuthPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-white p-6 px-4 py-16 text-center shadow-sm ring-1 ring-gray-900/5">
      <div className="mb-4 rounded-full bg-orange-50 p-4">
        {icon || <Leaf className="h-8 w-8 text-orange-600" />}
      </div>
      <h3 className="mb-4 text-lg font-bold text-gray-900">{title}</h3>
      <LoginButton label={buttonLabel} />
    </div>
  );
}
