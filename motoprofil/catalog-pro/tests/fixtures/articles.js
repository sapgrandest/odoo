/**
 * Fixture catalogue — 15 articles, 5 marques × 3, 3 catégories, données déterministes.
 *
 * Valeurs connues à vérifier dans les tests :
 *   total            = 15
 *   brands           = 5  (KAMOKA, FEBI, BOSCH, NGK, ATE)
 *   categories       = 3  (TI PR.CAT. 28 → 7, TI PR.CAT. 68 → 5, TI PR.CAT. 116 → 3)
 *   inStock (CZ>0)   = 10
 *   inStockHub>0     = 6
 *   nonReturnable    = 5
 *   vatRates         = [8, 23]
 *   priceRange.min   = 5   (KAMOKA-003)
 *   priceRange.max   = 200 (BOSCH-002)
 *   discountGroups   = 4   (A=6, B=3, C=3, D=3)
 */
export const ARTICLES = [
  // ── KAMOKA ──────────────────────────────────────────────────────────────
  {
    motonet: 'KAMOKA-001', manufacturer: 'KAMOKA', name: 'Filtre huile',
    priceNet: 10.50, priceRetail: 15.00, barcode: '8714099341216',
    weight: 0.25, description: 'Filtre a huile', stockChorzow: 5,
    discount: 25, discountGroup: 'A', nonReturnable: false,
    temotCat: 'TI PR.CAT. 28', stockHub: 0, vatRate: 23,
  },
  {
    motonet: 'KAMOKA-002', manufacturer: 'KAMOKA', name: 'Filtre air',
    priceNet: 25.00, priceRetail: 37.00, barcode: '',
    weight: 0.35, description: 'Filtre a air', stockChorzow: 0,
    discount: 25, discountGroup: 'A', nonReturnable: true,
    temotCat: 'TI PR.CAT. 28', stockHub: 2, vatRate: 23,
  },
  {
    motonet: 'KAMOKA-003', manufacturer: 'KAMOKA', name: 'Filtre carburant',
    priceNet: 5.00, priceRetail: 7.50, barcode: '',
    weight: 0.15, description: 'Filtre carburant', stockChorzow: 10,
    discount: 25, discountGroup: 'A', nonReturnable: false,
    temotCat: 'TI PR.CAT. 68', stockHub: 0, vatRate: 23,
  },
  // ── FEBI ────────────────────────────────────────────────────────────────
  {
    motonet: 'FEBI-001', manufacturer: 'FEBI', name: 'Courroie distribution',
    priceNet: 50.00, priceRetail: 75.00, barcode: '4021652019820',
    weight: 0.45, description: 'Courroie distribution', stockChorzow: 3,
    discount: 30, discountGroup: 'B', nonReturnable: false,
    temotCat: 'TI PR.CAT. 68', stockHub: 0, vatRate: 23,
  },
  {
    motonet: 'FEBI-002', manufacturer: 'FEBI', name: 'Kit embrayage',
    priceNet: 120.00, priceRetail: 180.00, barcode: '4021652019821',
    weight: 1.20, description: 'Kit embrayage', stockChorzow: 0,
    discount: 30, discountGroup: 'B', nonReturnable: true,
    temotCat: 'TI PR.CAT. 28', stockHub: 0, vatRate: 8,
  },
  {
    motonet: 'FEBI-003', manufacturer: 'FEBI', name: 'Rotule direction',
    priceNet: 8.00, priceRetail: 12.00, barcode: '4021652019822',
    weight: 0.18, description: 'Rotule direction', stockChorzow: 15,
    discount: 30, discountGroup: 'B', nonReturnable: false,
    temotCat: 'TI PR.CAT. 116', stockHub: 5, vatRate: 23,
  },
  // ── BOSCH ───────────────────────────────────────────────────────────────
  {
    motonet: 'BOSCH-001', manufacturer: 'BOSCH', name: 'Bougie allumage',
    priceNet: 45.00, priceRetail: 67.50, barcode: '4047025001122',
    weight: 0.08, description: 'Bougie allumage', stockChorzow: 0,
    discount: 20, discountGroup: 'C', nonReturnable: false,
    temotCat: 'TI PR.CAT. 28', stockHub: 0, vatRate: 23,
  },
  {
    motonet: 'BOSCH-002', manufacturer: 'BOSCH', name: 'Alternateur',
    priceNet: 200.00, priceRetail: 300.00, barcode: '4047025001133',
    weight: 3.50, description: 'Alternateur', stockChorzow: 1,
    discount: 20, discountGroup: 'C', nonReturnable: true,
    temotCat: 'TI PR.CAT. 116', stockHub: 0, vatRate: 23,
  },
  {
    motonet: 'BOSCH-003', manufacturer: 'BOSCH', name: 'Plaquettes frein',
    priceNet: 15.00, priceRetail: 22.50, barcode: '4047025001144',
    weight: 0.65, description: 'Plaquettes frein avant', stockChorzow: 7,
    discount: 20, discountGroup: 'C', nonReturnable: false,
    temotCat: 'TI PR.CAT. 68', stockHub: 3, vatRate: 8,
  },
  // ── NGK ─────────────────────────────────────────────────────────────────
  {
    motonet: 'NGK-001', manufacturer: 'NGK', name: 'Bougie prechauffage',
    priceNet: 8.00, priceRetail: 12.00, barcode: '9012437037038',
    weight: 0.05, description: 'Bougie de prechauffage', stockChorzow: 20,
    discount: 15, discountGroup: 'D', nonReturnable: false,
    temotCat: 'TI PR.CAT. 28', stockHub: 10, vatRate: 23,
  },
  {
    motonet: 'NGK-002', manufacturer: 'NGK', name: 'Fil allumage',
    priceNet: 12.00, priceRetail: 18.00, barcode: '9012437037039',
    weight: 0.12, description: 'Fil allumage', stockChorzow: 0,
    discount: 15, discountGroup: 'D', nonReturnable: false,
    temotCat: 'TI PR.CAT. 28', stockHub: 0, vatRate: 23,
  },
  {
    motonet: 'NGK-003', manufacturer: 'NGK', name: 'Sonde lambda',
    priceNet: 30.00, priceRetail: 45.00, barcode: '9012437037040',
    weight: 0.20, description: 'Sonde lambda chauffee', stockChorzow: 5,
    discount: 15, discountGroup: 'D', nonReturnable: true,
    temotCat: 'TI PR.CAT. 68', stockHub: 0, vatRate: 23,
  },
  // ── ATE ─────────────────────────────────────────────────────────────────
  {
    motonet: 'ATE-001', manufacturer: 'ATE', name: 'Etrier frein',
    priceNet: 35.00, priceRetail: 52.50, barcode: '4013131118471',
    weight: 1.80, description: 'Etrier de frein avant', stockChorzow: 2,
    discount: 18, discountGroup: 'A', nonReturnable: false,
    temotCat: 'TI PR.CAT. 116', stockHub: 1, vatRate: 23,
  },
  {
    motonet: 'ATE-002', manufacturer: 'ATE', name: 'Disque frein',
    priceNet: 90.00, priceRetail: 135.00, barcode: '',
    weight: 3.20, description: 'Disque de frein ventile', stockChorzow: 0,
    discount: 18, discountGroup: 'A', nonReturnable: true,
    temotCat: 'TI PR.CAT. 28', stockHub: 0, vatRate: 23,
  },
  {
    motonet: 'ATE-003', manufacturer: 'ATE', name: 'Maitre cylindre',
    priceNet: 22.00, priceRetail: 33.00, barcode: '4013131118472',
    weight: 0.95, description: 'Maitre cylindre frein', stockChorzow: 8,
    discount: 18, discountGroup: 'A', nonReturnable: false,
    temotCat: 'TI PR.CAT. 68', stockHub: 2, vatRate: 8,
  },
]

