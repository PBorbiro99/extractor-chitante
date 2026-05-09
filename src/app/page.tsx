'use client'

import { useState, useRef, useCallback } from 'react'
import { ReceiptData } from '@/lib/types'
import ReviewModal from '@/components/ReviewModal'
import HistoryTable from '@/components/HistoryTable'

type Status = 'idle' | 'extracting' | 'review' | 'saving' | 'saved' | 'error'

interface HistoryEntry {
  data: ReceiptData
  savedAt: string
  imageUrl: string
}

export default function Home() {
  const [status, setStatus] = useState<Status>('idle')
  const [extracted, setExtracted] = useState<ReceiptData | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setError(null)
    setStatus('extracting')
    setPreviewUrl(URL.createObjectURL(file))

    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/extract', { method: 'POST', body: fd })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setExtracted(json.data)
      setStatus('review')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eroare la extragere')
      setStatus('error')
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleSave = async (data: ReceiptData) => {
    setStatus('saving')
    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setHistory((h) => [
        { data, savedAt: new Date().toLocaleTimeString('ro-RO'), imageUrl: previewUrl! },
        ...h,
      ])
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eroare la salvare')
      setStatus('error')
    }
  }

  const reset = () => {
    setStatus('idle')
    setExtracted(null)
    setPreviewUrl(null)
    setError(null)
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Extractor Chitanțe</h1>
        <p className="text-sm text-gray-500 mt-1">Fotografiați sau încărcați o chitanță</p>
      </div>

      {/* Upload area */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        {status === 'idle' || status === 'error' || status === 'saved' ? (
          <div className="space-y-3">
            {/* Camera button — on mobile uses native camera */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-medium py-4 rounded-xl transition-all text-base"
            >
              <CameraIcon />
              Fotografiați chitanța
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* File upload fallback */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 hover:bg-gray-50 active:scale-95 text-gray-700 font-medium py-3 rounded-xl transition-all text-sm"
            >
              <UploadIcon />
              Încarcă din galerie / fișier
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {status === 'error' && (
              <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg p-3">{error}</p>
            )}
            {status === 'saved' && (
              <p className="text-green-700 text-sm text-center bg-green-50 rounded-lg p-3">
                ✓ Salvat în Google Sheets!
              </p>
            )}
          </div>
        ) : status === 'extracting' ? (
          <div className="flex flex-col items-center gap-4 py-6">
            {previewUrl && (
              <img src={previewUrl} alt="preview" className="w-40 h-40 object-cover rounded-xl" />
            )}
            <Spinner />
            <p className="text-gray-500 text-sm">Se extrag datele…</p>
          </div>
        ) : status === 'saving' ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <Spinner />
            <p className="text-gray-500 text-sm">Se salvează în Google Sheets…</p>
          </div>
        ) : null}
      </div>

      {/* Review modal */}
      {status === 'review' && extracted && previewUrl && (
        <ReviewModal
          data={extracted}
          imageUrl={previewUrl}
          onSave={handleSave}
          onDiscard={reset}
        />
      )}

      {/* History */}
      {history.length > 0 && <HistoryTable entries={history} />}
    </main>
  )
}

function CameraIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
  )
}
