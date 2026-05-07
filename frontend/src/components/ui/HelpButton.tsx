'use client';

const BASE_URL = 'https://skajihara.github.io/moneynote-web';

type Props = {
  manualPath: string;
};

const HelpButton = ({ manualPath }: Props) => {
  const handleClick = () => {
    window.open(
      `${BASE_URL}/${manualPath}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <button
      onClick={handleClick}
      title="このページのマニュアル"
      aria-label="このページのマニュアル"
      className="text-white border border-white/40 rounded-md px-2 py-1 hover:bg-white/20 transition-colors text-base leading-none"
    >
      📖
    </button>
  );
};

export default HelpButton;
