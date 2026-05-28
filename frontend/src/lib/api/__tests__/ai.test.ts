import { apiClient } from '../client';
import { getAiSummary, analyzeAi, getAiScore } from '../ai';

jest.mock('../client');
const mockedApiClient = jest.mocked(apiClient);

beforeEach(() => {
  mockedApiClient.mockResolvedValue({ data: null, error: null, timestamp: '' });
});

describe('ai api', () => {
  it('getAiSummary calls correct endpoint', async () => {
    await getAiSummary('ldg_1', 'monthly');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/ai/summary?period=monthly'
    );
  });

  it('analyzeAi sends POST to correct endpoint', async () => {
    await analyzeAi('ldg_1', 'monthly', 'saving');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/ai/analyze',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('getAiScore calls correct endpoint', async () => {
    await getAiScore('ldg_1');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/ai/score'
    );
  });
});
