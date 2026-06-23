# Architecture technique

## 1. Vue d'ensemble

Deux systèmes, un flux de données unidirectionnel **lecture → écriture** :

```
   ┌─────────────────────────────┐         ┌──────────────────────────┐
   │   MOTO-PROFIL / ProfiAuto    │         │          ODOO            │
   │   (fournisseur, Pologne)     │         │     mycargo.odoo.com     │
   │                              │         │                          │
   │  ┌────────┐    ┌─────────┐   │  EXTRACT │   ┌──────────────────┐   │
   │  │  REST  │    │  SOAP   │   │ ───────▶ │   │  product.template │  │
   │  │  API   │    │   WS    │   │  (read)  │   │  product.product  │  │
   │  └────────┘    └─────────┘   │         │   └──────────────────┘   │
   │   prix/stock    catalogue    │         │      ▲  (write, XML-RPC)  │
   │   live, docs    complet      │         │      │                    │
   └─────────────────────────────┘         └──────┼───────────────────┘
                │                                  │
                ▼                                  │
        data/catalogue/*.csv  ──── transform ──────┘
        (573k produits)          (mapping à écrire)
```

- **Source = Moto-Profil** : on extrait, on ne modifie jamais (règle EXTRACTION UNIQUEMENT).
- **Destination = Odoo** : notre instance ; on y écrit les produits.
- **Pivot = fichiers `data/catalogue/`** : le catalogue extrait sert de source de vérité
  intermédiaire avant transformation et import Odoo.

---

## 2. Les deux API Moto-Profil

L'IT Moto-Profil expose **deux styles d'API** pour le même système. Choix selon le besoin :

