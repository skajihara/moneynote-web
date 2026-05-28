import { apiClient } from '../client';
import {
  register,
  login,
  logout,
  refresh,
  requestPasswordReset,
  confirmPasswordReset,
  cancelAccountDeletion,
  confirmEmailChange,
} from '../auth';

jest.mock('../client');
const mockedApiClient = jest.mocked(apiClient);

beforeEach(() => {
  mockedApiClient.mockResolvedValue({ data: null, error: null, timestamp: '' });
});

describe('auth api', () => {
  it('register sends POST to /api/v1/auth/register', async () => {
    await register({ userId: 'u1', userName: 'User', email: 'a@b.com', password: 'pw' });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      expect.objectContaining({ method: 'POST', skipRefresh: true })
    );
  });

  it('login sends POST to /api/v1/auth/login', async () => {
    await login({ userId: 'u1', password: 'pw' });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({ method: 'POST', skipRefresh: true })
    );
  });

  it('logout sends POST to /api/v1/auth/logout', async () => {
    await logout();
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      expect.objectContaining({ method: 'POST', skipRefresh: true })
    );
  });

  it('refresh sends POST to /api/v1/auth/refresh', async () => {
    await refresh();
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/auth/refresh',
      expect.objectContaining({ method: 'POST', skipRefresh: true })
    );
  });

  it('requestPasswordReset sends POST to /api/v1/auth/password-reset/request', async () => {
    await requestPasswordReset('a@b.com');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/auth/password-reset/request',
      expect.objectContaining({ method: 'POST', skipRefresh: true })
    );
  });

  it('confirmPasswordReset sends POST to /api/v1/auth/password-reset/confirm', async () => {
    await confirmPasswordReset('tok', 'newpw');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/auth/password-reset/confirm',
      expect.objectContaining({ method: 'POST', skipRefresh: true })
    );
  });

  it('cancelAccountDeletion sends POST to /api/v1/auth/account-deletion/cancel', async () => {
    await cancelAccountDeletion('tok');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/auth/account-deletion/cancel',
      expect.objectContaining({ method: 'POST', skipRefresh: true })
    );
  });

  it('confirmEmailChange sends POST to /api/v1/auth/email-change/confirm', async () => {
    await confirmEmailChange('tok');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/auth/email-change/confirm',
      expect.objectContaining({ method: 'POST', skipRefresh: true })
    );
  });
});
