import { act } from 'react';
import { useLedgerStore } from '../ledgerStore';
import * as ledgerApi from '@/lib/api/ledger';

jest.mock('@/lib/api/ledger');
const mockGetLedgers = jest.mocked(ledgerApi.getLedgers);
const mockCreateLedger = jest.mocked(ledgerApi.createLedger);

const makeLedger = (id: string, name: string): ledgerApi.Ledger => ({
  ledgerId: id,
  ownerUserId: 'user1',
  ledgerName: name,
  initialBalance: 0,
  startDayOfMonth: 1,
  startMonthOfYear: 1,
  isActive: true,
  createdAt: '',
  updatedAt: '',
});

beforeEach(() => {
  useLedgerStore.setState({ ledgers: [], selectedLedgerId: null });
  jest.clearAllMocks();
});

describe('ledgerStore', () => {
  it('fetchLedgers で帳簿一覧がセットされる', async () => {
    mockGetLedgers.mockResolvedValueOnce({
      data: [makeLedger('ldg_1', '家計簿A'), makeLedger('ldg_2', '家計簿B')],
      error: null,
      timestamp: '',
    });

    await act(async () => {
      await useLedgerStore.getState().fetchLedgers();
    });

    expect(useLedgerStore.getState().ledgers).toHaveLength(2);
  });

  it('fetchLedgers で selectedLedgerId が未設定の場合は先頭を自動選択する', async () => {
    mockGetLedgers.mockResolvedValueOnce({
      data: [makeLedger('ldg_1', '家計簿A'), makeLedger('ldg_2', '家計簿B')],
      error: null,
      timestamp: '',
    });

    await act(async () => {
      await useLedgerStore.getState().fetchLedgers();
    });

    expect(useLedgerStore.getState().selectedLedgerId).toBe('ldg_1');
  });

  it('fetchLedgers で selectedLedgerId が有効な場合は変更しない', async () => {
    useLedgerStore.setState({ selectedLedgerId: 'ldg_2' });

    mockGetLedgers.mockResolvedValueOnce({
      data: [makeLedger('ldg_1', '家計簿A'), makeLedger('ldg_2', '家計簿B')],
      error: null,
      timestamp: '',
    });

    await act(async () => {
      await useLedgerStore.getState().fetchLedgers();
    });

    expect(useLedgerStore.getState().selectedLedgerId).toBe('ldg_2');
  });

  it('selectLedger で selectedLedgerId が変更される', () => {
    useLedgerStore.setState({
      ledgers: [makeLedger('ldg_1', 'A'), makeLedger('ldg_2', 'B')],
    });

    act(() => {
      useLedgerStore.getState().selectLedger('ldg_2');
    });

    expect(useLedgerStore.getState().selectedLedgerId).toBe('ldg_2');
  });

  it('createLedger で帳簿が追加され自動選択される', async () => {
    const newLedger = makeLedger('ldg_new', '新帳簿');
    mockCreateLedger.mockResolvedValueOnce({
      data: newLedger,
      error: null,
      timestamp: '',
    });

    await act(async () => {
      await useLedgerStore.getState().createLedger({ ledgerName: '新帳簿' });
    });

    const state = useLedgerStore.getState();
    expect(state.ledgers).toHaveLength(1);
    expect(state.selectedLedgerId).toBe('ldg_new');
  });

  it('getSelectedLedger で選択中の帳簿が返される', () => {
    useLedgerStore.setState({
      ledgers: [makeLedger('ldg_1', 'A'), makeLedger('ldg_2', 'B')],
      selectedLedgerId: 'ldg_2',
    });

    const selected = useLedgerStore.getState().getSelectedLedger();
    expect(selected?.ledgerId).toBe('ldg_2');
    expect(selected?.ledgerName).toBe('B');
  });

  it('getSelectedLedger で selectedLedgerId が null の場合は null を返す', () => {
    useLedgerStore.setState({ ledgers: [], selectedLedgerId: null });

    expect(useLedgerStore.getState().getSelectedLedger()).toBeNull();
  });
});
