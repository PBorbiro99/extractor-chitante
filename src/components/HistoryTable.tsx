'use client'

import { ReceiptData } from '@/lib/types'

interface Entry {
  data: ReceiptData
  savedAt: string
  imageUrl: string
}

export default function HistoryTable({ entries }: { entries: Entry[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 text-sm">
          Salvate în această sesiune ({entries.length})
        </h2>
      </div>
      <div className="divide-y divide-gray-100">
        {entries.map((e, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3">
            <img
              src={e.imageUrl}
              alt=""
              className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {e.data.furnizor ?? e.data.doc_type}
              </p>
              <p className="text-xs text-gray-500">
                {e.data.date} · {e.data.suma != null ? `${e.data.suma.toFixed(2)} Lei` : '—'}
              </p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{e.savedAt}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
