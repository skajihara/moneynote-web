import { act } from 'react';
import { useSubPanelStore } from '../subPanelStore';

beforeEach(() => {
  useSubPanelStore.setState({ isOpen: false, content: null, contentKey: 0 });
});

describe('subPanelStore', () => {
  it('open で isOpen=true になり content がセットされる', () => {
    act(() => {
      useSubPanelStore.getState().open('テストコンテンツ');
    });
    const state = useSubPanelStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.content).toBe('テストコンテンツ');
  });

  it('open を複数回呼ぶたびに contentKey がインクリメントされる', () => {
    act(() => {
      useSubPanelStore.getState().open('コンテンツA');
    });
    expect(useSubPanelStore.getState().contentKey).toBe(1);

    act(() => {
      useSubPanelStore.getState().open('コンテンツB');
    });
    expect(useSubPanelStore.getState().contentKey).toBe(2);
  });

  it('close で isOpen=false になり content がクリアされる', () => {
    act(() => {
      useSubPanelStore.getState().open('コンテンツ');
      useSubPanelStore.getState().close();
    });
    const state = useSubPanelStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.content).toBeNull();
  });
});
