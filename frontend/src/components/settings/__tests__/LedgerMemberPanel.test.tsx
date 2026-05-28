import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LedgerMemberPanel from '../LedgerMemberPanel';
import * as ledgerApi from '@/lib/api/ledger';
import { useLedgerStore } from '@/stores/ledgerStore';
import type { LedgerMember, PermissionType } from '@/lib/api/ledger';

jest.mock('@/lib/api/ledger');
jest.mock('@/stores/ledgerStore');

const mockGetMembers   = jest.mocked(ledgerApi.getMembers);
const mockAddMember    = jest.mocked(ledgerApi.addMember);
const mockRemoveMember = jest.mocked(ledgerApi.removeMember);
const mockUpdateMember = jest.mocked(ledgerApi.updateMember);
const mockUseLedgerStore = jest.mocked(useLedgerStore);

const TEST_LEDGER_ID = 'ldg_1';

const makeMembers = (): LedgerMember[] => [
  { permissionId: null,       userId: 'owner1', userName: 'オーナー',  permissionType: 'OWNER',  grantedAt: null },
  { permissionId: 'lperm_a1', userId: 'admin1', userName: '管理者A',  permissionType: 'ADMIN',  grantedAt: '2026-01-01T00:00:00' },
  { permissionId: 'lperm_v1', userId: 'viewer1',userName: '閲覧者B',  permissionType: 'VIEWER', grantedAt: '2026-02-01T00:00:00' },
];

const makeLedger = (permissionType: PermissionType) => ({
  ledgerId: TEST_LEDGER_ID,
  ownerUserId: 'owner1',
  ledgerName: 'テスト帳簿',
  initialBalance: 0,
  startDayOfMonth: 1,
  startMonthOfYear: 1,
  themeColor: null,
  isActive: true,
  createdAt: '',
  updatedAt: '',
  myPermissionType: permissionType,
});

