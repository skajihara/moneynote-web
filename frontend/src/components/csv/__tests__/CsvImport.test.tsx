import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CsvImport from '../CsvImport';
import * as csvApi from '@/lib/api/csv';
import { ApiClientError } from '@/lib/api/client';

jest.mock('@/lib/api/csv');

const mockImportCsv = jest.mocked(csvApi.importCsv);

describe('CsvImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('インポートボタンが表示される', () => {
    render(<CsvImport ledgerId="ldg_1" />);
    expect(screen.getByRole('button', { name: 'インポート' })).toBeInTheDocument();
  });

  it('ファイル未選択時はボタンが無効', () => {
    render(<CsvImport ledgerId="ldg_1" />);
    expect(screen.getByRole('button', { name: 'インポート' })).toBeDisabled();
  });

  it('ファイル未選択時は「ファイルが選択されていません」が表示される', () => {
    render(<CsvImport ledgerId="ldg_1" />);
    expect(screen.getByText('ファイルが選択されていません')).toBeInTheDocument();
  });

  it('ファイル選択後にファイル名とサイズが表示される', async () => {
    render(<CsvImport ledgerId="ldg_1" />);

    const content = 'dummy csv content';
    const file = new File([content], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(screen.getByText(/test\.csv（.+）/)).toBeInTheDocument();
  });

  it('ファイル選択後にインポートしてresultが表示される', async () => {
    mockImportCsv.mockResolvedValue({
      data: {
        importedCount: 3,
        skippedCount: 1,
        newCategoriesCreated: ['交通費'],
        errorRows: [{ rowNumber: 2, reason: '日付が不正' }],
      },
      error: null,
      timestamp: '',
    });

    render(<CsvImport ledgerId="ldg_1" />);

    const file = new File(['dummy csv'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole('button', { name: 'インポート' }));

    await waitFor(() => {
      expect(mockImportCsv).toHaveBeenCalledWith('ldg_1', file);
      expect(screen.getByText(/3件/)).toBeInTheDocument();
      expect(screen.getByText(/1件/)).toBeInTheDocument();
      // 新規カテゴリ表示
      expect(screen.getByText('新規作成したカテゴリ:')).toBeInTheDocument();
      expect(screen.getByText('交通費')).toBeInTheDocument();
      // エラー行表示
      expect(screen.getByText('2行目:')).toBeInTheDocument();
      expect(screen.getByText('日付が不正')).toBeInTheDocument();
    });
  });

  it('新規カテゴリがない場合は新規カテゴリ欄を表示しない', async () => {
    mockImportCsv.mockResolvedValue({
      data: {
        importedCount: 2,
        skippedCount: 0,
        newCategoriesCreated: [],
        errorRows: [],
      },
      error: null,
      timestamp: '',
    });

    render(<CsvImport ledgerId="ldg_1" />);

    const file = new File(['csv'], 'ok.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole('button', { name: 'インポート' }));

    await waitFor(() => {
      expect(screen.getByText(/2件/)).toBeInTheDocument();
      expect(screen.queryByText('新規作成したカテゴリ:')).not.toBeInTheDocument();
    });
  });

  it('エラー時にメッセージが表示される', async () => {
    mockImportCsv.mockRejectedValue(new ApiClientError({ code: 'E400', message: 'ヘッダーが不正です' }));

    render(<CsvImport ledgerId="ldg_1" />);

    const file = new File(['bad csv'], 'bad.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole('button', { name: 'インポート' }));

    await waitFor(() => {
      expect(screen.getByText('ヘッダーが不正です')).toBeInTheDocument();
    });
  });
});
