# Access to Bank Transactions Data

This document outlines the available transaction data formats by provider.

## UK
### NatWest
*Valid as of Jan 2026*
- ✅ Open Banking
    - ⚠️ *only supports transaction accounts*
- ⏳ Online Banking Exports
    - ⏳ Excel & Text (CSV)
        ```csv
        Date,Type,Description,Value,Balance,Account Name,Account Number
        ```
- <details>
  <summary>🚫 Additional Online Banking Exports</summary>
  
    - PDF (Adobe Acrobat Reader)
    - OFX
</details>

### Yorkshire Building Society (YBS)
*Valid as of Jan 2026*
- ✅ Open Banking
    - ⚠️ *only supports transaction accounts*
- ⏳ Online Banking Exports
    - ⏳ PDF

### Cahoot
*Valid as of Jan 2026*
- ⏳ Online Banking Exports
    - ⏳ Midata (CSV)
        ```csv
        Date,Type,Merchant/Description,Debit/Credit,Balance
        ```
        - ⚠️ *can provide only up to 12 months of data, from 30 days prior to the current date*
        - ⚠️ *censors transaction descriptions*
    - ⏳ Text File (TXT)
- <details>
  <summary>🚫 Additional Online Banking Exports</summary>
  
    - Micrsosoft Excel (XLS)
    - Microsoft Money (OIF)
    - Intuit Quicken (QIF)
    - Adbobe Acrobat (PDF)
</details>

### First Direct
*Valid as of Jan 2026*
- ✅ Open Banking
    - ⚠️ *only supports transaction accounts*
- ⏳ Online Banking Exports
    - ⏳ CSV
        ```csv
        Date,Description,Amount,Balance
        ```
    - ⏳ JavaScript Object Notation (JSON)
        ```json
        {
            "date": string, // "2026-01-31"
            "description": string,
            "amount": number,
            "balance": number
        }
        ```
- <details>
  <summary>🚫 Additional Online Banking Exports</summary>
  
    - Quicken (QIF) \[d/m/y]
    - Quicken (QIF) \[m/d/y]
    - Microsoft Money (OIF)
    - Midata (CSV)
        ```csv
        Date,Type,Merchant/Description,Debit/Credit,Balance
        ```
        - ⚠️ *can provide only up to 12 months of data, from 30 days prior to the current date*
        - ⚠️ *censors transaction descriptions*
    - PDF
</details>

### Kingdom Bank
*Valid as of Jan 2026*
- ⏳ Manual Data Entry

<!-- ### Revolut
- Not currently targeted -->

<!-- ### Chip
- Not currently targeted -->

<!-- ### Post Office
- Not currently targeted -->

<!-- ### NS&I
- Not currently targeted -->

<!-- ## Switzerland -->
<!-- ### UBS
- Not currently targeted -->
