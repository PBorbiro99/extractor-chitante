import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ExtractResult } from '@/lib/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Ești un expert în extragerea datelor din documente financiare românești.
Analizează imaginea și extrage câmpurile cerute. Răspunde DOAR cu un obiect JSON valid, fără markdown, fără explicații.`

const USER_PROMPT = `Identifică tipul documentului și extrage aceste câmpuri:
- doc_type: unul din "chitanta_furnizor" | "chitanta_bancara_POS" | "registru_de_casa" | "bon_fiscal" | "necunoscut"
- date: data documentului în format DD/MM/YYYY (null dacă lipsește)
- doc_number: numărul chitanței / documentului (null dacă lipsește)
- furnizor: numele firmei/persoanei care emite documentul (null dacă lipsește)
- cui: CUI sau CIF al emitentului, exact cum apare (null dacă lipsește)
- suma: suma în cifre ca număr zecimal (ex: 143.31), null dacă nu se vede
- plata: "numerar" | "card/banca" | "mixt" | null
- explicatii: scurtă notă — referință factură, agent, terminal id etc. (null dacă nu e relevant)

Răspunde DOAR cu JSON.`

export async function POST(req: NextRequest): Promise<NextResponse<ExtractResult>> {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No image provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
    })

    const text = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)

    return NextResponse.json({ ok: true, data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Extract error:', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
