import { apiClient } from '../client';
import { getProfile, updateProfile, changePassword, updateTheme, deleteAccount } from '../user';

jest.mock('../client');
const mockedApiClient = jest.mocked(apiClient);

beforeEach(() => {
  mockedApiClient.mockResolvedValue({ data: null, error: null, timestamp: '' });
});

describe('user api', () => {
  it('getProfile calls /api/v1/users/me', async () => {
    await getProfile();
    expect(mockedApiClient).toHaveBeenCalledWith('/api/v1/users/me');
  });

  it('updateProfile sends PUT to /api/v1/users/me', async () => {
    await updateProfile({ userName: 'テストユーザー', email: 'test@example.com' });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/users/me',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('changePassword sends PUT to /api/v1/users/me/password', async () => {
    await changePassword({ currentPassword: 'old', newPassword: 'new' });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/users/me/password',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('updateTheme sends PUT to /api/v1/users/me/theme', async () => {
    await updateTheme({ themeColor: '#ff0000' });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/users/me/theme',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('deleteAccount sends DELETE to /api/v1/users/me', async () => {
    await deleteAccount();
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/users/me',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
