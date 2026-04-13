import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FixedScopeDialog from '../FixedScopeDialog';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  mockPush.mockReset();
});

describe('FixedScopeDialog', () => {
  describe('deleteモード', () => {
    it('削除用のメッセージが表示される', () => {
      render(
        <FixedScopeDialog mode="delete" onConfirm={jest.fn()} onCancel={jest.fn()} />
      );
      expect(screen.getByText('固定費明細の削除')).toBeInTheDocument();
      expect(screen.getByText('この1件のみ削除する')).toBeInTheDocument();
      expect(screen.getByText('固定費設定を変更する')).toBeInTheDocument();
    });

    it('この1件のみ削除するボタンで onConfirm が呼ばれる', async () => {
      const handleConfirm = jest.fn();
      render(
        <FixedScopeDialog mode="delete" onConfirm={handleConfirm} onCancel={jest.fn()} />
      );
      await userEvent.click(screen.getByText('この1件のみ削除する'));
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('editモード', () => {
    it('編集用のメッセージが表示される', () => {
      render(
        <FixedScopeDialog mode="edit" onConfirm={jest.fn()} onCancel={jest.fn()} />
      );
      expect(screen.getByText('固定費明細の編集')).toBeInTheDocument();
      expect(screen.getByText('この1件のみ編集する')).toBeInTheDocument();
    });

    it('この1件のみ編集するボタンで onConfirm が呼ばれる', async () => {
      const handleConfirm = jest.fn();
      render(
        <FixedScopeDialog mode="edit" onConfirm={handleConfirm} onCancel={jest.fn()} />
      );
      await userEvent.click(screen.getByText('この1件のみ編集する'));
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('固定費設定を変更するボタンで /settings?tab=fixed に遷移する', async () => {
    const handleCancel = jest.fn();
    render(
      <FixedScopeDialog mode="delete" onConfirm={jest.fn()} onCancel={handleCancel} />
    );
    await userEvent.click(screen.getByText('固定費設定を変更する'));
    expect(handleCancel).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/settings?tab=fixed');
  });

  it('キャンセルボタンで onCancel が呼ばれる', async () => {
    const handleCancel = jest.fn();
    render(
      <FixedScopeDialog mode="delete" onConfirm={jest.fn()} onCancel={handleCancel} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
