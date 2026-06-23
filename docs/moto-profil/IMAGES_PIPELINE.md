# 🖼️ Images produits — mécanisme & pipeline

> **TL;DR** : l'API B2B documentée (REST + SOAP) ne renvoie **aucune image**. On a trouvé un
> mécanisme parallèle via le portail `article.profiauto.com` → URL CDN **public**
> `https://cdn.profiauto.com/Image/{guid}`, hotlinkable. Un POC end-to-end existe dans
> `data/_salvo/`. Reste à industrialiser la résolution **en masse** des réfs → `elId`.

---

## 1. Pourquoi l'API ne suffit pas

Vérifié empiriquement le 16–17/06/2026 :

- **REST** : Swagger complet interrogé en direct (token OK). Les **5 définitions** (ClientOrder,
  ClientStockPrice, ClientDocuments, eSerwis, DropShipping) / **18 endpoints** — **aucun champ
  image/photo/url**. Spec : `https://api.profiauto.net/swagger/docs/docs.json` puis `docs/docs/<def>.json`.
- **SOAP** : catalogue `ZwrocCennikDetalOfflinePelny` (573k lignes) = 15 colonnes, 0 URL. La méthode
  recommandée par l'IT `ZwrocCennikDetailOfflineSzczegolyCSVWiecej` a les **mêmes 15 colonnes**.
  Aucun des 3 services SOAP (WSMP 2026) n'a de méthode média.
- **PB Offer** (export portail le plus riche : 70 colonnes / 1,15 M lignes) : **toujours aucune
  colonne image**. Preuve la plus forte. MAIS il contient toutes les réfs TecDoc
  (DLNr / ArtNr / HerNr / GenArtNr / Manufacturer) + EAN → matchables.

**Conclusion** : en pièce auto, les visuels viennent de **TecDoc (TecAlliance)**, pas du grossiste.
Moto-Profil ne fournit que la **référence TecDoc** par article.

---

## 2. Le mécanisme trouvé (portail `online.profiauto.com`)

Découvert le 17/06 en inspectant le portail catalogue (connecté SAP GRAND EST) avec chrome-devtools MCP.
**Ce n'est PAS l'API B2B documentée** — c'est l'API interne du portail web.

### Étapes
1. **Résoudre l'article** : `article.profiauto.com` (authentifié, token du compte) renvoie par article :
   `motonet` (= notre réf Prefix+Index = colonne « Motonet number » du PB Offer), `elId` (id interne
   du portail), `photoGuid`, `isImage`, `isDataSheetPdf`, `ean`, `oeNumber`…
2. **Récupérer les visuels** : `POST https://article.profiauto.com/Offer/GetGraphics`
   body `{"elId": <elId>}` → `filesList[]` = **tous** les visuels du produit (`guid` + `type` JPG/PDF).
   Un produit peut avoir plusieurs images (ex. disque Bosch `BOS0986478105` = 5 JPG).
3. **Construire l'URL image** : `https://cdn.profiauto.com/Image/{guid}`.

### Propriétés du CDN (testées)
- **Public** : se charge en contexte isolé sans cookie ET en hotlink depuis une origine étrangère
  (`example.com`). JPEG ~1280×850, `cache-control: public` ~30 j. **Pas de protection anti-hotlink.**

→ **Conséquence pratique** : dans Odoo on peut **simplement stocker l'URL** `cdn.profiauto.com/Image/{guid}`
(hotlink) — rien à télécharger ni réhéberger. Ou télécharger si on veut être autonome.

---

## 3. Le POC (`data/_salvo/`)

Chaîne prouvée sur un petit échantillon de produits :

```
PB Offer (candidats)            article.profiauto.com              cdn.profiauto.com
─────────────────────  ──→  résolution motonet → elId  ──→  POST /Offer/GetGraphics  ──→  URL image
candidates.json                  + GetGraphics                     images.json            salvo_final.json
```

- **`candidates.json`** — produits candidats issus du PB Offer (motonet, brand, name, oe, ean, prix, poids).
- **`images.json`** — résultat de résolution : `{motonet, elId, name, brand, ean, oe, main, secondary[], pdf[]}`.
- **`salvo_final.json`** — **objets prêts pour Odoo** :
  ```json
  {
    "default_code": "MANC30139", "name": "Air Filter", "brand": "MANN-FILTER",
    "barcode": "4011558351403", "oe": "C30139",
    "list_price": 25.71, "standard_price": 13.24, "weight": 0.41,
    "image_main": "https://cdn.profiauto.com/Image/4df8998c-1108-4a90-a063-dc6c013833ab",
    "images_extra": [], "pdf": []
  }
  ```

---

## 4. Ce qu'il reste à faire

1. **Capturer l'endpoint de recherche/résolution en masse** de `article.profiauto.com`
   (motonet → elId pour des milliers de réfs d'un coup). Le POC a résolu un petit lot ; l'endpoint
   batch n'est pas encore identifié. → rejouer chrome-devtools sur le portail, observer les requêtes réseau.
2. **Brancher la sortie sur l'import Odoo** : `salvo_final.json` a déjà le bon format pour
   `odoo/create_products.py`. Étendre à tout le catalogue.
3. À tester aussi : `GetPriceAndQuantityURL` (SOAP `WSMotoKlientTD`, **non documentée**) — pourrait
   renvoyer des URLs.

---

## 5. ⚠️ Caveat juridique

Bandeau en bas de `online.profiauto.com` : **interdiction de copier/distribuer la base TecDoc sans
accord TecAlliance**. Cela vise surtout la **récolte de masse**. Le hotlink CDN est plus léger mais
reste **à valider juridiquement**. Voie propre et sûre : **licence TecDoc/TecAlliance** (on a déjà
toutes les réfs pour matcher), ou demander à l'IT (`it@moto-profil.pl`) un flux/FTP images ou un
package TecDoc autorisé.
