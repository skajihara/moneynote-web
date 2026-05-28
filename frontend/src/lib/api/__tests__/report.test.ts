import { apiClient } from '../client';
import {
  getMonthlyReport,
  getAnnualReport,
  getCategorySummary,
  getAnnualCategorySummary,
  getBalanceHistory,
  getAllTimeCategorySummary,
  getCategoryTransactions,
} from '../report';

jest.mock('../client');
const mockedApiClient = jest.mocked(apiClient);

beforeEach(() => {
  mockedApiClient.mockReset();
  mockedApiClient.mockResolvedValue({ data: null, error: null, timestamp: '' });
});

describe('report api', () => {
  it('getMonthlyReport calls correct endpoint', async () => {
    await getMonthlyReport('ldg_1', 2026, 5);
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/reports/monthly?year=2026&month=5'
    );
  });

  it('getAnnualReport calls correct endpoint', async () => {
    await getAnnualReport('ldg_1', 2026);
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/reports/annual?year=2026'
    );
  });

  it('getCategorySummary without type', async () => {
    await getCategorySummary('ldg_1', 2026, 5);
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/categories/summary?year=2026&month=5'
    );
  });

  it('getCategorySummary with type EXPENSE', async () => {
    await getCategorySummary('ldg_1', 2026, 5, 'EXPENSE');
    const url = mockedApiClient.mock.calls[0][0] as string;
    expect(url).toContain('type=EXPENSE');
  });

  it('getAnnualCategorySummary without type', async () => {
    await getAnnualCategorySummary('ldg_1', 2026);
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/categories/summary/annual?year=2026'
    );
  });

  it('getAnnualCategorySummary with type INCOME', async () => {
    await getAnnualCategorySummary('ldg_1', 2026, 'INCOME');
    const url = mockedApiClient.mock.calls[0][0] as string;
    expect(url).toContain('type=INCOME');
  });

  it('getBalanceHistory calls correct endpoint', async () => {
    await getBalanceHistory('ldg_1');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/reports/balance-history'
    );
  });

  it('getAllTimeCategorySummary without type', async () => {
    await getAllTimeCategorySummary('ldg_1');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/categories/summary/all-time'
    );
  });

  it('getAllTimeCategorySummary with type EXPENSE', async () => {
    await getAllTimeCategorySummary('ldg_1', 'EXPENSE');
    const url = mockedApiClient.mock.calls[0][0] as string;
    expect(url).toContain('type=EXPENSE');
  });

  it('getCategoryTransactions without month', async () => {
    await getCategoryTransactions('ldg_1', 'cat_1', 2026);
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/categories/cat_1/transactions?year=2026'
    );
  });

  it('getCategoryTransactions with month', async () => {
    await getCategoryTransactions('ldg_1', 'cat_1', 2026, 5);
    const url = mockedApiClient.mock.calls[0][0] as string;
    expect(url).toContain('month=5');
  });
});
