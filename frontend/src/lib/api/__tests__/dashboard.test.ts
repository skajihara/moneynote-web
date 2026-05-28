import { apiClient } from '../client';
import { getDashboard } from '../dashboard';

jest.mock('../client');
const mockedApiClient = jest.mocked(apiClient);

beforeEach(() => {
  mockedApiClient.mockResolvedValue({ data: null, error: null, timestamp: '' });
});

describe('dashboard api', () => {
  it('getDashboard calls correct endpoint without recentCount', async () => {
    await getDashboard('ldg_1', 2026, 5);
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/dashboard?year=2026&month=5'
    );
  });

  it('getDashboard includes recentCount when specified', async () => {
    await getDashboard('ldg_1', 2026, 5, 10);
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/dashboard?year=2026&month=5&recentCount=10'
    );
  });
});
