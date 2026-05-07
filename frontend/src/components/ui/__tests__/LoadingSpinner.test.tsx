import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('読み込み中テキストを表示する', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('デフォルトは通常サイズ（py-8）', () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('py-8');
  });

  it('デフォルトのSVGはw-6サイズ', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.className.baseVal).toContain('w-6');
  });

  it('compact=true のとき小さいサイズになる', () => {
    const { container } = render(<LoadingSpinner compact />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('py-3');
    expect(wrapper.className).not.toContain('py-8');
  });
});
