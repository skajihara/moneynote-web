'use client';

import { useRef, useState } from 'react';
import { importCsv, CsvImportResponse } from '@/lib/api/csv';
import { ApiClientError } from '@/lib/api/client';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

type Props = {
  ledgerId: string;
};

const CsvImport = ({ ledgerId }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvImportResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setResult(null);
    setError(null);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await importCsv(ledgerId, selectedFile);
      setResult(res.data);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.error.message : 'インポートに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">CSVインポート</h2>
      <p className="text-sm text-gray-500">
        エクスポートしたCSVファイルを取り込みます。既存の明細は変更されません。
      </p>

      <div className="space-y-1">
        <label className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          ファイルを選択
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>
        {selectedFile ? (
          <p className="text-sm text-gray-500">
            {selectedFile.name}（{formatFileSize(selectedFile.size)}）
          </p>
        ) : (
          <p className="text-sm text-gray-400">ファイルが選択されていません</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        onClick={handleImport}
        disabled={!selectedFile || loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'インポート中...' : 'インポート'}
      </button>

      {result && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-2">
          <p className="text-sm font-medium text-gray-800">インポート完了</p>
          <div className="text-sm text-gray-600 space-y-1">
            <p>取り込み件数: <span className="font-medium text-green-700">{result.importedCount}件</span></p>
            {result.skippedCount > 0 && (
              <p>スキップ件数: <span className="font-medium text-yellow-700">{result.skippedCount}件</span></p>
            )}
          </div>
          {result.newCategoriesCreated.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-700">新規作成したカテゴリ:</p>
              <p className="text-xs text-blue-600">{result.newCategoriesCreated.join('、')}</p>
            </div>
          )}
          {result.errorRows.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-700">エラー行:</p>
              <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                {result.errorRows.map((row) => (
                  <li key={row.rowNumber} className="flex gap-2">
                    <span className="font-medium">{row.rowNumber}行目:</span>
                    <span>{row.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CsvImport;
