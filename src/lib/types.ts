export type DocType =
  | 'chitanta_furnizor'
  | 'chitanta_bancara_POS'
  | 'registru_de_casa'
  | 'bon_fiscal'
  | 'necunoscut'

export interface ReceiptData {
  doc_type: DocType
  date: string | null           // DD/MM/YYYY
  doc_number: string | null
  furnizor: string | null
  cui: string | null
  suma: number | null
  plata: 'numerar' | 'card/banca' | 'mixt' | null
  explicatii: string | null
}

export interface ExtractResult {
  ok: boolean
  data?: ReceiptData
  error?: string
}

export interface SheetResult {
  ok: boolean
  range?: string
  error?: string
}
