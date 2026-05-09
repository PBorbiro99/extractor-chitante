import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { ReceiptData, SheetResult } from '@/lib/types'

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
// E = INCASARI NUMERAR | F = INCASARI BANCA (Card)
// G = PLATI NUMERAR   | H = PLATI BANCA (Card)
// Headers at rows 8–9, data starts at row 10

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

async function ensureHeaders(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  safeName: string
) {
  // Check if headers already exist by looking at row 8
  const check = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${safeName}!A8:H8`,
  })
  const row8 = check.data.values?.[0]
  if (row8 && row8[4] === 'Incasari') return // headers already set up

  // Write the full header structure
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        {
          // Row 8: section labels
          range: `${safeName}!A8:H8`,
          values: [['NR.CRT', 'DATA', 'DOC.FELUL.NR', 'EXPLICATII', 'Incasari', '', 'Plati', '']],
        },
        {
          // Row 9: sub-column labels
          range: `${safeName}!A9:H9`,
          values: [['', '', '', '', 'Numerar', 'Card', 'Numerar', 'Card']],
        },
      ],
    },
  })

  // Merge E8:F8 for "Incasari" and G8:H8 for "Plati"
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId })
  const sheetId = sheetMeta.data.sheets?.[0]?.properties?.sheetId ?? 0

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          mergeCells: {
            range: { sheetId, startRowIndex: 7, endRowIndex: 8, startColumnIndex: 4, endColumnIndex: 6 },
            mergeType: 'MERGE_ALL',
          },
        },
        {
          mergeCells: {
            range: { sheetId, startRowIndex: 7, endRowIndex: 8, startColumnIndex: 6, endColumnIndex: 8 },
            mergeType: 'MERGE_ALL',
          },
        },
      ],
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

    await ensureHeaders(sheets, SHEET_ID, safeName)

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
      d.explicatii ?? '',  // D - EXPLICATII
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

    return NextResponse.json({ ok: true, range: updateRes.data.updatedRange ?? undefined })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Sheets error:', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}