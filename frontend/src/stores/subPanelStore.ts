import { create } from 'zustand';
import { ReactNode } from 'react';

export const DEFAULT_PANEL_WIDTH = 320;

type SubPanelStore = {
  isOpen: boolean;
  content: ReactNode | null;
  /** open() を呼ぶたびにインクリメントされるキー。同コンポーネントの再マウントに使う */
  contentKey: number;
  panelWidth: number;
  open: (content: ReactNode) => void;
  close: () => void;
  setPanelWidth: (width: number) => void;
};

export const useSubPanelStore = create<SubPanelStore>()((set, get) => ({
  isOpen: false,
  content: null,
  contentKey: 0,
  panelWidth: DEFAULT_PANEL_WIDTH,
  open: (content) => set({ isOpen: true, content, contentKey: get().contentKey + 1 }),
  close: () => set({ isOpen: false, content: null }),
  setPanelWidth: (width) => set({ panelWidth: width }),
}));