/** Construit une ligne CSV à partir d'un article (inverse de parseRow). */
export function articleToCsvRow(id, art) {
  const cols = new Array(64).fill('')
  cols[0]  = String(id)
  cols[1]  = art.motonet
  cols[2]  = art.manufacturer
  cols[4]  = art.name
  cols[6]  = String(art.priceNet).replace('.', ',')
  cols[13] = art.barcode || ''
  cols[14] = String(art.weight || 0).replace('.', ',')
  cols[15] = '1'
  cols[16] = art.description || ''
  cols[17] = String(art.stockChorzow || 0)
  cols[18] = String(art.discount || 0)
  cols[19] = art.discountGroup || ''
  cols[20] = String(art.priceRetail || 0).replace('.', ',')
  cols[21] = 'szt'
  cols[22] = art.nonReturnable ? '1' : ''
  cols[27] = art.temotCat || ''
  cols[55] = String(art.stockHub || 0)
  cols[57] = String(art.vatRate || 0)
  return cols.join(';')
}

const CSV_HEADER = 'ID;MOTONET;MAN;TECDOC;NAME;ORIG;PRICE_NET;PFX;IDX;SUPP;DEP;BAIL;CUST;BARCODE;WEIGHT;MIN_QTY;DESC;STOCK_CZ;DISC;DG;PRICE_RET;UNIT;NON_RET;ATTR;SUP;SUB;FAM;CAT;R_PFX;R_IDX;L_ALT;A1;A2;A3;A4;A5;A6;A7;A8;A9;A10;A11;A12;A13;A14;A15;A16;A17;A18;A19;A20;PGR;PGP;TECDOC_HER;GEN;STOCK_HUB;DG_ID;VAT;TECDOC_GEN;PROD_GRP;SPLIT;COUNTRY;PGR_REQ;TECDOC_MAN'

export function generateCsv(articles = ARTICLES) {
  const rows = articles.map((a, i) => articleToCsvRow(i + 1, a))
  return [CSV_HEADER, ...rows].join('\n')
}
