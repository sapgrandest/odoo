# 🧭 HANDOFF — Reprise de session (tout le contexte)

> **À lire en PREMIER sur une nouvelle machine / une nouvelle session IA.**
> Ce fichier remplace la « mémoire » de l'assistant : il consolide tout ce qu'on a
> appris et échangé sur le projet **Moto-Profil → Odoo**. Dernière mise à jour : **2026-06-23**.

---

## 0. La règle d'or (NON négociable)

> ⚠️ **EXTRACTION UNIQUEMENT côté Moto-Profil.** Lecture / consultation seulement.
> On n'écrit JAMAIS, on ne passe JAMAIS de commande sur l'API Moto-Profil (ni SOAP ni REST).
> Une écriture (commande `Zamow…`/`SubmitOrder`, POST/PUT/DELETE REST) causerait de vrais
> problèmes au client. **Seules écritures autorisées : notre propre instance Odoo** (`mycargo`).
> Avant toute action qui n'est pas une simple lecture → demander confirmation explicite.

---

## 1. Objectif du projet

Récupérer le **catalogue de pièces auto Moto-Profil / ProfiAuto** (grossiste polonais :
références, prix, stocks, données TecDoc) et l'**importer dans Odoo** (`mycargo.odoo.com`)
en tant que `product.template` / `product.product`.

Flux unidirectionnel : **Moto-Profil (lecture)** → fichiers `data/` → **Odoo (écriture XML-RPC)**.

---

## 2. État d'avancement (au 2026-06-23)

| Brique | État | Détail |
|---|---|---|
| **SOAP Moto-Profil** | ✅ Opérationnel | Auth OK compte test `FIKS 15060 / MOTONET 0BHS`. Catalogue complet extrait : **573 109 produits**. |
| **REST Moto-Profil** | 🟡 Partiel | Token OAuth OK ; prix/stock live (`GetPriceAndQuantity`) fonctionnel. Commandes bloquées (compte SAP GRAND EST = livraisons non confirmées) — sans impact car lecture seule. |
| **PB Offer (export portail)** | ✅ Obtenu | Export le plus riche : **1 154 498 lignes / 70 colonnes** (`data/pb-offer/`). C'est la **base d'import à privilégier**. |
| **Images produits** | ✅ Mécanisme résolu (POC) | L'API B2B ne fournit aucune image, MAIS pipeline trouvé via `article.profiauto.com` → URL CDN public `cdn.profiauto.com/Image/{guid}`. POC sur échantillon dans `data/_salvo/`. Voir [docs/moto-profil/IMAGES_PIPELINE.md](docs/moto-profil/IMAGES_PIPELINE.md). |
| **Schéma Odoo** | ✅ Exporté | 800 modèles documentés dans `odoo/schema/` (naviguer via `index.html`). |
| **Import Odoo** | ⬜ À construire | **PROCHAINE GROSSE ÉTAPE** : mapping PB Offer → `product.template` + résolution images en masse. |

---

## 3. Comment ça marche — résumé technique

### 3.1 Deux API Moto-Profil
1. **REST** — `https://api.profiauto.net/` — OAuth Bearer.
   Token : `POST https://id.profiauto.pl/connect/token` (`grant_type=password`, `scope=motoprofil-api`,
   **login+mdp ProfiAutoID** = identifiants du portail eSerwis). Token valable 7 jours.
   Idéal pour : **prix/stock LIVE** par article (`GetPriceAndQuantity` / `…More`).
