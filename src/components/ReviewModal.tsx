'use client'

import { useState } from 'react'
import { ReceiptData, DocType, TransactionDirection } from '@/lib/types'

const DOC_TYPES: DocType[] = [
  'chitanta_furnizor',
  'chitanta_bancara_POS',
  'registru_de_casa',
  'bon_fiscal',
  'necunoscut',
]

const DOC_TYPE_LABELS: Record<DocType, string> = {
  chitanta_furnizor: 'Chitanță furnizor',
  chitanta_bancara_POS: 'Chitanță bancară POS',
  registru_de_casa: 'Registru de casă',
  bon_fiscal: 'Bon fiscal',
  necunoscut: 'Necunoscut',
}

interface DirectionOption {
  value: TransactionDirection
  label: string
  sublabel: string
  color: string
  activeColor: string
}

const DIRECTIONS: DirectionOption[] = [
  { value: 'incasari_numerar', label: 'Încasări',   sublabel: 'Numerar', color: 'border-gray-200 text-gray-600', activeColor: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { value: 'incasari_banca',   label: 'Încasări',   sublabel: 'Bancă',   color: 'border-gray-200 text-gray-600', activeColor: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { value: 'plati_numerar',    label: 'Plăți',      sublabel: 'Numerar', color: 'border-gray-200 text-gray-600', activeColor: 'border-rose-500 bg-rose-50 text-rose-700' },
  { value: 'plati_banca',      label: 'Plăți',      sublabel: 'Bancă',   color: 'border-gray-200 text-gray-600', activeColor: 'border-rose-500 bg-rose-50 text-rose-700' },
]

interface Props {
  data: ReceiptData
  imageUrl: string
  onSave: (data: ReceiptData) => void
  onDiscard: () => void
}

export default function ReviewModal({ data, imageUrl, onSave, onDiscard }: Props) {
  const [form, setForm] = useState<ReceiptData>({ ...data, direction: data.direction ?? null })

  const set = <K extends keyof ReceiptData>(key: K, value: ReceiptData[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const canSave = form.direction !== null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      {/* Receipt preview */}
      <img src={imageUrl} alt="chitanță" className="w-full h-48 object-cover object-top" />

      <div className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 text-base">Verificați datele extrase</h2>

        {/* Direction selector — most prominent, user must choose */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
            Coloana în registru <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DIRECTIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => set('direction', d.value)}
                className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all text-sm font-medium ${
                  form.direction === d.value ? d.activeColor : d.color + ' hover:bg-gray-50'
                }`}
              >
                <span className="font-semibold">{d.label}</span>
                <span className="text-xs opacity-75">{d.sublabel}</span>
              </button>
            ))}
          </div>
          {!form.direction && (
            <p className="text-xs text-amber-600 mt-1">Selectați o coloană pentru a putea salva</p>
          )}
        </div>

        {/* Doc type */}
        <Field label="Tip document">
          <select
            value={form.doc_type}
            onChange={(e) => set('doc_type', e.target.value as DocType)}
            className="input"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <input
              type="text"
              placeholder="DD/MM/YYYY"
              value={form.date ?? ''}
              onChange={(e) => set('date', e.target.value || null)}
              className="input"
            />
          </Field>
          <Field label="DOC.FELUL.NR">
            <input
              type="text"
              value={form.doc_number ?? ''}
              onChange={(e) => set('doc_number', e.target.value || null)}
              className="input"
            />
          </Field>
        </div>

        <Field label="Explicații">
          <input
            type="text"
            placeholder="Furnizor, referință factură, agent…"
            value={form.explicatii ?? ''}
            onChange={(e) => set('explicatii', e.target.value || null)}
            className="input"
          />
        </Field>

        <Field label="Sumă (Lei)">
          <input
            type="number"
            step="0.01"
            value={form.suma ?? ''}
            onChange={(e) => set('suma', e.target.value ? parseFloat(e.target.value) : null)}
            className="input"
          />
        </Field>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onDiscard}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Renunță
          </button>
          <button
            onClick={() => canSave && onSave(form)}
            disabled={!canSave}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
              canSave
                ? 'bg-sky-600 hover:bg-sky-700 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Salvează în Registru
          </button>
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #111827;
          background: #fff;
          outline: none;
          transition: border-color 0.15s;
        }
        .input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}