const setupStore = (canAdmin: boolean) => {
  const permissionType: PermissionType = canAdmin ? 'ADMIN' : 'VIEWER';
  mockUseLedgerStore.mockImplementation((selector: (s: ReturnType<typeof useLedgerStore>) => unknown) => {
    const fakeStore = {
      ledgers: [makeLedger(permissionType)],
    };
    return selector(fakeStore as unknown as ReturnType<typeof useLedgerStore>);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMembers.mockResolvedValue({ data: makeMembers(), error: null, timestamp: '' });
  mockAddMember.mockResolvedValue({
    data: { permissionId: 'lperm_new', userId: 'newuser', userName: '新メンバー', permissionType: 'EDITOR', grantedAt: '' },
    error: null, timestamp: '',
  });
  mockRemoveMember.mockResolvedValue({ data: null, error: null, timestamp: '' });
  mockUpdateMember.mockResolvedValue({
    data: { permissionId: 'lperm_v1', userId: 'viewer1', userName: '閲覧者B', permissionType: 'EDITOR', grantedAt: '' },
    error: null, timestamp: '',
  });
});

describe('LedgerMemberPanel', () => {
  it('メンバー一覧が表示される', async () => {
    setupStore(true);
    render(<LedgerMemberPanel ledgerId={TEST_LEDGER_ID} />);
    // 管理者A は一意なので待機条件として使用する
    expect(await screen.findByText('管理者A')).toBeInTheDocument();
    expect(screen.getByText('閲覧者B')).toBeInTheDocument();
    // userName "オーナー" と権限バッジ "オーナー" の2個存在する
    expect(screen.getAllByText('オーナー').length).toBeGreaterThanOrEqual(2);
  });

  it('ADMIN ユーザーには招待フォームが表示される', async () => {
    setupStore(true);
    render(<LedgerMemberPanel ledgerId={TEST_LEDGER_ID} />);
    await screen.findByText('管理者A');
    expect(screen.getByText('メンバーを招待')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('招待するユーザーのIDを入力')).toBeInTheDocument();
  });

  it('VIEWER ユーザーには招待フォームが表示されない', async () => {
    setupStore(false);
    render(<LedgerMemberPanel ledgerId={TEST_LEDGER_ID} />);
    await screen.findByText('管理者A');
    expect(screen.queryByText('メンバーを招待')).not.toBeInTheDocument();
  });

  it('ADMIN ユーザーには変更・削除ボタンが表示される', async () => {
    setupStore(true);
    render(<LedgerMemberPanel ledgerId={TEST_LEDGER_ID} />);
    await screen.findByText('管理者A');
    const changeBtns = screen.getAllByRole('button', { name: '変更' });
    expect(changeBtns.length).toBeGreaterThan(0);
    const deleteBtns = screen.getAllByRole('button', { name: '削除' });
    expect(deleteBtns.length).toBeGreaterThan(0);
  });

  it('招待フォームでユーザーIDが空だとエラーになる', async () => {
    setupStore(true);
    render(<LedgerMemberPanel ledgerId={TEST_LEDGER_ID} />);
    await screen.findByText('メンバーを招待');
    await userEvent.click(screen.getByRole('button', { name: '招待する' }));
    await waitFor(() =>
      expect(screen.getByText('ユーザーIDを入力してください')).toBeInTheDocument()
    );
  });

  it('削除ボタンで confirm → removeMember が呼ばれる', async () => {
    setupStore(true);
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<LedgerMemberPanel ledgerId={TEST_LEDGER_ID} />);
    await screen.findByText('管理者A');
    const deleteBtns = screen.getAllByRole('button', { name: '削除' });
    await userEvent.click(deleteBtns[0]);
    await waitFor(() => expect(mockRemoveMember).toHaveBeenCalledTimes(1));
  });

  it('削除ボタンで confirm がキャンセルされると removeMember が呼ばれない', async () => {
    setupStore(true);
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(<LedgerMemberPanel ledgerId={TEST_LEDGER_ID} />);
    await screen.findByText('管理者A');
    const deleteBtns = screen.getAllByRole('button', { name: '削除' });
    await userEvent.click(deleteBtns[0]);
    expect(mockRemoveMember).not.toHaveBeenCalled();
  });

  it('招待フォーム送信で addMember が呼ばれる', async () => {
    setupStore(true);
    render(<LedgerMemberPanel ledgerId={TEST_LEDGER_ID} />);
    await screen.findByText('メンバーを招待');
    await userEvent.type(screen.getByPlaceholderText('招待するユーザーのIDを入力'), 'newuser1');
    await userEvent.click(screen.getByRole('button', { name: '招待する' }));
    await waitFor(() =>
      expect(mockAddMember).toHaveBeenCalledWith(TEST_LEDGER_ID, expect.objectContaining({ userId: 'newuser1' }))
    );
  });

  it('変更ボタンクリックで権限編集モードになる', async () => {
    setupStore(true);
    render(<LedgerMemberPanel ledgerId={TEST_LEDGER_ID} />);
    await screen.findByText('管理者A');
    const changeBtns = screen.getAllByRole('button', { name: '変更' });
    await userEvent.click(changeBtns[0]);
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
  });

  it('権限編集で取消ボタンを押すと編集モードが終了する', async () => {
    setupStore(true);
    render(<LedgerMemberPanel ledgerId={TEST_LEDGER_ID} />);
    await screen.findByText('管理者A');
    const changeBtns = screen.getAllByRole('button', { name: '変更' });
    await userEvent.click(changeBtns[0]);
    await userEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument();
  });

  it('権限編集で保存ボタンを押すと updateMember が呼ばれる', async () => {
    setupStore(true);
    render(<LedgerMemberPanel ledgerId={TEST_LEDGER_ID} />);
    await screen.findByText('管理者A');
    const changeBtns = screen.getAllByRole('button', { name: '変更' });
    await userEvent.click(changeBtns[0]);
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(mockUpdateMember).toHaveBeenCalledTimes(1));
  });
});
