import { create } from 'zustand';

interface ChatState {
  totalUnread: number;
  setTotalUnread: (count: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  totalUnread: 0,
  setTotalUnread: (count) => set({ totalUnread: count }),
}));
