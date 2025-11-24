import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiLayout } from 'react-icons/fi';
import MessageBubble, { ChatRole } from '@/components/ai_accounting_assistance/message_bubble';
import { APIName } from '@/constants/api_connection';
import { ISUNFA_ROUTE } from '@/constants/url';
import APIHandler from '@/lib/utils/api_handler';
import { IFaithContent } from '@/interfaces/faith';

interface IAAASharePageBodyProps {
  sessionId: string;
}

const AAASharePageBody: React.FC<IAAASharePageBodyProps> = ({ sessionId }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [dialogs, setDialogs] = useState<IFaithContent[]>([]);

  const { trigger: getDialogList, isLoading } = APIHandler<IFaithContent[]>(
    APIName.LIST_CONTENT_BY_FAITH_SESSION_ID
  );

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  useEffect(() => {
    const getDialogs = async () => {
      const { data } = await getDialogList({ params: { sessionId } });
      // Info: (20251118 - Julian) 將取得的 dialogs 轉成 IDialog 格式
      setDialogs(data ?? []);
    };

    getDialogs();
  }, []);

  const skeletonDialogs = isLoading && (
    <>
      <div className="ml-auto flex h-200px w-600px animate-pulse items-center justify-center rounded-lg bg-slate-400 p-20px font-medium text-chat-bubbles-text-primary">
        Loading...
      </div>
      <div className="flex h-200px w-600px animate-pulse items-center justify-center rounded-lg bg-slate-400 p-20px font-medium text-chat-bubbles-text-primary">
        Loading...
      </div>
    </>
  );

  const chatMessages = dialogs.map((chat) => {
    const from = chat.role.name === 'user' ? ChatRole.USER : ChatRole.ASSISTANT;
    return (
      <MessageBubble key={chat.content} messageContent={chat.content} chatRole={from} readonly />
    );
  });

  const displayedCopyright = isSidebarOpen ? (
    <div className="my-auto flex flex-col items-center gap-8px">
      <p className="text-xs font-normal text-text-neutral-tertiary">iSunFA 2024 Beta V1.0.0</p>
      <p className="text-sm font-semibold text-link-text-primary">Support</p>
      <div className="flex items-center gap-8px">
        <Link
          href={ISUNFA_ROUTE.PRIVACY_POLICY}
          target="_blank"
          className="text-sm font-semibold text-link-text-primary hover:text-link-text-primary-hover"
        >
          Private Policy
        </Link>
        <hr className="h-full w-px border border-stroke-neutral-quaternary" />
        <Link
          href={ISUNFA_ROUTE.TERMS_OF_SERVICE}
          target="_blank"
          className="text-sm font-semibold text-link-text-primary hover:text-link-text-primary-hover"
        >
          Service Term
        </Link>
      </div>
    </div>
  ) : null;

  if (dialogs.length === 0) {
    return (
      <main className="flex min-h-screen w-screen flex-col items-center justify-center gap-10px overflow-x-hidden bg-surface-neutral-main-background bg-aaa bg-cover bg-no-repeat">
        <h1 className="text-6xl font-bold text-text-neutral-primary">No chat history found</h1>
        <p className="text-lg font-semibold text-text-neutral-secondary">
          Please check the link or create a new chat session.
        </p>
        <div className="">
          <Link
            href={ISUNFA_ROUTE.AI_ACCOUNTING_ASSISTANCE}
            className="text-sm font-semibold text-link-text-primary hover:text-link-text-primary-hover"
          >
            Back to AI Accounting Assistance
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-screen overflow-x-hidden bg-surface-neutral-main-background bg-aaa bg-cover bg-no-repeat">
      {/* Info: (20251124 - Julian) Sidebar */}
      <div
        className={`${isSidebarOpen ? 'w-250px px-16px' : 'w-70px px-12px'} fixed z-10 flex h-screen flex-col gap-32px bg-surface-neutral-surface-lv1 py-16px transition-all duration-200 ease-in-out`}
      >
        {/* Info: (20251014 - Julian) Header */}
        <button type="button" onClick={toggleSidebar} className="group flex items-center gap-8px">
          <div className="mx-auto shrink-0">
            <Image src="/logo/isunfa_logo_new_icon.svg" width={28} height={28} alt="iSunFA_logo" />
          </div>
          {isSidebarOpen && (
            <>
              <p className="flex-1 text-left font-semibold text-text-brand-primary-lv2">FinPilot</p>
              <FiLayout
                size={24}
                className="text-button-text-secondary hover:text-button-text-primary-hover group-hover:text-button-text-primary-hover"
              />
            </>
          )}
        </button>
        {/* Info: (20251124 - Julian) Copyright */}
        {displayedCopyright}
      </div>

      {/* Info: (20251124 - Julian) Main Chat area */}
      <div className="relative mx-auto flex max-w-920px flex-1 flex-col gap-24px overflow-y-auto py-20px">
        {skeletonDialogs}
        {chatMessages}
      </div>
    </main>
  );
};

export default AAASharePageBody;
