import { act, render, screen, fireEvent } from '@testing-library/react';
import SubPanel from '../SubPanel';
import { useSubPanelStore, DEFAULT_PANEL_WIDTH } from '@/stores/subPanelStore';

beforeEach(() => {
  useSubPanelStore.setState({ panelWidth: DEFAULT_PANEL_WIDTH });
  Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
});

describe('SubPanel', () => {
  it('子要素をレンダリングする', () => {
    render(<SubPanel><div>パネルコンテンツ</div></SubPanel>);
    expect(screen.getByText('パネルコンテンツ')).toBeInTheDocument();
  });

  it('デフォルト幅でレンダリングされる', () => {
    const { container } = render(<SubPanel><div>content</div></SubPanel>);
    const aside = container.querySelector('aside');
    expect(aside).toHaveStyle({ width: `${DEFAULT_PANEL_WIDTH}px` });
  });

  it('ドラッグハンドルが表示される', () => {
    render(<SubPanel><div>content</div></SubPanel>);
    expect(screen.getByRole('separator', { name: 'パネル幅を調整' })).toBeInTheDocument();
  });

  it('左方向ドラッグで幅が広がる', () => {
    render(<SubPanel><div>content</div></SubPanel>);
    const handle = screen.getByRole('separator');

    // startWidth=640, startX=800, moveX=760 → delta=40 → 680
    fireEvent.mouseDown(handle, { clientX: 800 });
    fireEvent.mouseMove(window, { clientX: 760 });
    fireEvent.mouseUp(window);

    expect(useSubPanelStore.getState().panelWidth).toBe(680);
  });

  it('右方向ドラッグで幅が縮まり最小幅にクランプされる', () => {
    render(<SubPanel><div>content</div></SubPanel>);
    const handle = screen.getByRole('separator');

    // startWidth=640, startX=400, moveX=900 → delta=-500 → 140 → min=280
    fireEvent.mouseDown(handle, { clientX: 400 });
    fireEvent.mouseMove(window, { clientX: 900 });
    fireEvent.mouseUp(window);

    expect(useSubPanelStore.getState().panelWidth).toBe(280);
  });

  it('最小幅 280px 以下にはならない', () => {
    useSubPanelStore.setState({ panelWidth: 290 });
    render(<SubPanel><div>content</div></SubPanel>);
    const handle = screen.getByRole('separator');

    // 100px 右へ → 290-100=190 → クランプ=280
    fireEvent.mouseDown(handle, { clientX: 800 });
    fireEvent.mouseMove(window, { clientX: 900 });
    fireEvent.mouseUp(window);

    expect(useSubPanelStore.getState().panelWidth).toBe(280);
  });

  it('最大幅（画面幅の60%）を超えない', () => {
    render(<SubPanel><div>content</div></SubPanel>);
    const handle = screen.getByRole('separator');

    // innerWidth=1280, maxWidth=768。大きく左へドラッグ → クランプ=768
    fireEvent.mouseDown(handle, { clientX: 800 });
    fireEvent.mouseMove(window, { clientX: -200 });
    fireEvent.mouseUp(window);

    expect(useSubPanelStore.getState().panelWidth).toBe(768);
  });

  it('mouseup 後はドラッグが終了し追加 mousemove が無視される', () => {
    render(<SubPanel><div>content</div></SubPanel>);
    const handle = screen.getByRole('separator');

    // startWidth=640, startX=800, moveX=750 → delta=50 → 690
    fireEvent.mouseDown(handle, { clientX: 800 });
    fireEvent.mouseMove(window, { clientX: 750 });
    fireEvent.mouseUp(window);

    const widthAfterRelease = useSubPanelStore.getState().panelWidth;

    // mouseup 後の mousemove は幅を変えない
    fireEvent.mouseMove(window, { clientX: 600 });
    expect(useSubPanelStore.getState().panelWidth).toBe(widthAfterRelease);
  });

  it('ストアの panelWidth が変わると表示幅も更新される', () => {
    const { container } = render(<SubPanel><div>content</div></SubPanel>);
    act(() => {
      useSubPanelStore.setState({ panelWidth: 400 });
    });
    const aside = container.querySelector('aside');
    expect(aside).toHaveStyle({ width: '400px' });
  });
});
