import { apiClient } from '../client';
import { sendContact } from '../contact';

jest.mock('../client');
const mockedApiClient = jest.mocked(apiClient);

beforeEach(() => {
  mockedApiClient.mockResolvedValue({ data: null, error: null, timestamp: '' });
});

describe('contact api', () => {
  it('sendContact sends POST to /api/v1/contact', async () => {
    await sendContact('件名', '本文');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/contact',
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse(mockedApiClient.mock.calls[0][1]?.body as string);
    expect(body).toEqual({ subject: '件名', body: '本文' });
  });
});
