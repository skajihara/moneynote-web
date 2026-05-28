import { apiClient } from '../client';
import {
  getFixedTransactions,
  createFixedTransaction,
  updateFixedTransaction,
  deleteFixedTransaction,
  generateFixedTransactions,
} from '../fixed';

jest.mock('../client');
const mockedApiClient = jest.mocked(apiClient);

beforeEach(() => {
  mockedApiClient.mockResolvedValue({ data: null, error: null, timestamp: '' });
});

describe('fixed api', () => {
  it('getFixedTransactions calls correct endpoint without status', async () => {
    await getFixedTransactions('ldg_1');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/fixed-transactions'
    );
  });

  it('getFixedTransactions includes status query when specified', async () => {
    await getFixedTransactions('ldg_1', 'ACTIVE');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/fixed-transactions?status=ACTIVE'
    );
  });

  it('createFixedTransaction sends POST', async () => {
    await createFixedTransaction('ldg_1', {
      fixedName: 'テスト',
      transactionType: 'EXPENSE',
      categoryId: 'cat_1',
      amount: 1000,
      dayOfMonth: 1,
      intervalType: 'MONTHLY',
      startDate: '2026-01-01',
    });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/fixed-transactions',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updateFixedTransaction sends PUT', async () => {
    await updateFixedTransaction('ldg_1', 'fix_1', {
      fixedName: 'テスト更新',
      transactionType: 'EXPENSE',
      categoryId: 'cat_1',
      amount: 2000,
      dayOfMonth: 1,
      intervalType: 'MONTHLY',
      startDate: '2026-01-01',
    });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/fixed-transactions/fix_1',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('deleteFixedTransaction sends DELETE', async () => {
    await deleteFixedTransaction('ldg_1', 'fix_1');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/fixed-transactions/fix_1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('generateFixedTransactions sends POST to generate endpoint', async () => {
    await generateFixedTransactions('ldg_1', 'fix_1');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/fixed-transactions/fix_1/generate',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
