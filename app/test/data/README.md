# Test Statement Fixtures

This directory contains stubbed bank account statement extracts used for parser and handling tests.

## What these files are

- Each file originates from a real bank export format (see [transactions.md](../../../transactions.md)).
- Data has been trimmed to a small sample (5 entries per file).
- Files preserve the original structure, headers, delimiters, ordering, and quirks of the source bank.

These fixtures are intended to validate format handling, not real financial values.

## Anonymisation rules (consistent across all fixtures)

All personally identifiable or sensitive data has been replaced using fixed rules:

- **Sort codes** → `11-22-33`
- **Account numbers** → `11111111` (sometimes shortened to `*...*1111` or just `1111` where formats require)
- **Card numbers** → `*...*1234` (or just `1234` where only last digits appear)
- **Account name** → `"My Account"`
- **Card name** → `"My Card"`
- **Account holder's name** → `"Master Bagel"`

## Transaction data changes

- **Amounts** (debit, credit, balance, interest, etc.) have been changed arbitrarily.
- **Dates** may be shifted but retain valid ordering and formatting.
- **Descriptions** have had non-standard words transformed as follows:
    - Each word is replaced with a randomly generated nonsense word.
    - **Exception**: `Midata` exports already use `*` to censor descriptions and are left in that form.

## What these fixtures are NOT

- They do **not** represent real accounts or real transactions.
- They should **never** be used outside automated tests.
- They are **not suitable** for UI screenshots, demos, or documentation.

## Purpose

These fixtures exist to ensure:
- Correct parsing of real-world bank formats
- Robust handling of inconsistent delimiters and encodings
- Stability against provider-specific quirks
