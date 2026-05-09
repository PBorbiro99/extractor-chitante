# Extractor Chitanțe

Web app mobilă + desktop care fotografiază chitanțe, extrage datele cu Claude AI și le salvează automat în Google Sheets.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Anthropic Claude** — extragere date din imagini
- **Google Sheets API** — stocare date
- **Vercel** — hosting (gratuit pentru acest volum)

---

## Setup local

### 1. Clonează și instalează

```bash
git clone <repo>
cd receipt-app
npm install
```

### 2. Anthropic API Key

1. Mergi la https://console.anthropic.com
2. Creează un API key
3. Copiază-l în `.env.local`

### 3. Google Sheets — Service Account

1. Mergi la [Google Cloud Console](https://console.cloud.google.com)
2. Creează un proiect nou (sau folosește unul existent)
3. Activează **Google Sheets API**: APIs & Services → Enable APIs → caută "Google Sheets API"
4. Creează un **Service Account**: IAM & Admin → Service Accounts → Create
   - Nume: `receipt-extractor`
   - Role: nu e necesar la nivel de proiect
5. În service account: Keys → Add Key → JSON → descarcă fișierul
6. Copiază conținutul JSON într-o singură linie în `GOOGLE_SERVICE_ACCOUNT_JSON`

### 4. Google Sheet

1. Creează un Google Sheet nou
2. Redenumiți primul tab în **Chitante**
3. Din URL copiați ID-ul: `https://docs.google.com/spreadsheets/d/**SHEET_ID**/edit`
4. Dați Share la sheet → adăugați email-ul service account-ului (găsit în JSON la `client_email`) cu rol **Editor**

### 5. Fișier .env.local

```bash
cp .env.local.example .env.local
# Editați .env.local cu valorile voastre
```

### 6. Rulați local

```bash
npm run dev
# Deschideți http://localhost:3000
```

---

## Deploy pe Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

La primul deploy, Vercel vă cere să adăugați variabilele de mediu. Adăugați:
- `ANTHROPIC_API_KEY`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON` (JSON-ul complet pe o singură linie)

După deploy, URL-ul funcționează pe orice telefon sau desktop — pe mobil butonul "Fotografiați" deschide direct camera.

---

## Structura proiectului

```
src/
  app/
    page.tsx                  # UI principal
    api/
      extract/route.ts        # POST /api/extract — Claude vision
      sheets/route.ts         # POST /api/sheets — append în Sheets
  components/
    ReviewModal.tsx           # Editare câmpuri înainte de salvare
    HistoryTable.tsx          # Istoric sesiune curentă
  lib/
    types.ts                  # Tipuri partajate
```

## Câmpuri extrase

| Câmp | Descriere |
|------|-----------|
| Tip document | chitanta_furnizor / chitanta_bancara_POS / registru_de_casa / bon_fiscal |
| Data | DD/MM/YYYY |
| Nr. document | Numărul chitanței |
| Furnizor | Numele firmei emitente |
| CUI | Codul fiscal al emitentului |
| Sumă (Lei) | Valoarea numerică |
| Plată | numerar / card/banca / mixt |
| Explicații | Referință factură, agent, terminal etc. |
| Data adăugării | Timestamp automat |