| | **REST** (recommandée par l'IT) | **SOAP** (MotoBiznesWS) |
|---|---|---|
| **Hôte** | `api.profiauto.net` | `ws1.moto-profil.pl` (+ `ws2` secours) |
| **Auth** | OAuth2 Bearer — `id.profiauto.pl/connect/token`<br>(`grant_type=password`, scope `motoprofil-api`, **login+mdp ProfiAutoID**) | **FIKS + MOTONET** passés dans chaque appel |
| **Format** | JSON | XML/SOAP (POST, namespace `http://moto-profil.pl/`) |
| **Idéal pour** | Prix/stock **live** d'articles précis, documents, retours | **Export catalogue complet** en masse (offline) |
| **Identifiants** | login `SAP GRAND EST` / mdp ProfiAutoID | compte test `15060` / `0BHS` |

### Méthodes-clés utilisées

| Besoin | Méthode | API | Note |
|---|---|---|---|
| Catalogue complet | `ZwrocCennikDetalOfflinePelny` | SOAP `WSMotoOferta` | **limité 1 appel/heure** |
| Catalogue détaillé (recommandé IT) | `ZwrocCennikDetailOfflineSzczegolyCSVWiecej` | SOAP `WSMotoOferta` | à comparer au `Pelny` (+ de colonnes) |
| Mapping interne ↔ TecDoc | `zwrocListeArtykulowMPTD` | SOAP `WSMotoOferta` | |
| Prix/stock live | `GetPriceAndQuantity` | REST | par référence, temps réel |
| Validation auth (non limitée) | `InformacjaOKontrahencie` | SOAP `WSMotoKlient` | renvoie la devise (EUR) |

> Référence exhaustive de **toutes** les méthodes : [`docs/moto-profil/ANALYSE_COMPLETE_API.md`](docs/moto-profil/ANALYSE_COMPLETE_API.md).

---

## 3. Chaîne d'extraction du catalogue (SOAP)

```
get_catalogue.ps1  -Fiks 15060 -Motonet 0BHS
   │
   ├─[0] InformacjaOKontrahencie ........ valide l'auth (non limité) → "EUR"
   │       └─ si refus : STOP (le catalogue limité 1/h n'est pas gaspillé)
   │
   ├─[1] ZwrocCennikDetalOfflinePelny ... catalogue complet  [LIMITE 1/h]
   │       └─ XML brut (~141 Mo) sauvegardé AVANT parsing (filet de sécurité)
   │       └─ parsing streaming → catalogue_pelny.csv  (~573k lignes)
   │
   ├─[2] zwrocListeArtykulowMPTD ........ mapping TecDoc → tecdoc_mapping.txt
   ├─[3] ZwrocArtykulyProgramuMotoProfitCsv  (indispo sur compte test → 500)
   └─[4] ZwrocDostawyKontrahenta ........ créneaux livraison → livraisons.txt
```

### Piège technique majeur — format des réponses SOAP
Les réponses « CSV » ne sont **pas** un blob avec sauts de ligne : ce sont des éléments
`<string>ligne CSV</string>` **juxtaposés sans `\n`**. Un `-split "\r?\n"` naïf ne renvoie
qu'une poignée de lignes. La solution (implémentée) : **parsing streaming via `XmlReader`**,
une ligne par élément `<string>` (fonction `Export-SoapLines`, et script autonome
`parse_catalogue.ps1` pour re-parser un XML déjà téléchargé).

### Format du catalogue (`catalogue_pelny.csv`, séparateur `;`)
`Prefiks ; Indeks ; Rodzaj ; Stan CHO ; Stan WWA ; Stan SWI ; Detal netto ; Detal brutto ;
Stawka VAT ; Cena netto ; Waluta ; NZW ; Wartość kaucji ; Ilość sprzedażna ; Numer dostawcy ;
DLNr ; Elnumerdd`

- `Prefiks`+`Indeks` = identifiant article ; `Stan CHO/WWA/SWI` = stock par dépôt
  (Chorzów / Varsovie / Świebodzin) ; `Detal netto/brutto` = prix détail ; `Cena netto` = prix
  partenaire ; `Waluta` = devise (EUR) ; `Numer dostawcy` = code fournisseur/équipementier.

---

## 4. Intégration Odoo (à construire)

**Cible** : `product.template` / `product.product` sur `mycargo.odoo.com` (XML-RPC).

Outils déjà en place dans `odoo/` :
- `export_schema.py` → `schema/` : référence hors-ligne des 800 modèles Odoo.
- `explore_model.py product.template` : champs disponibles (prix, code, catégorie, stock…).
- `create_products.py` : création en masse depuis un JSON (déjà fonctionnel sur 3 produits test).

**Mapping pressenti** (à valider) :

| Catalogue Moto-Profil | Champ Odoo |
|---|---|
| `Prefiks`+`Indeks` | `default_code` (référence interne) |
| `Detal netto` | `list_price` (prix de vente) |
| `Cena netto` | `standard_price` (prix d'achat/coût) |
| `Numer dostawcy` | fournisseur / attribut |
| `Stan CHO/WWA/SWI` | stock (si gestion d'inventaire) |

**Décisions ouvertes** (prochaine étape) :
1. SOAP en batch (catalogue complet périodique) **ou** REST à la demande (prix/stock live) — ou
   les deux (catalogue pour le référentiel, REST pour rafraîchir prix/stock) ?
2. Stratégie de mise à jour : upsert par `default_code`, gestion des 573k lignes (perf XML-RPC).
3. Catégorisation produits (via mapping TecDoc ?).

---

## 5. Conventions & sécurité

- **Sortie de données** : toujours dans `data/` (horodaté), jamais dans les dossiers de code.
- **Filet de sécurité** : on sauvegarde toujours le XML/JSON brut avant tout parsing.
- **Secrets** : centralisés dans `CREDENTIALS.md` (privé). TODO : externaliser la clé API Odoo
  hors des scripts `.py` (actuellement en dur) vers des variables d'environnement.
- **Lecture seule Moto-Profil** : aucune méthode `Zamow…` / `SubmitOrder` / `InvoiceCommission`
  dans les scripts ni la collection de tests.
