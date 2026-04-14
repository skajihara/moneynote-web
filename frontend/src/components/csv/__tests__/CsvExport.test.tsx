import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CsvExport from '../CsvExport';
import * as csvApi from '@/lib/api/csv';
import * as ledgerApi from '@/lib/api/ledger';
import { ApiClientError } from '@/lib/api/client';

jest.mock('@/lib/api/csv');
jest.mock('@/lib/api/ledger');

const mockExportCsv = jest.mocked(csvApi.exportCsv);
const mockGetCategories = jest.mocked(ledgerApi.getCategories);

global.URL.createObjectURL = jest.fn(() => 'blob:mock');
global.URL.revokeObjectURL = jest.fn();

const mockClick = jest.fn();
const originalCreateElement = document.createElement.bind(document);
jest
  .spyOn(document, 'createElement')
  .mockImplementation((tag: string, ...args: unknown[]) => {
    const el = originalCreateElement(tag, ...(args as []));
    if (tag === 'a') el.click = mockClick;
    return el;
  });

const categoriesResponse = {
  data: [
    { categoryId: 'cat_food', categoryName: '食費', categoryType: 'EXPENSE' as const,
      icon: null, color: null, displayOrder: 1, isDefault: false, isActive: true, ledgerId: 'ldg_1', createdAt: '', updatedAt: '' },
    { categoryId: 'cat_salary', categoryName: '給与', categoryType: 'INCOME' as const,
      icon: null, color: null, displayOrder: 2, isDefault: false, isActive: true, ledgerId: 'ldg_1', createdAt: '', updatedAt: '' },
  ],
  error: null,
  timestamp: '',
};

describe('CsvExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCategories.mockResolvedValue(categoriesResponse);
  });

  it('エクスポートボタンが表示される', async () => {
    render(<CsvExport ledgerId="ldg_1" />);
    expect(await screen.findByRole('button', { name: 'エクスポート' })).toBeInTheDocument();
  });

  it('カテゴリ一覧と固定費チェックボックスが表示される', async () => {
    render(<CsvExport ledgerId="ldg_1" />);
    expect(await screen.findByText('食費')).toBeInTheDocument();
    expect(screen.getByText('給与')).toBeInTheDocument();
    expect(screen.getByLabelText('固定費を含める')).toBeInTheDocument();
    expect(screen.getByLabelText('固定費を含める')).toBeChecked();
  });

  it('カテゴリがデフォルトで全選択されている', async () => {
    render(<CsvExport ledgerId="ldg_1" />);
    await screen.findByText('食費');
    expect(screen.getByLabelText('食費')).toBeChecked();
    expect(screen.getByLabelText('給与')).toBeChecked();
  });

  it('全て解除ボタンで全チェックが外れる', async () => {
    render(<CsvExport ledgerId="ldg_1" />);
    await screen.findByText('食費');

    await userEvent.click(screen.getByRole('button', { name: '全て解除' }));

    expect(screen.getByLabelText('食費')).not.toBeChecked();
    expect(screen.getByLabelText('給与')).not.toBeChecked();
  });

  it('全て選択ボタンで全チェックが入る', async () => {
    render(<CsvExport ledgerId="ldg_1" />);
    await screen.findByText('食費');

    await userEvent.click(screen.getByRole('button', { name: '全て解除' }));
    await userEvent.click(screen.getByRole('button', { name: '全て選択' }));

    expect(screen.getByLabelText('食費')).toBeChecked();
    expect(screen.getByLabelText('給与')).toBeChecked();
  });

  it('ボタンクリックで exportCsv が呼ばれダウンロードされる', async () => {
    mockExportCsv.mockResolvedValue(new Blob(['csv content']));
    render(<CsvExport ledgerId="ldg_1" />);
    await screen.findByRole('button', { name: 'エクスポート' });

    await userEvent.click(screen.getByRole('button', { name: 'エクスポート' }));

    await waitFor(() => {
      expect(mockExportCsv).toHaveBeenCalledWith('ldg_1', expect.objectContaining({}));
      expect(mockClick).toHaveBeenCalled();
    });
  });

  it('開始日・終了日を設定してエクスポートするとパラメータが渡る', async () => {
    mockExportCsv.mockResolvedValue(new Blob(['csv']));
    render(<CsvExport ledgerId="ldg_1" />);
    await screen.findByRole('button', { name: 'エクスポート' });

    await userEvent.type(screen.getByLabelText('開始日'), '2026-04-01');
    await userEvent.type(screen.getByLabelText('終了日'), '2026-04-30');
    await userEvent.click(screen.getByRole('button', { name: 'エクスポート' }));

    await waitFor(() => {
      expect(mockExportCsv).toHaveBeenCalledWith('ldg_1', expect.objectContaining({
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      }));
    });
  });

  it('カテゴリチェックボックスを選択してエクスポートするとcategoryIdsが渡る', async () => {
    mockExportCsv.mockResolvedValue(new Blob(['csv']));
    render(<CsvExport ledgerId="ldg_1" />);
    await screen.findByText('食費');

    // 全て解除してから食費のみ選択
    await userEvent.click(screen.getByRole('button', { name: '全て解除' }));
    await userEvent.click(screen.getByLabelText('食費'));
    await userEvent.click(screen.getByRole('button', { name: 'エクスポート' }));

    await waitFor(() => {
      expect(mockExportCsv).toHaveBeenCalledWith('ldg_1', expect.objectContaining({
        categoryIds: ['cat_food'],
      }));
    });
  });

  it('固定費チェックを外してエクスポートするとincludeFixed=falseが渡る', async () => {
    mockExportCsv.mockResolvedValue(new Blob(['csv']));
    render(<CsvExport ledgerId="ldg_1" />);
    await screen.findByLabelText('固定費を含める');

    await userEvent.click(screen.getByLabelText('固定費を含める'));
    await userEvent.click(screen.getByRole('button', { name: 'エクスポート' }));

    await waitFor(() => {
      expect(mockExportCsv).toHaveBeenCalledWith('ldg_1', expect.objectContaining({
        includeFixed: false,
      }));
    });
  });

  it('エラー時にメッセージが表示される', async () => {
    mockExportCsv.mockRejectedValue(new ApiClientError({ code: 'E500', message: 'サーバーエラー' }));
    render(<CsvExport ledgerId="ldg_1" />);
    await screen.findByRole('button', { name: 'エクスポート' });

    await userEvent.click(screen.getByRole('button', { name: 'エクスポート' }));

    await waitFor(() => {
      expect(screen.getByText('サーバーエラー')).toBeInTheDocument();
    });
  });
});
