import { useState, useEffect, RefObject } from "react";

export interface ITextSelectionMenu {
  isOpen: boolean;
  x: number;
  y: number;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
}

export function useTextSelectionMenu(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  isProcessing: boolean,
) {
  const [aiAssistantMenu, setAiAssistantMenu] = useState<ITextSelectionMenu>({
    isOpen: false,
    x: 0,
    y: 0,
    selectedText: "",
    selectionStart: 0,
    selectionEnd: 0,
  });

  useEffect(() => {
    // Info: (20260605 - Julian) 點擊外部關閉 AI menu
    const handleClickOutside = (e: MouseEvent) => {
      const menuEl = document.getElementById("ai-context-menu");
      const suggestionEl = document.getElementById("ai-suggestion-menu");

      if (menuEl && menuEl.contains(e.target as Node)) {
        return;
      }

      if (suggestionEl && suggestionEl.contains(e.target as Node)) {
        setAiAssistantMenu((prev) => ({ ...prev, isOpen: false }));
        return;
      }

      const textarea = textareaRef.current;
      if (textarea && textarea.contains(e.target as Node)) {
        setTimeout(() => {
          if (textarea.selectionStart !== textarea.selectionEnd) {
            return;
          }
          setAiAssistantMenu((prev) =>
            prev.isOpen ? { ...prev, isOpen: false } : prev,
          );
        });
      } else {
        setAiAssistantMenu((prev) =>
          prev.isOpen ? { ...prev, isOpen: false } : prev,
        );
      }
    };

    if (aiAssistantMenu.isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [aiAssistantMenu.isOpen, isProcessing, textareaRef]);

  useEffect(() => {
    // Info: (20260605 - Julian) 檢查選取
    const checkSelection = (e?: MouseEvent | KeyboardEvent) => {
      if (isProcessing) return; // Info: (20260605 - Julian) AI 處理時，不處理選取事件

      const textarea = textareaRef.current;
      if (!textarea || document.activeElement !== textarea) return;

      // Info: (20260605 - Julian) 取得選取範圍
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (start !== end) {
        const selectedText = textarea.value.substring(start, end);

        setAiAssistantMenu((prev) => {
          let x = prev.x;
          let y = prev.y;

          // Info: (20260605 - Julian) 從 MouseEvent 取得 AI menu 位置；否則定位到 Textarea 中央位置
          if (e instanceof MouseEvent) {
            x = e.clientX;
            y = e.clientY;
          } else if (!prev.isOpen) {
            const rect = textarea.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
          }

          return {
            ...prev,
            isOpen: true,
            x,
            y,
            selectedText,
            selectionStart: start,
            selectionEnd: end,
          };
        });
      } else {
        // Info: (20260605 - Julian) 無選取則關閉 menu
        setAiAssistantMenu((prev) =>
          prev.isOpen ? { ...prev, isOpen: false } : prev,
        );
      }
    };

    // Info: (20260605 - Julian) MouseUp → 檢查選取；若點擊 AI menu 則不處理
    const handleGlobalMouseUp = (e: MouseEvent) => {
      const menuEl = document.getElementById("ai-context-menu");
      const suggestionEl = document.getElementById("ai-suggestion-menu");
      if (menuEl && menuEl.contains(e.target as Node)) return;
      if (suggestionEl && suggestionEl.contains(e.target as Node)) return;
      checkSelection(e);
    };

    // Info: (20260605 - Julian) KeyUp → 檢查選取
    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      checkSelection(e);
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("keyup", handleGlobalKeyUp);

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("keyup", handleGlobalKeyUp);
    };
  }, [isProcessing, textareaRef]);

  return { aiAssistantMenu, setAiAssistantMenu };
}
