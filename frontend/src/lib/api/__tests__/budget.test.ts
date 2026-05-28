import { apiClient } from '../client';
import { getBudgets, upsertBudget, deleteBudget, getBudgetHeatmap } from '../budget';

jest.mock('../client');
const mockedApiClient = jest.mocked(apiClient);

beforeEach(() => {
  mockedApiClient.mockResolvedValue({ data: null, error: null, timestamp: '' });
});

describe('budget api', () => {
  it('getBudgets calls correct endpoint', async () => {
    await getBudgets('ldg_1', 2026, 5);
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/budgets?year=2026&month=5'
    );
  });

  it('upsertBudget sends POST', async () => {
    await upsertBudget('ldg_1', { categoryId: 'cat_1', year: 2026, month: 5, amount: 10000 });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/budgets',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('deleteBudget sends DELETE', async () => {
    await deleteBudget('ldg_1', 'bgt_1');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/budgets/bgt_1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('getBudgetHeatmap calls correct endpoint with default months', async () => {
    await getBudgetHeatmap('ldg_1');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/budgets/heatmap?months=12'
    );
  });

  it('getBudgetHeatmap calls correct endpoint with custom months', async () => {
    await getBudgetHeatmap('ldg_1', 6);
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/budgets/heatmap?months=6'
    );
  });
});
