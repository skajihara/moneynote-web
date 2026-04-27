import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getLedgers as getLedgersApi, createLedger as createLedgerApi } from '@/lib/api/ledger';
import type { Ledger, CreateLedgerRequest } from '@/lib/api/ledger';

const DEFAULT_THEME_COLOR = '#4A90D9';

function applyThemeColor(ledgers: Ledger[], ledgerId: string | null) {
  if (typeof document === 'undefined') return;
  const ledger = ledgers.find((l) => l.ledgerId === ledgerId);
  const color = ledger?.themeColor || DEFAULT_THEME_COLOR;
  document.documentElement.style.setProperty('--theme-color', color);
}

type LedgerState = {
  ledgers: Ledger[];
  selectedLedgerId: string | null;
};

type LedgerActions = {
  fetchLedgers: () => Promise<void>;
  selectLedger: (ledgerId: string) => void;
  createLedger: (data: CreateLedgerRequest) => Promise<Ledger>;
  getSelectedLedger: () => Ledger | null;
};

export const useLedgerStore = create<LedgerState & LedgerActions>()(
  persist(
    (set, get) => ({
      ledgers: [],
      selectedLedgerId: null,

      fetchLedgers: async () => {
        const result = await getLedgersApi();
        const ledgers = result.data;
        set({ ledgers });
        // selectedLedgerId が未設定または存在しない帳簿を指していた場合は先頭を選択する
        const { selectedLedgerId } = get();
        const isValid = ledgers.some((l) => l.ledgerId === selectedLedgerId);
        const finalId = isValid ? selectedLedgerId : (ledgers.length > 0 ? ledgers[0].ledgerId : null);
        if (!isValid && ledgers.length > 0) {
          set({ selectedLedgerId: ledgers[0].ledgerId });
        }
        applyThemeColor(ledgers, finalId);
      },

      selectLedger: (ledgerId) => {
        set({ selectedLedgerId: ledgerId });
        const { ledgers } = get();
        applyThemeColor(ledgers, ledgerId);
      },

      createLedger: async (data) => {
        const result = await createLedgerApi(data);
        const created = result.data;
        set((state) => ({
          ledgers: [...state.ledgers, created],
          selectedLedgerId: created.ledgerId,
        }));
        applyThemeColor([...get().ledgers], created.ledgerId);
        return created;
      },

      getSelectedLedger: () => {
        const { ledgers, selectedLedgerId } = get();
        return ledgers.find((l) => l.ledgerId === selectedLedgerId) ?? null;
      },
    }),
    {
      name: 'moneynote-ledger',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? sessionStorage : ({} as Storage)
      ),
      // selectedLedgerId のみ永続化（ledgers はAPIから再取得する）
      partialize: (state) => ({ selectedLedgerId: state.selectedLedgerId }),
    }
  )
);