2. **SOAP** (MotoBiznesWS) — `https://ws1.moto-profil.pl` (secours `ws2`).
   Auth = **FIKS + MOTONET** dans chaque appel (PAS de login/mdp).
   ⚠️ Anciennes IP `195.242.186.3/.16` **OBSOLÈTES** depuis 02/06/2026 → utiliser les domaines `ws1`/`ws2`.
   **Aucune autorisation IP requise** (confirmé IT — l'ancienne théorie du whitelist était fausse).
   Idéal pour : **export catalogue complet** en masse (offline).

### 3.2 Trois services SOAP
- `WSMotoKlient.asmx` — commandes, prix motonet, factures, avoirs, LZ.
- `WSMotoKlientTD.asmx` — prix/commandes par n° TecDoc (DLNr + Elnumerdd). Contient `GetPriceAndQuantity[More]`, `SubmitOrder` (⛔ ne pas appeler).
- `WSMotoOferta.asmx` — catalogues offline (**limite 1 appel/heure**).

### 3.3 Identification des articles
- **Motonet** = `Prefiks` + `Indeks` (ex. `ABS0215Q`) — clé interne MP.
- **TecDoc** = `DLNr` + `Elnumerdd` (ex. `0003` + `03.2419-8150.3`).
- Correspondance via `zwrocListeArtykulowMPTD` (z minuscule) / `ZwrocListeArtykulowMPTD`.

### 3.4 Méthodes-clés (read-only)
| Besoin | Méthode | Service | Note |
|---|---|---|---|
| Valider l'auth (non limité) | `InformacjaOKontrahencie(fiks, nr_motonet)` | WSMotoKlient | renvoie devise (`EUR`) |
| Catalogue complet | `ZwrocCennikDetalOfflinePelny(fiks, motonet)` | WSMotoOferta | **1/heure** ; 15 colonnes |
| Catalogue détaillé (reco IT) | `ZwrocCennikDetailOfflineSzczegolyCSVWiecej` | WSMotoOferta | mêmes 15 colonnes (pas d'image non plus) |
| Mapping TecDoc | `zwrocListeArtykulowMPTD(fiks, motonet)` | WSMotoOferta | |
| Créneaux livraison | `ZwrocDostawyKontrahenta(fiks, motonet)` | WSMotoKlient | |
| Prix/stock live | `GetPriceAndQuantity[More]` | REST / WSMotoKlientTD | par réf, temps réel |

Codes blocage partenaire : `Z|`/`Lock: Z` = factures impayées ; `D|`/`Lock: D` = livraisons non confirmées ;
`-1` = article inactif ; `-2` = n° motonet inexistant.

### 3.5 ⚠️ Piège technique majeur — parsing SOAP
Les réponses « CSV » ne sont **pas** un blob avec `\n` : ce sont des éléments
`<string>ligne CSV</string>` **juxtaposés sans saut de ligne**. Un `-split "\r?\n"` naïf ne sort
que ~6 lignes (bug rencontré et corrigé le 16/06). Solution implémentée : **parsing streaming
`XmlReader`**, 1 ligne par élément `<string>` (fonction `Export-SoapLines` dans `get_catalogue.ps1`,
+ script autonome `parse_catalogue.ps1` pour re-parser un XML déjà téléchargé sans rappeler l'API).

---

## 4. Les données déjà extraites (dans `data/`, NON versionné car volumineux)

> ⚠️ Ces fichiers ne sont **pas sur GitHub** (trop gros, .gitignore). Sur une nouvelle machine
> il faut les **ré-extraire** (scripts ci-dessous) ou les copier manuellement. Seuls les petits
> `meta.json`, `README.md` et `data/_salvo/*.json` sont versionnés comme témoins/échantillons.

- `data/catalogue/2026-06-16T23-28-57/` — extraction SOAP :
  - `catalogue_pelny.csv` (62 Mo, **573 109 produits**, 15 colonnes, séparateur `;`)
  - `catalogue_pelny.raw.xml` (141 Mo, XML brut sauvegardé avant parsing — filet de sécurité)
  - `tecdoc_mapping.txt` (45 Mo), `livraisons.txt`, `meta.json`
  - Colonnes CSV : `Prefiks ; Indeks ; Rodzaj ; Stan CHO ; Stan WWA ; Stan SWI ; Detal netto ;
    Detal brutto ; Stawka VAT ; Cena netto ; Waluta ; NZW ; Wartość kaucji ; Ilość sprzedażna ;
    Numer dostawcy ; DLNr ; Elnumerdd`. `Stan CHO/WWA/SWI` = stock par dépôt (Chorzów / Varsovie / Świebodzin).
- `data/pb-offer/pb_offer_complet_2026-06-17.csv` — **export PB Offer, 1,15 M lignes / 70 colonnes (388 Mo)**.
  UTF-8 **BOM**, séparateur `;`, décimale **virgule**. **SOURCE CATALOGUE LA PLUS RICHE** (noms EN, OE,
  EAN, poids, code douanier, compat. véhicule, marque, réfs TecDoc complètes, alternatives, prix achat+détail,
  TVA, stock Chorzów + HUB). Détail des 70 colonnes : `data/pb-offer/README.md`. **Pas de colonne image.**
- `data/_salvo/` — **POC pipeline images** (échantillon, versionné) :
  - `candidates.json` — produits candidats issus du PB Offer.
  - `images.json` — résolution motonet → elId → guids images via `article.profiauto.com`.
  - `salvo_final.json` — **objets prêts pour Odoo** : `default_code, name, brand, barcode, oe,
    list_price, standard_price, weight, image_main (URL CDN), images_extra[], pdf[]`.

---

## 5. 🖼️ Images : le mécanisme trouvé (résumé — détail dans IMAGES_PIPELINE.md)

L'API B2B documentée (REST + SOAP) **ne renvoie AUCUNE image** (vérifié : 5 défs/18 endpoints REST,
catalogue SOAP, et même le PB Offer 70 colonnes → 0 URL image). Les visuels en pièce auto viennent de
**TecDoc (TecAlliance)**, pas du grossiste.

**MAIS** (découvert 17/06 via le portail `online.profiauto.com`, PAS l'API documentée) :
1. `article.profiauto.com` (authentifié, token du compte) renvoie par article : `motonet`, `elId`,
   `photoGuid`, `isImage`, `isDataSheetPdf`, `ean`, `oeNumber`…
2. `POST article.profiauto.com/Offer/GetGraphics` body `{"elId":<elId>}` → `filesList[]` = tous les
   visuels (`guid` + `type` JPG/PDF). Un produit peut avoir plusieurs images.
3. Image = `https://cdn.profiauto.com/Image/{guid}` — **CDN PUBLIC**, testé en hotlink depuis origine
   étrangère sans cookie → se charge (JPEG ~1280×850, cache public 30j). **Pas d'anti-hotlink.**

→ Dans Odoo on peut **juste stocker l'URL** `cdn.profiauto.com/Image/{guid}` (hotlink, rien à réhéberger).
**Reste à câbler** : résoudre nos ~573k réfs → `elId` **en masse** (l'endpoint de recherche catalogue
n'est pas encore capturé ; le POC l'a fait sur un petit échantillon).
⚠️ **Caveat juridique TecAlliance** : bandeau bas de page online.profiauto.com interdit de copier/distribuer
la base sans accord TecAlliance → vaut surtout pour la récolte de masse. Le hotlink est plus léger mais
à valider juridiquement. Piste propre : licence TecDoc/TecAlliance (on a déjà toutes les réfs pour matcher).

---

## 6. Prochaines étapes (par ordre)

1. **Capturer l'endpoint de recherche/résolution en masse** de `article.profiauto.com`
   (motonet → elId) pour industrialiser la récupération d'images au-delà du POC `_salvo`.
2. **Écrire le mapping PB Offer → Odoo `product.template`** (voir tableau §7) et le pipeline d'import
   XML-RPC (`odoo/create_products.py` existe, sait créer depuis un JSON — il faut générer ce JSON
   depuis le PB Offer + images).
3. **Décider la stratégie de mise à jour** : upsert par `default_code` ; gérer le volume (573k–1,15M
   lignes en XML-RPC = perf/batching à traiter) ; catalogue SOAP en batch périodique + REST live pour
   rafraîchir prix/stock.
4. **Trancher la question images** : hotlink CDN (rapide, à valider juridiquement) vs licence TecDoc.
   Au besoin demander à l'IT (`it@moto-profil.pl`) un flux/FTP images ou package TecDoc.

---

## 7. Mapping pressenti PB Offer → Odoo `product.template`

| PB Offer | Odoo | 
|---|---|
| `Prefix`+`Index` ou `Motonet number` | `default_code` |
| `Parts name` | `name` |
| `Barcode` (EAN) | `barcode` |
| `Nett retail price` | `list_price` (prix de vente) |
| `Purchase nett price` | `standard_price` (coût) |
| `Weight` | `weight` |
| `Manufacturer` | marque (`product.brand` / attribut) |
| `Original number`, réfs TecDoc | champs custom / réfs fournisseur |
| `Stock availability - Chorzów` / `HUB` | stock (si gestion inventaire) |
| (image résolue via pipeline §5) | `image_1920` ou URL stockée |

---

## 8. Identifiants & accès

> 🔐 Les **vrais** identifiants sont dans **`CREDENTIALS.md`** (PRIVÉ, **non versionné** — exclu par
> `.gitignore`). Modèle vide partageable : `CREDENTIALS.example.md`. **Sur une nouvelle machine,
> recréez `CREDENTIALS.md` à partir du modèle.** Les scripts lisent désormais les secrets via
> variables d'environnement (plus de clé en dur) :
> - `ODOO_API_KEY` (+ `ODOO_USERNAME`) pour les scripts `odoo/*.py`
> - `MP_REST_USER` / `MP_REST_PASSWORD` pour les scripts REST
> Ex. PowerShell : `$env:ODOO_API_KEY = '...'` avant de lancer le script.

Non secrets (déjà publics dans la doc / fournis par l'IT) :
- **Compte SOAP TEST** : `FIKS 15060` / `MOTONET 0BHS` (fourni par l'IT le 10/06/2026).
- Odoo : `https://mycargo.odoo.com`, DB `mycargo`, user `han.necati@gmail.com`.
- REST : token `https://id.profiauto.pl/connect/token`, API `https://api.profiauto.net`, login `SAP GRAND EST`.
- Contacts : IT `it@moto-profil.pl` ; e-mail du compte `sap.grand-est@outlook.fr` ;
  portails `eserwis1.moto-profil.pl` / `online.profiauto.com` ; Swagger `https://api.profiauto.net/swagger/index.html`.
- Compte **production SAP GRAND EST bloqué** (livraisons non confirmées) → réinit. mdp via « Forgot
  password » sur eserwis1/online.profiauto.com → lien envoyé à `sap.grand-est@outlook.fr`. Sans impact (lecture seule).

---

## 9. Où est quoi (arborescence)

```
odoo/
├── HANDOFF.md            ← CE FICHIER (reprise de session)
├── README.md             ← point d'entrée projet
├── ARCHITECTURE.md       ← flux technique détaillé
├── CREDENTIALS.md        ← secrets (PRIVÉ, non versionné)
├── CREDENTIALS.example.md← modèle de secrets
├── docs/
│   ├── README.md
│   └── moto-profil/
│       ├── ANALYSE_COMPLETE_API.md  ← référence MAÎTRE de toutes les méthodes API
│       ├── IMAGES_PIPELINE.md       ← mécanisme images (article.profiauto.com → CDN)
│       ├── REST_API.md, TRADUCTION_AUTH.md, TRADUCTION_WS.md
│       └── source/                  ← PDF officiels (WSMP_2026.pdf à jour, Auth_…)
├── motoprofil/           ← EXTRACTION (lecture seule)
│   ├── get_catalogue.ps1     ← extraction catalogue SOAP → data/catalogue/
│   ├── parse_catalogue.ps1   ← re-parse un XML brut déjà téléchargé
│   └── tests/                ← collection .http read-only + logs/
├── odoo/                 ← INTÉGRATION Odoo
│   ├── create_products.py    ← création produits XML-RPC (ÉCRITURE Odoo)
│   ├── explore_model.py      ← explorateur de modèles (lecture)
│   ├── export_schema.py      ← export schéma → schema/
│   ├── samples/products.json
│   └── schema/               ← 800 modèles Odoo + index.html
├── data/                 ← DONNÉES (volumineux, NON versionné sauf petits témoins)
└── archive/              ← historique récupérable
```

---

## 10. Démarrage rapide sur la nouvelle machine

```powershell
# 1. Récupérer le dépôt
git clone git@github.com:nedjo90/sapge.git
cd sapge

# 2. Recréer les secrets (depuis le modèle, valeurs réelles à reprendre de l'ancienne machine)
cp CREDENTIALS.example.md CREDENTIALS.md   # puis remplir
$env:ODOO_API_KEY = '...'                  # clé API Odoo

# 3. Ré-extraire le catalogue Moto-Profil (les gros data/ ne sont pas sur GitHub)
cd motoprofil
.\get_catalogue.ps1 -Fiks "15060" -Motonet "0BHS"
#  ⚠️ ZwrocCennikDetalOfflinePelny = 1 appel/heure

# 4. Explorer le schéma Odoo
cd ..\odoo
python explore_model.py product.template --search price
```

**Pour l'IA de la prochaine session** : lire dans l'ordre `HANDOFF.md` (ici) →
`docs/moto-profil/ANALYSE_COMPLETE_API.md` → `ARCHITECTURE.md` → `docs/moto-profil/IMAGES_PIPELINE.md`.
Respecter la **règle d'or §0** (extraction uniquement côté Moto-Profil).
