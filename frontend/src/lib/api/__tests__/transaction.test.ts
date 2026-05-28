import { apiClient } from '../client';
import {
  getTransactions,
  getBalance,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  searchTransactions,
} from '../transaction';

jest.mock('../client');
const mockedApiClient = jest.mocked(apiClient);

beforeEach(() => {
  mockedApiClient.mockReset();
  mockedApiClient.mockResolvedValue({ data: null, error: null, timestamp: '' });
});

describe('transaction api', () => {
  it('getTransactions calls correct endpoint', async () => {
    await getTransactions('ldg_1', { year: 2026, month: 5 });
    const url = mockedApiClient.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/ledgers/ldg_1/transactions');
    expect(url).toContain('year=2026');
    expect(url).toContain('month=5');
  });

  it('getTransactions includes categoryId and type when specified', async () => {
    await getTransactions('ldg_1', { year: 2026, month: 5, categoryId: 'cat_1', type: 'EXPENSE' });
    const url = mockedApiClient.mock.calls[0][0] as string;
    expect(url).toContain('categoryId=cat_1');
    expect(url).toContain('type=EXPENSE');
  });

  it('getBalance calls correct endpoint', async () => {
    await getBalance('ldg_1');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/balance'
    );
  });

  it('createTransaction sends POST', async () => {
    await createTransaction('ldg_1', {
      transactionDate: '2026-05-01',
      transactionType: 'EXPENSE',
      amount: 1000,
      categoryId: 'cat_1',
    });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/transactions',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updateTransaction sends PUT', async () => {
    await updateTransaction('ldg_1', 'txn_1', {
      transactionDate: '2026-05-01',
      transactionType: 'EXPENSE',
      amount: 2000,
      categoryId: 'cat_1',
    });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/transactions/txn_1',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('deleteTransaction sends DELETE', async () => {
    await deleteTransaction('ldg_1', 'txn_1', 'SINGLE');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/transactions/txn_1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('searchTransactions calls correct endpoint', async () => {
    await searchTransactions('ldg_1', { keyword: 'test' });
    const url = mockedApiClient.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/ledgers/ldg_1/transactions/search');
    expect(url).toContain('keyword=test');
  });

  it('searchTransactions includes all params when specified', async () => {
    await searchTransactions('ldg_1', {
      keyword: 'test',
      categoryId: 'cat_1',
      startDate: '2026-01-01',
      endDate: '2026-05-31',
    });
    const url = mockedApiClient.mock.calls[0][0] as string;
    expect(url).toContain('categoryId=cat_1');
    expect(url).toContain('startDate=2026-01-01');
    expect(url).toContain('endDate=2026-05-31');
  });
});
