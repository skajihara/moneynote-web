import { act } from 'react';
import { useSubPanelStore } from '../subPanelStore';

beforeEach(() => {
  useSubPanelStore.setState({ isOpen: false, content: null });
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
