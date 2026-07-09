import { KeyboardEvent } from "react";

export interface IChatInputProps {
  inputValue: string;
  isTyping: boolean;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
}
import { useTranslation } from "@/i18n/i18n_context";

export function ChatInput({
  inputValue,
  isTyping,
  isLoading,
  onInputChange,
  onSendMessage,
}: IChatInputProps) {
  const { t } = useTranslation();
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSendMessage();
    }
  };

  const disabled = !inputValue.trim() || isTyping || isLoading;

  return (
    <div className="absolute right-6 bottom-6 left-6 z-10">
      <div className="relative mx-auto flex items-center rounded-full border-2 border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors focus-within:border-[#ff5a00]">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("carbon_chatbot.input_placeholder")}
          className="flex-1 bg-transparent py-4 pr-16 pl-6 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300"
          disabled={isTyping || isLoading}
        />
        <button
          onClick={onSendMessage}
          disabled={disabled}
          aria-label="Send message"
          className="absolute top-1/2 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#ff5a00] text-white shadow-sm transition-colors hover:bg-[#e04f00] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <svg
            className="mt-[1px] ml-[-2px] h-5 w-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
