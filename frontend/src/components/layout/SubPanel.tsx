'use client';

import { useRef, useCallback, type ReactNode } from 'react';
import { useSubPanelStore } from '@/stores/subPanelStore';

const MIN_WIDTH = 280;
const MAX_WIDTH_RATIO = 0.6;

type SubPanelProps = {
  children: ReactNode;
};

const SubPanel = ({ children }: SubPanelProps) => {
  const { panelWidth, setPanelWidth } = useSubPanelStore();
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = panelWidth;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = startX.current - ev.clientX;
        const maxWidth = window.innerWidth > 0
          ? Math.floor(window.innerWidth * MAX_WIDTH_RATIO)
          : MIN_WIDTH * 4;
        const newWidth = Math.min(Math.max(startWidth.current + delta, MIN_WIDTH), maxWidth);
        setPanelWidth(newWidth);
      };

      const onMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [panelWidth, setPanelWidth]
  );

  return (
    <aside
      style={{ width: panelWidth }}
      className="relative bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col shrink-0"
    >
      <div
        role="separator"
        aria-label="パネル幅を調整"
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-10 group flex items-center justify-center"
      >
        <div className="flex flex-col gap-0.5">
          <span className="block w-0.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-[var(--theme-color)] transition-colors" />
          <span className="block w-0.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-[var(--theme-color)] transition-colors" />
          <span className="block w-0.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-[var(--theme-color)] transition-colors" />
        </div>
      </div>
      <div className="p-4 pl-5 overflow-y-auto flex-1">{children}</div>
    </aside>
  );
};

export default SubPanel;
