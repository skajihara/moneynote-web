import { act } from 'react';
import { useToastStore } from '../toastStore';

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe('toastStore', () => {
  it('add でトーストが追加される', () => {
    act(() => {
      useToastStore.getState().add('success', 'テスト成功');
    });
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].message).toBe('テスト成功');
    expect(toasts[0].id).toBeDefined();
  });

  it('remove で指定した id のトーストが削除される', () => {
    act(() => {
      useToastStore.getState().add('error', 'エラー');
    });
    const { toasts } = useToastStore.getState();
    const id = toasts[0].id;

    act(() => {
      useToastStore.getState().remove(id);
    });
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('複数のトーストを追加できる', () => {
    act(() => {
      useToastStore.getState().add('success', 'msg1');
      useToastStore.getState().add('warning', 'msg2');
      useToastStore.getState().add('error', 'msg3');
    });
    expect(useToastStore.getState().toasts).toHaveLength(3);
  });
});
