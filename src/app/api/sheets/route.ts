import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { ReceiptData, SheetResult } from '@/lib/types'

// Service account credentials come from env vars (set in Vercel dashboard)
function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}')
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID || ''
// Sheet name and header row — change if your sheet is named differently
const SHEET_NAME = 'Chitante'
const HEADERS = [
  'Nr. crt.',
  'Tip document',
  'Data',
  'Nr. document',
  'Furnizor',
  'CUI',
  'Sumă (Lei)',
  'Plată',
  'Explicații',
  'Data adăugării',
]

async function ensureHeaders(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string) {
  // Check if header row exists; if not, create it
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:J1`,
  })
  const firstRow = res.data.values?.[0]
  if (!firstRow || firstRow[0] !== 'Nr. crt.') {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<SheetResult>> {
  try {
    const body = (await req.json()) as { data: ReceiptData }
    const d = body.data

    const auth = getAuth()
    const sheets = google.sheets({ version: 'v4', auth })

    await ensureHeaders(sheets, SHEET_ID)

    // Get current row count to generate Nr. crt.
    const countRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    })
    const rowCount = (countRes.data.values?.length ?? 1) // includes header
    const nrCrt = rowCount // first data row = 2, so nrCrt = rowCount (1-based, header is row 1)

    const now = new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' })

    const row = [
      nrCrt,
      d.doc_type ?? '',
      d.date ?? '',
      d.doc_number ?? '',
      d.furnizor ?? '',
      d.cui ?? '',
      d.suma != null ? d.suma : '',
      d.plata ?? '',
      d.explicatii ?? '',
      now,
    ]

    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:J`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    })

    return NextResponse.json({ ok: true, range: appendRes.data.updates?.updatedRange ?? undefined })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Sheets error:', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
