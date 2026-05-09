import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { ReceiptData, SheetResult } from '@/lib/types'

export const runtime = 'nodejs'

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}')
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID || ''

// Column layout (A–H):
// A = NR.CRT | B = DATA | C = DOC.FELUL.NR | D = EXPLICATII
// E = INCASARI NUMERAR | F = INCASARI CARD
// G = PLATI NUMERAR   | H = PLATI CARD
// Headers at rows 8–9, data starts at row 10

const SOLID_BORDER = {
  style: 'SOLID',
  width: 1,
  color: { red: 0, green: 0, blue: 0, alpha: 1 },
}

function borderRequest(sheetId: number, startRow: number, endRow: number, startCol: number, endCol: number) {
  return {
    updateBorders: {
      range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
      top: SOLID_BORDER,
      bottom: SOLID_BORDER,
      left: SOLID_BORDER,
      right: SOLID_BORDER,
      innerHorizontal: SOLID_BORDER,
      innerVertical: SOLID_BORDER,
    },
  }
}

async function getSheetName(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<string> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const firstSheet = meta.data.sheets?.[0]
  const title = firstSheet?.properties?.title
  if (!title) throw new Error('Could not determine sheet name')
  return title
}

async function getSheetId(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  return meta.data.sheets?.[0]?.properties?.sheetId ?? 0
}

async function ensureHeaders(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  safeName: string,
  sheetId: number
) {
  const check = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${safeName}!A8:H8`,
  })
  const row8 = check.data.values?.[0]
  if (row8 && row8[4] === 'Incasari') return

  // Write header values
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        {
          range: `${safeName}!A8:H8`,
          values: [['NR.CRT', 'DATA', 'DOC.FELUL.NR', 'EXPLICATII', 'Incasari', '', 'Plati', '']],
        },
        {
          range: `${safeName}!A9:H9`,
          values: [['', '', '', '', 'Numerar', 'Card', 'Numerar', 'Card']],
        },
      ],
    },
  })

  // Merge + borders on headers
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        // Merge Incasari across E8:F8
        {
          mergeCells: {
            range: { sheetId, startRowIndex: 7, endRowIndex: 8, startColumnIndex: 4, endColumnIndex: 6 },
            mergeType: 'MERGE_ALL',
          },
        },
        // Merge Plati across G8:H8
        {
          mergeCells: {
            range: { sheetId, startRowIndex: 7, endRowIndex: 8, startColumnIndex: 6, endColumnIndex: 8 },
            mergeType: 'MERGE_ALL',
          },
        },
        // Borders on the full header block A8:H9
        borderRequest(sheetId, 7, 9, 0, 8),
      ],
    },
  })
}

async function applyRowBorder(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number // 0-based
) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [borderRequest(sheetId, rowIndex, rowIndex + 1, 0, 8)],
    },
  })
}

async function getFirstEmptyDataRow(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  safeName: string
): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${safeName}!A10:A`,
  })
  const values = res.data.values ?? []
  for (let i = 0; i < values.length; i++) {
    if (!values[i]?.[0]) return 10 + i
  }
  return 10 + values.length
}

export async function POST(req: NextRequest): Promise<NextResponse<SheetResult>> {
  try {
    const body = (await req.json()) as { data: ReceiptData }
    const d = body.data

    const auth = getAuth()
    const sheets = google.sheets({ version: 'v4', auth })

    const sheetName = await getSheetName(sheets, SHEET_ID)
    const safeName = `'${sheetName}'`
    const sheetId = await getSheetId(sheets, SHEET_ID)

    await ensureHeaders(sheets, SHEET_ID, safeName, sheetId)

    const targetRow = await getFirstEmptyDataRow(sheets, SHEET_ID, safeName)
    const nrCrt = targetRow - 9

    const suma = d.suma != null ? d.suma : ''
    const incasariNumerar = d.direction === 'incasari_numerar' ? suma : ''
    const incasariBanca   = d.direction === 'incasari_banca'   ? suma : ''
    const platiNumerar    = d.direction === 'plati_numerar'    ? suma : ''
    const platiBanca      = d.direction === 'plati_banca'      ? suma : ''

    const row = [
      nrCrt,               // A - NR.CRT
      d.date ?? '',        // B - DATA
      d.doc_number ?? '',  // C - DOC.FELUL.NR
      d.furnizor ?? '',    // D - EXPLICATII (furnizor name)
      incasariNumerar,     // E - INCASARI NUMERAR
      incasariBanca,       // F - INCASARI CARD
      platiNumerar,        // G - PLATI NUMERAR
      platiBanca,          // H - PLATI CARD
    ]

    const range = `${safeName}!A${targetRow}:H${targetRow}`
    const updateRes = await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    })

    // Apply borders to the newly written row (0-based index)
    await applyRowBorder(sheets, SHEET_ID, sheetId, targetRow - 1)

    return NextResponse.json({ ok: true, range: updateRes.data.updatedRange ?? undefined })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Sheets error:', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}