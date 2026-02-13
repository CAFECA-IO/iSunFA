'use client'

import { useState } from "react"
import AuthModal from '@/components/auth/auth_modal';
import { useTranslation } from "@/i18n/i18n_context"

export default function LoginButton({label}: {label?: string}) {
    const { t } = useTranslation();
const btnLabel = label || t('header.login');

    const [isAuthModalOpen, setAuthModalOpen] = useState<boolean>(false);

    return (
      <>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 transition-all hover:scale-105 active:scale-95"
        >
          {btnLabel}
        </button>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    )
}
