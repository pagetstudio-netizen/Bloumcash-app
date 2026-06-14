---
name: PayDunya channels placement
description: Le champ `channels` dans checkout-invoice/create doit être à la racine du JSON, pas dans l'objet invoice.
---

## Règle

Dans `POST /checkout-invoice/create`, le champ `channels` doit être à la **racine** du body JSON, pas à l'intérieur de l'objet `invoice`.

```json
// ❌ FAUX — PayDunya rejette avec response_code=1003
{ "invoice": { "total_amount": 500, "channels": ["tmoney-togo"] }, ... }

// ✅ CORRECT — accepté avec response_code=00
{ "invoice": { "total_amount": 500 }, "channels": ["tmoney-togo"], ... }
```

**Why:** PayDunya ignore ou rejette `channels` imbriqué dans `invoice`. L'erreur 1003 "X is not a valid payment channel" apparaît même avec des valeurs valides si le placement est mauvais. Ce bug faisait échouer TMoney→Moov tout en laissant Moov→TMoney fonctionner (car Moov SoftPay était testé séparément avec `channels` à la racine).

**How to apply:** Toujours placer `channels` au niveau racine dans `paydunya.ts::createInvoice()` → `invoiceBody`.
