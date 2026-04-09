import { create } from 'zustand';
import { ReactNode } from 'react';

type SubPanelStore = {
  isOpen: boolean;
  content: ReactNode | null;
  /** open() を呼ぶたびにインクリメントされるキー。同コンポーネントの再マウントに使う */
  contentKey: number;
  open: (content: ReactNode) => void;
  close: () => void;
};

export const useSubPanelStore = create<SubPanelStore>()((set, get) => ({
  isOpen: false,
  content: null,
  contentKey: 0,
  open: (content) => set({ isOpen: true, content, contentKey: get().contentKey + 1 }),
  close: () => set({ isOpen: false, content: null }),
}));
