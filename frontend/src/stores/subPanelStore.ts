import { create } from 'zustand';
import { ReactNode } from 'react';

type SubPanelStore = {
  isOpen: boolean;
  content: ReactNode | null;
  open: (content: ReactNode) => void;
  close: () => void;
};

export const useSubPanelStore = create<SubPanelStore>()((set) => ({
  isOpen: false,
  content: null,
  open: (content) => set({ isOpen: true, content }),
  close: () => set({ isOpen: false, content: null }),
}));
