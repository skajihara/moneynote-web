import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getLedgers as getLedgersApi, createLedger as createLedgerApi } from '@/lib/api/ledger';
import type { Ledger, CreateLedgerRequest } from '@/lib/api/ledger';

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
        if (!isValid && ledgers.length > 0) {
          set({ selectedLedgerId: ledgers[0].ledgerId });
        }
      },

      selectLedger: (ledgerId) => {
        set({ selectedLedgerId: ledgerId });
      },

      createLedger: async (data) => {
        const result = await createLedgerApi(data);
        const created = result.data;
        set((state) => ({
          ledgers: [...state.ledgers, created],
          selectedLedgerId: created.ledgerId,
        }));
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
