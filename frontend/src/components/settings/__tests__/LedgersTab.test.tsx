import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LedgersTab from '../LedgersTab';
import * as ledgerApi from '@/lib/api/ledger';
import { useToastStore } from '@/stores/toastStore';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useSubPanelStore } from '@/stores/subPanelStore';

jest.mock('@/lib/api/ledger');
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: jest.fn(),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));
jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  sortableKeyboardCoordinates: jest.fn(),
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  verticalListSortingStrategy: jest.fn(),
  arrayMove: jest.fn(),
}));
jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: jest.fn(() => '') } },
}));

const mockGetLedgers = jest.mocked(ledgerApi.getLedgers);
const mockGetCategories = jest.mocked(ledgerApi.getCategories);
const mockUpdateLedger = jest.mocked(ledgerApi.updateLedger);

const mockLedger = {
  ledgerId: 'ldg_1',
  ledgerName: 'テスト帳簿',
  initialBalance: 0,
  startDayOfMonth: 1,
  startMonthOfYear: 1,
  themeColor: '#4A90D9',
  role: 'OWNER' as const,
  ownerUserId: 'user1',
  createdAt: '2026-01-01T00:00:00Z',
};

/** SubPanelStore の content を描画するラッパー */
const SubPanelContentRenderer = () => {
  const content = useSubPanelStore((s) => s.content);
  return content ? <div data-testid="sub-panel">{content}</div> : null;
};

const TestWrapper = () => (
  <>
    <LedgersTab />
    <SubPanelContentRenderer />
  </>
);

beforeEach(() => {
  mockGetLedgers.mockReset();
  mockGetCategories.mockReset();
  mockUpdateLedger.mockReset();
  useToastStore.setState({ toasts: [] });
  useLedgerStore.setState({ ledgers: [mockLedger], selectedLedgerId: 'ldg_1' });
  useSubPanelStore.setState({ isOpen: false, content: null, contentKey: 0 });

  mockGetLedgers.mockResolvedValue({ data: [mockLedger], error: null, timestamp: '' });
  mockGetCategories.mockResolvedValue({ data: [], error: null, timestamp: '' });
  mockUpdateLedger.mockResolvedValue({ data: mockLedger, error: null, timestamp: '' });
});

describe('LedgersTab - バリデーションメッセージ', () => {
  it('帳簿編集フォームにヒントテキストが表示される', async () => {
    render(<TestWrapper />);
    await screen.findByText('テスト帳簿');
    await userEvent.click(screen.getByText('テスト帳簿'));
    await screen.findByTestId('sub-panel');
    expect(screen.getByText('100文字以内で入力してください')).toBeInTheDocument();
  });

  it('カテゴリ管理タブでカテゴリ名が空のまま追加するとエラーが表示される', async () => {
    render(<TestWrapper />);
    await screen.findByText('テスト帳簿');
    await userEvent.click(screen.getByText('テスト帳簿'));
    await screen.findByTestId('sub-panel');
    await screen.findByText('カテゴリ管理');
    await userEvent.click(screen.getByText('カテゴリ管理'));
    await screen.findByText('支出カテゴリ');

    const addButtons = screen.getAllByRole('button', { name: '+ 追加' });
    await userEvent.click(addButtons[0]);
    await waitFor(() =>
      expect(screen.getByPlaceholderText('カテゴリ名（50文字以内）')).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole('button', { name: '追加' }));
    await waitFor(() =>
      expect(screen.getByText('カテゴリ名を入力してください')).toBeInTheDocument()
    );
  });
});
