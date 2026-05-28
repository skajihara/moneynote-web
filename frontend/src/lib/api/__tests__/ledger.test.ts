import { apiClient } from '../client';
import {
  getLedgers,
  createLedger,
  getLedger,
  updateLedger,
  deleteLedger,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryOrder,
  getMembers,
  addMember,
  updateMember,
  removeMember,
} from '../ledger';

jest.mock('../client');
const mockedApiClient = jest.mocked(apiClient);

beforeEach(() => {
  mockedApiClient.mockReset();
  mockedApiClient.mockResolvedValue({ data: null, error: null, timestamp: '' });
});

describe('ledger api', () => {
  it('getLedgers calls /api/v1/ledgers', async () => {
    await getLedgers();
    expect(mockedApiClient).toHaveBeenCalledWith('/api/v1/ledgers');
  });

  it('createLedger sends POST', async () => {
    await createLedger({ ledgerName: 'テスト帳簿' });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('getLedger calls correct endpoint', async () => {
    await getLedger('ldg_1');
    expect(mockedApiClient).toHaveBeenCalledWith('/api/v1/ledgers/ldg_1');
  });

  it('updateLedger sends PUT', async () => {
    await updateLedger('ldg_1', { ledgerName: '更新後' });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('deleteLedger sends DELETE', async () => {
    await deleteLedger('ldg_1');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('getCategories calls correct endpoint without type', async () => {
    await getCategories('ldg_1');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/categories'
    );
  });

  it('getCategories includes type query when specified', async () => {
    await getCategories('ldg_1', 'EXPENSE');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/categories?type=EXPENSE'
    );
  });

  it('createCategory sends POST', async () => {
    await createCategory('ldg_1', { categoryName: '食費', categoryType: 'EXPENSE' });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/categories',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updateCategory sends PUT', async () => {
    await updateCategory('ldg_1', 'cat_1', { categoryName: '交通費' });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/categories/cat_1',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('deleteCategory sends DELETE', async () => {
    await deleteCategory('ldg_1', 'cat_1');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/categories/cat_1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('updateCategoryOrder sends PUT to order endpoint', async () => {
    await updateCategoryOrder('ldg_1', [{ categoryId: 'cat_1', displayOrder: 0 }]);
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/categories/order',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('getMembers calls correct endpoint', async () => {
    await getMembers('ldg_1');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/members'
    );
  });

  it('addMember sends POST', async () => {
    await addMember('ldg_1', { userId: 'u2', permissionType: 'VIEWER' });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/members',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updateMember sends PUT', async () => {
    await updateMember('ldg_1', 'u2', { permissionType: 'EDITOR' });
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/members/u2',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('removeMember sends DELETE', async () => {
    await removeMember('ldg_1', 'u2');
    expect(mockedApiClient).toHaveBeenCalledWith(
      '/api/v1/ledgers/ldg_1/members/u2',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
