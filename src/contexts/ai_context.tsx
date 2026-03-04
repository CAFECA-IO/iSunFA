"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface IAiContextType {
  isChatOpen: boolean;
  setIsChatOpen: (isOpen: boolean) => void;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
}

const AiContext = createContext<IAiContextType | undefined>(undefined);

export const AiContextProvider = ({ children }: { children: ReactNode }) => {
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);

  const toggleChat = () => setIsChatOpen((prev) => !prev);
  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);

  return (
    <AiContext.Provider
      value={{
        isChatOpen,
        setIsChatOpen,
        toggleChat,
        openChat,
        closeChat,
      }}
    >
      {children}
    </AiContext.Provider>
  );
};

export const useAiContext = () => {
  const context = useContext(AiContext);
  if (context === undefined) {
    throw new Error("useAiContext must be used within an AiContextProvider");
  }
  return context;
};
