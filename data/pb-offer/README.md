# PB Offer — export catalogue complet

Export généré depuis le portail **eSerwis** (menu *PB Offer*, compte SAP GRAND EST) puis livré
par e-mail. C'est la **source catalogue la plus riche** disponible — bien plus que le catalogue
SOAP (`ZwrocCennikDetalOfflinePelny`, 15 colonnes seulement).

| Fichier | Lignes | Colonnes | Taille | Format |
|---|---|---|---|---|
| `pb_offer_complet_2026-06-17.csv` | 1 154 498 | 70 (71 champs, `;` final) | 388 Mo | CSV `;`, UTF-8 **BOM**, décimale **virgule** |

> ⚠️ **Pas de colonne image** (vérifié) — confirme que Moto-Profil ne fournit aucun visuel,
> même dans son export le plus complet. Mais le fichier contient **toutes les références TecDoc**
> (DLNr, ArtNr, HerNr, GenArtNr, Manufacturer) → de quoi rattacher des images TecDoc plus tard.
> Voir le constat dans la mémoire `images-produits-non-fournies-api`.
>
> ⚠️ **Pas de colonne devise** : compte EUR (à confirmer ; `Country code` = `DE` sur les lignes vues).

## Pourquoi c'est la base d'import à privilégier (vs SOAP)
Le PB Offer apporte ce que le catalogue SOAP n'a pas : **noms d'articles en clair** (EN),
**numéros OE**, **code-barres EAN**, **poids**, **code douanier**, **compatibilité véhicule**,
**marque**, **liens TecDoc complets**, **alternatives/équivalences**, prix achat + détail (net/brut), TVA.

## Les 70 colonnes (dans l'ordre)

**Identification**
1. `TecDoc DLNr` — n° fournisseur TecDoc (ex. `0030`)
2. `Motonet number` — identifiant interne MP (ex. `BOS1987477186`)
3. `Manufacturer` — marque (ex. `BOSCH`)
4. `TecDoc ArtNr` — n° article TecDoc (ex. `1 987 477 186`)
8. `Prefix` / 9. `Index` — clé article MP (Prefix+Index)
10. `Suppliers number` — réf. fournisseur (ex. `1.987.477.186`)
13. `Custom code` — code douanier / HS (ex. `87083099`)
14. `Barcode` — **EAN** (ex. `4047024190726`)
60. `TecDoc HerNr` / 61. `Article generic id` / 65. `TecDoc GenArtNr` / 70. `TecDoc Manufacturer`

**Description produit**
5. `Parts name` — nom article (EN, ex. `Brake Caliper`)
6. `Original number` — **numéro OE** (ex. `583001P300`)
15. `Weight` — poids kg (ex. `1,46`)
17. `Article description` — **compatibilité véhicule** (texte libre)
22. `Unit of measure` (ex. `szt.` = pièce)
24. `List of attributes` / 25-28. attributs MP & Temot (FAM/CAT)
66. `Product group code` / 69. `Product group code required`

**Prix & commercial**
7. `Purchase nett price` — prix achat net
21. `Nett retail price` — prix détail net
58. `Gross retail price` / 59. `Gross purchase price` — prix bruts
64. `VAT rate`
19. `Percent discount` / 20. `Discount group name` / 63. `Discount Id`
11. `Deposit` / 12. `Bail` — caution/consigne
16. `Sales quantity` — quantité de vente / multiple
23. `Non-returnable` / 67. `Split payroll required` / 68. `Country code`

**Stock**
18. `Stock availability - Chorzów` (dépôt principal)
62. `Stock availability - HUB`

**Références croisées**
29. `Replacement prefix` / 30. `Replacement index` — article de remplacement
31. `List of alternatives` + 32-57. `Alternative 1` … `Alternative 26` — équivalences

## Mapping pressenti → Odoo `product.template`
| PB Offer | Odoo |
|---|---|
| `Prefix`+`Index` ou `Motonet number` | `default_code` |
| `Parts name` | `name` |
| `Barcode` | `barcode` |
| `Nett retail price` | `list_price` |
| `Purchase nett price` | `standard_price` |
| `Weight` | `weight` |
| `Manufacturer` | marque (attribut / `product.brand`) |
| `Original number`, réfs TecDoc | champs custom / réfs fournisseur |
