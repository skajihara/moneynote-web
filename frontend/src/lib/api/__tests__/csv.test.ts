import { exportCsv, importCsv } from '../csv';
import { ApiClientError } from '../client';
import { useAuthStore } from '@/stores/authStore';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  useAuthStore.setState({ userId: null, userName: null, accessToken: null, isAuthenticated: false });
});

describe('csv api', () => {
  describe('exportCsv', () => {
    it('calls correct URL without params', async () => {
      const mockBlob = new Blob(['csv content'], { type: 'text/csv' });
      mockFetch.mockResolvedValueOnce({ ok: true, blob: async () => mockBlob });

      const result = await exportCsv('ldg_1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/ledgers/ldg_1/transactions/export'),
        expect.any(Object)
      );
      expect(result).toBe(mockBlob);
    });

    it('includes query params when specified', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, blob: async () => new Blob() });

      await exportCsv('ldg_1', {
        startDate: '2026-01-01',
        endDate: '2026-05-31',
        categoryIds: ['cat_1', 'cat_2'],
        includeFixed: false,
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('startDate=2026-01-01');
      expect(calledUrl).toContain('endDate=2026-05-31');
      expect(calledUrl).toContain('categoryIds=cat_1');
      expect(calledUrl).toContain('categoryIds=cat_2');
      expect(calledUrl).toContain('includeFixed=false');
    });

    it('attaches Authorization header when token exists', async () => {
      useAuthStore.setState({ accessToken: 'my-token', isAuthenticated: true, userId: 'u1', userName: 'u1' });
      mockFetch.mockResolvedValueOnce({ ok: true, blob: async () => new Blob() });

      await exportCsv('ldg_1');

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer my-token');
    });

    it('throws ApiClientError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: { code: 'E403', message: 'アクセス拒否' } }),
      });

      await expect(exportCsv('ldg_1')).rejects.toThrow(ApiClientError);
    });

    it('throws ApiClientError with fallback code when json parsing fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => { throw new Error('not json'); },
      });

      await expect(exportCsv('ldg_1')).rejects.toThrow(ApiClientError);
    });
  });

  describe('importCsv', () => {
    const mockFile = new File(['date,amount\n2026-01-01,1000'], 'test.csv', { type: 'text/csv' });

    it('sends POST with FormData', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { importedCount: 1, skippedCount: 0, newCategoriesCreated: [], errorRows: [] },
          error: null,
          timestamp: '',
        }),
      });

      const result = await importCsv('ldg_1', mockFile);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/ledgers/ldg_1/transactions/import'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.data.importedCount).toBe(1);
    });

    it('attaches Authorization header when token exists', async () => {
      useAuthStore.setState({ accessToken: 'import-token', isAuthenticated: true, userId: 'u1', userName: 'u1' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { importedCount: 0, skippedCount: 0, newCategoriesCreated: [], errorRows: [] }, error: null, timestamp: '' }),
      });

      await importCsv('ldg_1', mockFile);

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer import-token');
    });

    it('throws ApiClientError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: { code: 'E400', message: 'ファイル形式エラー' } }),
      });

      await expect(importCsv('ldg_1', mockFile)).rejects.toThrow(ApiClientError);
    });
  });
});
