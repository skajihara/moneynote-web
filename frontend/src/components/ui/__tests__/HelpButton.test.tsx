import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HelpButton from '../HelpButton';

const BASE_URL = 'https://skajihara.github.io/moneynote-web-manual';

beforeEach(() => {
  window.open = jest.fn();
});

describe('HelpButton', () => {
  it('📖 アイコンが表示される', () => {
    render(<HelpButton manualPath="dashboard" />);
    expect(screen.getByRole('button', { name: 'このページのマニュアル' })).toBeInTheDocument();
  });

  it('クリックで対応する GitHub Pages URL が新しいタブで開く', async () => {
    render(<HelpButton manualPath="dashboard" />);
    await userEvent.click(screen.getByRole('button', { name: 'このページのマニュアル' }));
    expect(window.open).toHaveBeenCalledWith(
      `${BASE_URL}/dashboard`,
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('manualPath が変わると URL も変わる', async () => {
    render(<HelpButton manualPath="transactions" />);
    await userEvent.click(screen.getByRole('button', { name: 'このページのマニュアル' }));
    expect(window.open).toHaveBeenCalledWith(
      `${BASE_URL}/transactions`,
      '_blank',
      'noopener,noreferrer'
    );
  });
});
