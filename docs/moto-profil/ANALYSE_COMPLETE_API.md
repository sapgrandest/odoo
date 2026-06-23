# Analyse Complète de la Documentation API Moto-Profil

> **📌 Statut (16/06/2026)** — Document **maître de référence**, à jour. Accès SOAP
> opérationnel avec le compte test `FIKS 15060 / MOTONET 0BHS`. La doc officielle à jour est
> désormais `source/WSMP_2026.pdf` (anglais) : toutes ses méthodes sont déjà couvertes ici,
> y compris `ZwrocCennikDetailOfflineSzczegolyCSVWiecej` (§7.5, recommandée par l'IT). Voir
> [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) pour le flux et la stratégie d'intégration.
>
> **Source** : PDF officiels dans `source/`
> - `Auth_API_ProfiAuto_ENG.pdf` (3 pages) — authentification OAuth
> - `WSMP_2026.pdf` (52 pages, 2026) — Web Service à jour *(remplace `Dokumentacja_WS_MP_v1.7.9.pdf`)*
>
> **Règle absolue** : Ce document ne contient que des informations présentes dans les PDF originaux. Aucune invention, aucune supposition.

---

## Table des matières

1. [Vue d'ensemble générale](#1-vue-densemble-générale)
2. [Infrastructure et URLs](#2-infrastructure-et-urls)
3. [Terminologie clé](#3-terminologie-clé)
4. [Authentification OAuth (Auth_API_ProfiAuto)](#4-authentification-oauth-auth_api_profiauto)
5. [WSMotoKlient.asmx — Commandes, prix, documents](#5-wsmotoklientasmx--commandes-prix-documents)
6. [WSMotoKlientTD.asmx — API basée sur les numéros TecDoc](#6-wsmotoklienttdasmx--api-basée-sur-les-numéros-tecdoc)
7. [WSMotoOferta.asmx — Listes de prix (catalogues offline)](#7-wsmotoofertaasmx--listes-de-prix-catalogues-offline)
8. [Codes d'erreur et états spéciaux](#8-codes-derreur-et-états-spéciaux)
9. [Fonctions archivées vs fonctions recommandées](#9-fonctions-archivées-vs-fonctions-recommandées)
10. [Tableau récapitulatif de toutes les méthodes](#10-tableau-récapitulatif-de-toutes-les-méthodes)
11. [Points d'attention pour l'implémentation](#11-points-dattention-pour-limplémentation)

---

## 1. Vue d'ensemble générale

Moto-Profil (MOTO-PROFIL SP. Z O. O., Niedźwiedziniec 10, 41-506 Chorzów, Pologne) expose **deux familles d'API** distinctes pour ses partenaires :

| Famille | Document source | Protocole | Usage principal |
|---------|----------------|-----------|-----------------|
| **API REST moderne** | `Auth_API_ProfiAuto_ENG.pdf` | HTTPS + OAuth 2.0 Bearer | Exemple : prix et disponibilités via `api.profiauto.net` |
| **Web Services SOAP** | `Dokumentacja WS MP.pdf` | HTTPS + paramètres directs | Commandes, prix, factures, dépôts, catalogues |

Ces deux familles **partagent les mêmes identifiants de connexion** (login/password) mais utilisent des mécanismes d'authentification différents.

---

## 2. Infrastructure et URLs

### API REST (ProfiAuto)

| Rôle | URL |
|------|-----|
| Authentification (obtenir le token) | `https://id.profiauto.pl/connect/token` |
| Portail web partenaire | `https://online.profiauto.com` |
| Portail web alternatif | `https://eserwis1.moto-profil.pl` |
| Portail identité | `https://id.profiauto.pl` |
| Exemple d'endpoint API | `https://api.profiauto.net/api/External/PriceAndQuantity/GetPriceAndQuantity` |

### Web Services SOAP (MotoBiznesWS)

> **⚠️ URLs mises à jour (email IT Moto-Profil, 02/06/2026)** : les anciennes adresses IP `195.242.186.3` / `195.242.186.16` sont remplacées par des noms de domaine `ws1.moto-profil.pl` / `ws2.moto-profil.pl`. Utiliser exclusivement les nouvelles adresses.

| Rôle | URL |
|------|-----|
| URL principale | `https://ws1.moto-profil.pl/MotoBiznesWS/` |
| URL de secours | `https://ws2.moto-profil.pl/MotoBiznesWS/` |
| Service client | `https://ws1.moto-profil.pl/MotoBiznesWS/WSMotoKlient.asmx` |
| Service client TecDoc | `https://ws1.moto-profil.pl/MotoBiznesWS/WSMotoKlientTD.asmx` |
| Service offre | `https://ws1.moto-profil.pl/MotoBiznesWS/WSMotoOferta.asmx` |

> Anciennes adresses (obsolètes, conservées pour mémoire) : `https://195.242.186.3/MotoBiznesWS/` (principale) et `https://195.242.186.16/MotoBiznesWS/` (secours).

---

## 3. Terminologie clé

Ces termes sont utilisés dans toute la documentation et doivent être compris avant toute implémentation.

| Terme | Signification |
|-------|--------------|
| **Fiks** | Numéro de compte client (numéro partenaire principal) |
| **nr_kontrahenta_motonet** | Deuxième numéro client, unique par agence/branche (`motonet number`) |
| **lista_nr_motonet** | **Liste** (tableau String[]) de NrMotonet — c'est le nom du paramètre tableau dans les méthodes de consultation de stock (§5.17, §5.18, §5.19, §5.20). À ne pas confondre avec `NrMotonet` qui désigne un article unique (Prefiks + Indeks). |
| **Prefiks** | Abréviation du fabricant (ex. : `"STM"` pour STEMOT) |
| **Indeks** | Numéro d'article (référence article chez Moto-Profil) |
| **NrMotonet** | Concaténation Prefiks + Indeks (ex. : `ABS0215Q`) |
| **MotoProfit** | Programme de fidélité Moto-Profil |
| **GUID** | Identifiant unique globalement (format : `452E4B5D-B5FF-44a2-B733-EDE0DC28C77E`) |
| **DLNr** | Code fabricant conforme à TecDoc (ex. : `"0043"`) |
| **Elnumerdd** | Numéro d'article fabricant conforme aux données TecDoc (ex. : `"CCH865"`) |
| **F / P** | F = Facture (invoice), P = Reçu (receipt) — type de document pour une commande |
| **FKZ** | Facture corrective (avoir) |
| **LZ** | Liste de chargement (load list) |
| **WZ** | Document de livraison/sortie de stock (commission) |
| **CHO** | Entrepôt de Chorzów |
| **HUB** | Entrepôt de Warszawa et Jawczyce — utilisé dans `ZamowTowaryMultiMag` (champ `ordered_qty_HUB`). ⚠️ `ZwrocCennikDetalOfflinePelny` (§7.9) liste les stocks par entrepôt avec `stock_CHORZOW`, `stock_WARSZAWA` et `STOCK_SWIEBODZIN` — il n'y a pas de champ `Jawczyce` séparé. La relation entre le `HUB` (Warszawa+Jawczyce) et le champ `stock_WARSZAWA` du catalogue n'est pas explicitée dans le PDF : Jawczyce est-il un sous-dépôt de Warszawa, ou ses stocks sont-ils agrégés dans `stock_WARSZAWA` ? Cette ambiguïté complique la réconciliation entre les données de commande et les données de catalogue. |
| **SWIEBODZIN** | Entrepôt de Świebodzin — présent dans `ZwrocCennikDetalOfflinePelny`, absent des méthodes de commande multi-entrepôts (`ZamowTowaryMultiMag`). La relation entre HUB et cet entrepôt n'est pas précisée dans le PDF. |
| **ELID** | Identifiant utilisé par `GetPriceAndQuantityURL` (mentionné dans la table WSMotoKlientTD, page 40 du PDF). **Non défini** dans le document source — signification exacte inconnue. |

---

## 4. Authentification OAuth (Auth_API_ProfiAuto)

### 4.1 Principe

L'API REST ProfiAuto utilise **OAuth 2.0 avec le flux "Resource Owner Password Credentials"** (grant_type = password). Le token obtenu est un **Bearer Token JWT** valable **7 jours** (604 800 secondes).

> **Attention** : certaines méthodes nécessitent des permissions supplémentaires configurées côté Moto-Profil.

### 4.2 Obtention du token

**Endpoint** : `POST https://id.profiauto.pl/connect/token`

> ⚠️ **Point de blocage potentiel à l'implémentation** : le flux OAuth ROPC (Resource Owner Password Credentials) exige normalement un `client_id` et parfois un `client_secret` dans la requête. L'exemple du PDF n'en inclut aucun. Leur absence peut signifier qu'ils ne sont pas requis pour cette implémentation, ou qu'ils sont communiqués séparément par Moto-Profil. **À vérifier impérativement auprès de Moto-Profil avant d'implémenter.**

**Header requis** :

| Clé | Valeur |
|-----|--------|
| `Content-Type` | `application/x-www-form-urlencoded` |

**Corps de la requête** (form-urlencoded) :

| Clé | Valeur | Commentaire |
|-----|--------|-------------|
| `grant_type` | `password` | Méthode d'authentification |
| `scope` | `motoprofil-api` | Périmètre d'accès. ⚠️ **Contradiction dans le PDF** : la table indique `motoprofil-api`, le texte dit d'utiliser `moto-profil-api` pour "toute l'API", et l'exemple brut utilise `motoprofil-api`. Ce sont deux chaînes différentes. L'exemple concret utilise `motoprofil-api` — à valider auprès de Moto-Profil. |
| `username` | `{login}` | Login utilisé sur `https://id.profiauto.pl` |
| `password` | `{password}` | Mot de passe utilisé sur `https://id.profiauto.pl` |

**Exemple de requête brute** :

```http
POST /connect/token HTTP/1.1
Host: id.profiauto.pl
Content-Type: application/x-www-form-urlencoded
Content-Length: 78

grant_type=password&scope=motoprofil-api&username=login&password=pas123!%40%23
```

> ⚠️ **Observation sur l'encodage** : l'exemple brut encode `@` en `%40` et `#` en `%23`, mais laisse `!` non encodé (`pas123!%40%23`). Le PDF ne donne aucune instruction explicite sur l'encodage des caractères — il n'indique nulle part d'encoder `!` en `%21`. En `application/x-www-form-urlencoded` strict (RFC 3986), `!` devrait être encodé en `%21`. À valider lors de l'implémentation.

### 4.3 Réponse en cas de succès

```json
{
  "token_type": "Bearer",
  "access_token": "yKjsfCUcwvLm5uevLHk56p...(très long token JWT)...",
  "expires_in": 604800
}
```

| Champ | Description |
|-------|-------------|
| `token_type` | Toujours `"Bearer"` |
| `access_token` | Le token JWT à utiliser dans toutes les requêtes suivantes |
| `expires_in` | Durée de validité en secondes (604 800 s = 7 jours) |

> Note : la réponse documentée dans le PDF ne contient **pas de `refresh_token`**. En OAuth 2.0 ROPC, ce champ est facultatif (RFC 6749). Son absence du PDF signifie soit qu'il n'est pas délivré, soit qu'il n'a pas été inclus dans la documentation. Implémenter un renouvellement via une nouvelle requête `grant_type=password` à l'approche de l'expiration (cf. §11.8).

### 4.4 Utilisation du token dans les requêtes

Ajouter l'en-tête suivant à chaque requête API :

| Clé | Valeur |
|-----|--------|
| `Authorization` | `Bearer {access_token}` |

### 4.5 Exemple d'appel authentifié

**Endpoint** : `POST https://api.profiauto.net/api/External/PriceAndQuantity/GetPriceAndQuantity`

```http
POST /api/External/PriceAndQuantity/GetPriceAndQuantity HTTP/1.1
Host: api.profiauto.net
Authorization: Bearer yKjsfCUcwvLm5uevLHk56p...
Content-Type: application/json
Content-Length: 39

{
  "items": [
    "FTROP570"
  ]
}
```

---

## 5. WSMotoKlient.asmx — Commandes, prix, documents

Ce service contient **20 méthodes** organisées en plusieurs catégories : informations client, commandes, consultation de stock/prix, documents financiers.

**Paramètres d'authentification communs à toutes les méthodes** :
- `Fiks` (String) : numéro de compte partenaire
- `nr_kontrahenta_motonet` (String) : numéro motonet partenaire

---

### 5.1 InformacjaOKontrahencie

**Description** : Retourne des informations sur la devise du compte partenaire.

**Paramètres** : `Fiks`, `nr_kontrahenta_motonet`

**Réponse** : Dans la version actuelle, retourne uniquement le symbole de la devise du compte. La documentation précise que des informations supplémentaires pourront être ajoutées à l'avenir (rétrocompatibilité assurée, nouvelles données précédées de `|`).

---

### 5.2 InvoiceCommission

**Description** : Émet une facture pour les pièces vendues en commission par le partenaire. Peut optionnellement passer une commande pour ces pièces.

**Paramètre de requête** : Objet JSON sérialisé en string. **Aucun champ ne peut être null.**

**Structure de la requête** :
```json
{
  "Auth": {
    "FIKS": "99999",
    "Motonet": "8888"
  },
  "Items": [
    {"NrMotonet": "FTROP570", "Quantity": 1.0},
    {"NrMotonet": "ABS0215Q", "Quantity": 2.0}
  ]
}
```

**Paramètres du corps** :

| Nom | Description | Type |
|-----|-------------|------|
| `FIKS` | Numéro de compte partenaire | String |
| `Motonet` (sous `Auth`) | Numéro motonet partenaire | String |
| `NrMotonet` (sous `Items`) | Numéro motonet de l'article | String |
| `Quantity` | Quantité à facturer | Double |

**Réponse** : Objet JSON sérialisé en string.

```json
{
  "Error": "",
  "Items": [
    {
      "NrMotonet": "FTROP570",
      "OrderedQuantity": 3,
      "InvoiceQuantity": 2,
      "InvoicePrice": 16.34,
      "Replacement": "ABS0215Q"
    },
    {
      "NrMotonet": "ABS530",
      "OrderedQuantity": 5,
      "InvoiceQuantity": 4,
      "InvoicePrice": 20.34,
      "Replacement": ""
    }
  ]
}
```

> ⚠️ **Incohérence du document source** : la requête envoie `ABS0215Q` comme 2ème article, mais la réponse retourne `ABS530` pour ce même item. Le PDF ne résout pas cette divergence. L'exemple est reproduit tel quel depuis le document source.

**Champs de réponse** :

| Nom | Description | Détails | Type | Peut être vide |
|-----|-------------|---------|------|----------------|
| `Error` | Message d'erreur | Vide si succès | String | Oui |
| `NrMotonet` | Numéro motonet de l'article | — | String | Non |
| `OrderedQuantity` | Quantité commandée automatiquement | `-1` si NrMotonet absent du WZ commission | Double | Non |
| `InvoiceQuantity` | Quantité facturée | `-1` si NrMotonet absent du WZ commission | Double | Non |
| `InvoicePrice` | Prix de l'article sur la facture | — | Double | Non |
| `Replacement` | Numéro motonet de l'article remplaçant (si existe) | — | String | Oui |

---

### 5.3 ZwrocDostawyKontrahenta

**Description** : Retourne la liste des livraisons du client.

**Paramètres** : `Fiks`, `nr_kontrahenta_motonet`

**Réponse** : Liste de strings, une ligne par livraison.

**Structure d'une ligne** :
```
delivery name|time|delivery day|description|local stock name|main stock
```

| Champ | Description |
|-------|-------------|
| `delivery name` | Nom de la livraison — **peut être vide** : les trois lignes de l'exemple du PDF ont ce champ vide (premier segment absent avant le `\|`) |
| `time` | Heure limite d'acceptation des commandes pour cette livraison |
| `delivery day` | Jours de livraison possibles : 6 caractères T/N, positions 1-6 correspondent vraisemblablement à Lun-Sam (T=Oui, N=Non) — le PDF indique "fields 0-6 means Monday-Saturday" mais ne précise pas l'ordre exact ni l'indexation. Inférence à valider sur un exemple réel. |
| `description` | Description de la livraison |
| `local stock name` | Nom de l'entrepôt local |
| `main stock` | `T`=livraison depuis le stock principal / `N`=non |

**Exemple de réponse** :
```
|18:31|TTTTTN||Magazyn główny|T
|15:01|NNNNNT||Magazyn główny|T
|11:05|TTTTTN||Magazyn Warszawa|N
```

---

### 5.4 ZamowTowary

**Description** : Passe une commande pour un groupe d'articles.

**Paramètres** :

| Nom | Type |
|-----|------|
| `Fiks` | String |
| `nr_kontrahenta_motonet` | String |
| `lista_nr_motonet_ilosc` | String[] |

**Structure de chaque ligne de `lista_nr_motonet_ilosc`** :
```
item_motonet_number|ordered_quantity|F_or_P
```
- `F` = facture (invoice)
- `P` = reçu (receipt)

Le **3ème segment est présent dans tous les exemples du PDF**. Le PDF décrit `F or P` comme `(optional)`, sans préciser si c'est la valeur `P` ou le segment entier qui est facultatif. Par prudence : **toujours inclure le 3ème segment** avec la valeur `F` (facture) par défaut.

**Dernière ligne obligatoire (identifiant de commande GUID)** :
```
GUID|452E4B5D-B5FF-44a2-B733-EDE0DC28C77E|G
```

**Exemple de `lista_nr_motonet_ilosc`** :
```
ABS0215Q|2|F
FTROP570|1|F
GUID|452E4B5D-B5FF-44a2-B733-EDE0DC28C77E|G
```

**Réponse** : Liste de strings, une ligne par article commandé (dans le même ordre que l'input). La dernière ligne GUID est **supprimée** de la réponse.

**Structure d'une ligne de réponse** :
```
retail_price|price_for_Partner|VAT_amount|ordered_quantity|selling_quantity[|replacer_motonet|replacer_prefiks|replacer_indeks|replacer_name]
```

**Exemples de réponse** :

| Cas | Exemple |
|-----|---------|
| Standard | `20.56\|13.46\|23\|2\|1` |
| Avec remplaçant | `35.35\|20,56\|23\|5\|ABS0215Q\|ABS\|0215Q\|SPRYNKI DO SZCZK HAM. MERCEDES W123 76-85` |
| Article inactif | `-1\|-1\|-1\|-1\|-1` |
| Numéro incorrect | `-2\|-2\|-2\|-2\|-2` |
| Bloqué (impayés) | `Z\|10.00\|9.12\|23` |
| Bloqué (livraisons) | `D\|56.93\|51.22\|23` |

> ⚠️ **Incohérence du document source** : le format décrit inclut `selling_quantity` entre `ordered_quantity` et le remplaçant, mais l'exemple "avec remplaçant" (`35.35|20,56|23|5|ABS0215Q|...`) saute ce champ — `5` est directement suivi du motonet remplaçant. Le document source ne résout pas cette contradiction. Lors du parsing, tester les deux cas.

**Valeurs spéciales** :
- `-1` = article inactif
- `-2` = numéro motonet incorrect
- `Z|...` = partenaire bloqué car trop de factures impayées — l'exemple du PDF montre `Z|prix_détail|prix_partenaire|TVA` (3 champs, sans stock)
- `D|...` = partenaire bloqué car confirmations de livraisons manquantes (même structure que Z)

> ⚠️ **Contradiction dans le PDF (méthodes de commande)** : pour `ZamowTowary`, `ZamowTowaryMultiMag` et `ZamowTowaryNrZamowienia`, la **description textuelle** du PDF indique 4 champs après `Z` : `Z|stock(0-6)|prix_détail|prix_partenaire|TVA` (avec le stock en 2ème position). Mais **l'exemple** ne montre que 3 champs : `Z|10.00|9.12|23` (sans stock). Cette contradiction est présente pour les trois méthodes de commande. Pour les méthodes de stock (`ZwrocStanCeny`, etc.), le texte et l'exemple sont cohérents (stock présent). L'analyse suit l'exemple (3 champs), mais le format réel est à **valider impérativement auprès de Moto-Profil** — un parser construit sur 3 champs échouera si le serveur retourne réellement 4 champs.

---

### 5.5 ZamowTowaryMultiMag

**Description** : Passe une commande pour un groupe d'articles avec **réponse étendue indiquant les quantités par entrepôt**.

**Paramètres** : identiques à `ZamowTowary` (`Fiks`, `nr_kontrahenta_motonet`, `lista_nr_motonet_ilosc`)

**Différence dans la réponse** : les quantités commandées sont **ventilées par entrepôt** :

**Structure d'une ligne de réponse** :
```
retail_price|price_for_Partner|VAT_amount|ordered_qty_CHO|ordered_qty_HUB|selling_quantity[|replacer...]
```

| Champ | Description |
|-------|-------------|
| `ordered_qty_CHO` | Quantité commandée à l'entrepôt de **Chorzów** |
| `ordered_qty_HUB` | Quantité commandée aux entrepôts de **Warszawa et Jawczyce** |

**Exemples** :

| Cas | Exemple |
|-----|---------|
| Standard | `20.56\|13.46\|23\|0\|2\|1` |
| Avec remplaçant | `35.35\|20,56\|23\|5\|1\|ABS0215Q\|ABS\|0215Q\|SPRYNKI DO SZCZK HAM. MERCEDES W123 76-85` |

> ⚠️ **Incohérence du document source** : dans l'exemple "avec remplaçant" de `ZamowTowaryMultiMag`, le format montre `5|1|ABS0215Q|...` — ici `5` est `ordered_qty_CHO`, `1` est `ordered_qty_HUB`, et le remplaçant suit directement, sans `selling_quantity`. Même incohérence que dans `ZamowTowary`.

Les codes d'erreur `-1`, `-2`, `Z|`, `D|` sont identiques à `ZamowTowary`.

---

### 5.6 ZamowTowaryNrZamowienia

**Description** : Passe une commande pour un groupe d'articles en **ajoutant un numéro de commande** personnalisé.

**Paramètres** : identiques à `ZamowTowary` + **`nr_zamowienia`** (String) : numéro de commande client.

**Format de `lista_nr_motonet_ilosc`** : identique à `ZamowTowary`.

**Réponse** : identique à `ZamowTowary`.

---

### 5.7 PotwierdzZamowienie

**Description** : Vérifie si une commande envoyée a bien été acceptée pour réalisation. Utile en cas d'erreur de connexion ou de timeout.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `Zamowienie_guid` | GUID unique de la commande client (envoyé comme dernière ligne dans `ZamowTowary`) | String |

**Réponse** :
- Si la commande a été **acceptée** : liste des articles commandés, dans le même format que `ZamowTowary`, `ZamowTowaryMultiMag`, ou `ZamowTowaryNrZamowienia`.
- Si la commande n'a **pas été acceptée** (erreur ou timeout) : **liste vide**.

---

### 5.8 ZwrocSzczegolyZamowieniaLista

**Description** : Retourne des informations détaillées sur les quantités commandées par entrepôt.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `Guid` | GUID unique de la commande client (envoyé comme dernière ligne dans `ZamowTowary`) | String |

**Réponse** : Liste de strings, une ligne par article.

**Structure d'une ligne** :
```
Prefiks_indeks|retail_price|price_for_Client|VAT_rate|qty_ordered_Main_Stock|qty_ordered_Local_Stock[|replacer_motonet]
```

**Exemple** :
```
BLPADC446176|98,41|56,11|23|0|1
```

> ⚠️ **Point d'implémentation critique** : le premier champ `Prefiks_indeks` est une **concaténation sans séparateur** de Prefiks et Indeks (ex. `BLPADC446176` = probablement `BLP` + `ADC446176`). Contrairement à toutes les autres méthodes de ce service qui retournent `Prefiks|Indeks` en deux champs séparés par `|`, il est **impossible de séparer Prefiks et Indeks de façon générique** sans connaître la longueur du préfixe.
>
> Pour récupérer les deux valeurs séparément, `ZwrocListeArtykulowMPTD` (section 7.7) fournit la correspondance Prefiks/Indeks. **Limitation** : `ZwrocListeArtykulowMPTD` ne liste que les articles **ayant une correspondance TecDoc**. Tout article Moto-Profil sans numéro TecDoc (consommables, articles génériques, etc.) ne figurerait pas dans cette liste — la séparation resterait impossible pour ces articles.

---

### 5.9 ZwrocDepozyty

**Description** : Retourne les commandes passées et réalisées pour une date donnée.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `Data` | Date souhaitée | DateTime (format `YYYY-MM-DD`) |

**Réponse** : Liste de strings, une ligne par commande.

**Structure d'une ligne** :
```
motonet_number|price_for_Partner|quantity
```

**Exemple** :
```
ABS0215Q|20.56|5
FTROP570|13.45|1
```

---

### 5.10 ZwrocNumeryFaktur

**Description** : Retourne les numéros de factures émises à une date donnée.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `Data` | Date d'émission des factures | DateTime (format `YYYY-MM-DD`) |

**Réponse** : Liste de strings, une ligne par facture.

**Structure d'une ligne** :
```
Invoice_number|net_value|VAT_value|discount|issue_date|payment_date
```

**Exemple** :
```
FA 2543/06/2018/K|2353|451.19|0|2018-06-01|2018-07-01
```

> Note : le champ `discount` n'est pas décrit dans le PDF (unité inconnue : pourcentage ? valeur absolue en PLN ? remise de paiement anticipé ?). L'exemple montre `0`, ce qui ne permet pas d'inférer son unité.

---

### 5.11 ZwrocPozycjeFaktury

**Description** : Retourne la liste des articles d'une facture particulière.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `numer_ksiegowy` | Numéro de facture | String |

**Réponse** : Liste des articles de la facture.

**Structure d'une ligne** :
```
prefiks|indeks|nr_motonet|quantity|price|name
```

**Exemple** :
```
PSA|1609015780|PSA1609015780|1|131.54|POMPA SPRZGA CITROEN PEUGEOT
```

> Note : le champ `price` est-il un **prix unitaire** ou un **prix total de ligne** (quantité × prix unitaire) ? Le PDF ne le précise pas. `ZwrocPozycjeFakturyZVat` (§5.12) indique explicitement "Le prix et le montant de TVA sont donnés pour 1 article (unitaire)" — mais cette précision est absente ici. L'exemple ne permet pas de trancher (quantity = 1). **À valider** sur une facture avec quantity > 1.

---

### 5.12 ZwrocPozycjeFakturyZVat

**Description** : Retourne la liste des articles d'une facture avec **le montant de TVA** (version enrichie de `ZwrocPozycjeFaktury`).

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `numer_ksiegowy` | Numéro de facture | String |

**Réponse** : Liste des articles de la facture. **Le prix et le montant de TVA sont donnés pour 1 article (unitaire).**

**Structure d'une ligne** :
```
Prefiks|indeks|nr_motonet|quantity|price|name|vat_amount
```

**Exemple** :
```
ABS|0622Q|ABS0622Q|10|18|SPRĘŻYNKI DO SZCZĘK HAM.MERCEDES BENZ|4.14
```

---

### 5.13 ZwrocNumeryFKZ

**Description** : Retourne la liste des numéros de factures correctives (avoirs FKZ) émises à une date donnée.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `Data` | Date | DateTime (format `YYYY-MM-DD`) |

**Réponse** : Liste de strings, une ligne par document.

**Structure d'une ligne** :
```
Id|document_number|issue_date|payment_date|NET_amount|VAT_amount
```

**Exemple** :
```
1730141|FKZ 1798/06/208/K|2018-06-30 17:00:08|2018-09-13 17:00:08|-979,99|-1835,45
```

> Note : le numéro de document `FKZ 1798/06/208/K` contient vraisemblablement une coquille — `208` au lieu de `2018`. Reproduit tel quel depuis le PDF.

> ⚠️ **Incohérence du document source** : le PDF nomme le 6ème champ `VAT_amount`, mais les valeurs de l'exemple (-979,99 et -1835,45) ne correspondent à aucune relation NET/TVA/GROSS cohérente au taux de 23 % :
> - TVA pure à 23 % sur 979,99 → ≈ 225 €, pas 1835 €
> - GROSS (NET × 1,23) → ≈ 1205 €, pas 1835 € non plus
>
> L'exemple du PDF est probablement une **donnée de test incohérente**. Le libellé et le contenu réel de ce 6ème champ ne peuvent pas être déterminés avec certitude depuis le document source — traiter ce champ avec prudence et valider sur un vrai document de test.
>
> Note : les montants sont **négatifs** pour les avoirs.

---

### 5.14 ZwrocPozycjeFKZ

**Description** : Retourne la liste des articles d'une facture corrective (FKZ) particulière.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `Identyfikator` | ID de la FKZ (obtenu via `ZwrocNumeryFKZ`) | Int |

**Réponse** : Liste des articles de l'avoir.

**Structure d'une ligne** :
```
Prefiks|indeks|quantity|NET_retail_price
```

**Exemple** :
```
FEB|21107|2|15.46
```

---

### 5.15 ZwrocNumeryLZ

**Description** : Retourne la liste des numéros de documents "liste de chargement" (LZ) émis à une date donnée.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `Data` | Date | DateTime (format `YYYY-MM-DD`) |

**Réponse** : Liste de strings, une ligne par document.

**Structure d'une ligne** :
```
Id|document_number|closure_date
```

**Exemple** :
```
3020930|LZ/282/27|2018-07-02 12:45:52
```

---

### 5.16 ZwrocPozycjeLZ

**Description** : Retourne la liste des articles d'un document LZ particulier.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `Identyfikator` | ID du LZ (obtenu via `ZwrocNumeryLZ`) | Int |

**Réponse** : Liste de strings, une ligne par article (ou par ligne de colis si article réparti sur plusieurs boîtes).

**Structure d'une ligne** :
```
Prefiks|indeks|quantity|NET_retail_price|box_number|quantity_from_document
```

| Champ | Description |
|-------|-------------|
| `Prefiks` | Préfixe article dans l'offre Moto-Profil |
| `indeks` | Index article dans l'offre Moto-Profil |
| `quantity` | Quantité scannée/emballée |
| `NET retail price` | Prix unitaire NET, ou `*` si l'article a été emballé dans plusieurs boîtes |
| `box number` | Numéro de la boîte dans laquelle l'article a été emballé |
| `quantity from document` | Quantité de la réservation (document), ou `*` si l'article est dans plusieurs boîtes |

**Cas particulier** : si un article est réparti dans plusieurs boîtes, il apparaît en **plusieurs lignes** (exemples reproduits tels quels depuis le PDF, page 30) :
```
XXX|123456|1|12,53|OP-001|4
XXX|123456|1|*|OP-002|*
XXX|123456|2|*||OP-003|*
```
Signification : 4 pièces de XXX 123456 réparties dans 3 boîtes : OP-001 (1 pièce), OP-002 (1 pièce), OP-003 (2 pièces).

> ⚠️ **Double pipe `||` dans le 3ème exemple** : le document source affiche `XXX|123456|2|*||OP-003|*` — deux pipes successifs entre `*` et `OP-003`, ce qui indiquerait un **champ vide** entre les deux. La structure officielle décrite est à 6 champs ; un double `||` produirait 7 champs. Il n'est pas établi si c'est un artefact typographique du PDF ou un comportement réel du service (ex. : champ conditionnel absent). À valider sur une vraie réponse LZ avec article réparti sur plusieurs boîtes.

**Usages** :
- Lignes avec prix NET et quantité de réservation → contrôle de valeur de livraison (global)
- Lignes avec quantité scannée et numéro de boîte → contrôle de livraison par colis collectif

---

### 5.17 ZwrocStanCeny *(ARCHIVÉE)*

> **⚠️ Fonction archivée. Utiliser `ZwrocStanCenyDostepnoscWiecej` à la place.**

**Description** : Retourne le stock et le prix d'un article (ou groupe d'articles).

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `lista_nr_motonet` | Liste de numéros motonet d'articles | String[] |

**Stock codé** : 0-5 = valeur exacte ; **6 = plus de cinq unités**

**Structure d'une ligne de réponse** :
```
Quantity(0-6)|retail_price|price_for_Partner|VAT_amount[|replacer_motonet|replacer_prefiks|replacer_indeks|replacer_name]
```

---

### 5.18 ZwrocStanCenyWiecej

**Description** : Retourne le stock et le prix d'un article (ou groupe d'articles) — **plage étendue**.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `lista_nr_motonet` | Numéros motonet des articles | String[] |

**Stock codé** : 0-25 = valeur exacte ; **26 = plus de 25 unités**

**Structure d'une ligne de réponse** :
```
Quantity(0-26)|retail_price|price_for_Partner|VAT_amount[|replacer_motonet|replacer_prefiks|replacer_indeks|replacer_name]
```

| Cas | Exemple |
|-----|---------|
| Standard | `17\|20.56\|13.46\|23` |
| Avec remplaçant | `26\|35.35\|20,56\|23\|ABS0215Q\|ABS\|0215Q\|SPRYNKI DO SZCZK HAM. MERCEDES W123 76-85` |
| Article inactif | `-1\|-1\|-1\|-1` |
| Numéro incorrect | `-2\|-2\|-2\|-2` |
| Bloqué (impayés) | `Z\|5\|10.00\|9.12\|23` |
| Bloqué (livraisons) | `D\|4\|56.93\|51.22\|23` |

---

### 5.19 ZwrocStanCenyDostepnosc *(ARCHIVÉE)*

> **⚠️ Fonction archivée. Utiliser `ZwrocStanCenyDostepnoscWiecej` à la place.**

**Description** : Retourne le stock et le prix pour le stock **local ET le stock principal**.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `lista_nr_motonet` | Liste de numéros motonet d'articles | String[] |

**Stock codé** : 0-5 = valeur exacte ; **6 = plus de cinq unités**

**Structure d'une ligne de réponse** :
```
Main_stock(0-6)|local_stock(0-6)|retail_price|price_for_Partner|VAT_amount[|replacer...]
```

---

### 5.20 ZwrocStanCenyDostepnoscWiecej

**Description** : Retourne le stock et le prix pour le stock **local ET le stock principal** — **plage étendue**. **C'est la fonction recommandée.**

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `lista_nr_motonet` | Numéros motonet des articles | String[] |

**Stock codé** : 0-25 = valeur exacte ; **26 = plus de 25 unités**

**Structure d'une ligne de réponse** :
```
Main_stock(0-26)|local_stock(0-26)|retail_price|price_for_Partner|VAT_amount[|replacer_motonet|replacer_prefiks|replacer_indeks|replacer_name]
```

| Cas | Exemple |
|-----|---------|
| Standard | `25\|3\|20.56\|13.46\|23` |
| Avec remplaçant | `26\|26\|35.35\|20,56\|23\|ABS0215Q\|ABS\|0215Q\|SPRYNKI DO SZCZK HAM. MERCEDES W123 76-85` |
| Article inactif | `-1\|-1\|-1\|-1\|-1` |
| Numéro incorrect | `-2\|-2\|-2\|-2\|-2` |
| Bloqué (impayés) | `Z\|6\|4\|10.00\|9.12\|23` |
| Bloqué (livraisons) | `D\|5\|5\|56.93\|51.22\|23` |

---

## 6. WSMotoKlientTD.asmx — API basée sur les numéros TecDoc

Ce service utilise des **numéros TecDoc** (DLNr + Elnumerdd) au lieu des numéros motonet pour identifier les articles.

**Toutes les requêtes** : JSON sérialisé en string. **Aucun champ ne peut être vide.**

**Structure d'authentification commune** :
```json
{
  "Auth": {
    "FIKS": "99999",
    "Motonet": "9999"
  }
}
```

---

### 6.1 GetPriceAndQuantity *(ARCHIVÉE)*

> **⚠️ Fonction archivée. Utiliser `GetPriceAndQuantityMore` à la place.**

**Description** : Retourne le stock et le prix d'un article (ou groupe) par numéro TecDoc.

**Stock codé** : **0-5 = valeur exacte** (la plage étendue n'est pas disponible dans cette version).

**Structure de requête** :
```json
{
  "Auth": {"FIKS": "99999", "Motonet": "9999"},
  "Elems": [
    {"DLNr": "0043", "Elnumerdd": "CCH865"},
    {"DLNr": "0003", "Elnumerdd": "03.2419-8150.3"}
  ]
}
```

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `FIKS` | Numéro de compte partenaire | String |
| `Motonet` | Numéro motonet partenaire | String |
| `DLNr` | Code fabricant conforme TecDoc | String |
| `Elnumerdd` | Numéro d'article fabricant conforme TecDoc | String (**le PDF indique "Double" mais c'est une erreur** : les exemples comme `"03.2419-8150.3"` ou `"CCH865"` sont des chaînes alphanumériques impossibles à représenter en Double — traiter impérativement comme String) |

**Réponse** : tableau JSON.

| Champ | Description | Détails | Type |
|-------|-------------|---------|------|
| `Error` | Message d'erreur | `null` si succès ; `"Article not found."` ; `"Inactive article"` ; `"Lock: Z"` (bloqué impayés) ; `"Lock: D"` (bloqué livraisons) | String |
| `Quantity` | Stock | 0-5 = valeur exacte | Double |
| `RetailPrice` | Prix de détail | — | Double |
| `Price` | Prix pour le client | — | Double |
| `VAT` | Montant TVA | En % | Double |
| `Discount` | Remise supplémentaire | Remise si commande aux heures spéciales — contacter le représentant commercial | Double |
| `Replacement` | Numéro remplaçant (si existe) | `null` si pas de remplaçant. ⚠️ Contenu exact de la String non précisé dans le PDF : s'agit-il d'un NrMotonet, d'une concaténation DLNr+Elnumerdd, ou autre ? À comparer avec `GetPriceAndQuantityMore` (section 6.2) qui retourne un objet structuré. | String |
| `Deposit` | Valeur du dépôt | `0.0` si pas de dépôt | Double |

---

### 6.2 GetPriceAndQuantityMore

**Description** : Retourne le stock et le prix d'un article (ou groupe) par numéro TecDoc — **plage étendue**. **C'est la fonction recommandée.**

**Structure de requête** : identique à `GetPriceAndQuantity`.

**Paramètres** : identiques à `GetPriceAndQuantity`.

**Différence dans la réponse** :

| Champ | GetPriceAndQuantity | GetPriceAndQuantityMore |
|-------|--------------------|-----------------------|
| `Quantity` | 0-5 exact | **0-25 exact, 26 = plus de 25** |

**Champs de réponse** (identiques sauf Quantity) :

| Champ | Description | Détails | Type |
|-------|-------------|---------|------|
| `Error` | Message d'erreur | `null` si succès ; `"Article not found."` ; `"Inactive article"` ; `"Lock: Z"` ; `"Lock: D"` | String |
| `Quantity` | Stock | 0-25 = valeur exacte ; **26 = plus de 25 unités** | Double |
| `RetailPrice` | Prix de détail | — | Double |
| `Price` | Prix pour le client | — | Double |
| `VAT` | Montant TVA | En % | Double |
| `Discount` | Remise supplémentaire | Remise si commande aux heures spéciales | Double |
| `Replacement` | Remplaçant (si existe) | `null` si pas de remplaçant | `Object {"DLNr": String, "Elnumerdd": String}` |
| `Deposit` | Valeur du dépôt | `0.0` si pas de dépôt | Double |

> Note : dans `GetPriceAndQuantityMore`, le champ `Replacement` retourne un objet `{"DLNr": ..., "Elnumerdd": ...}` au lieu d'une simple string.
>
> ⚠️ **Typo dans le PDF** : la table du PDF indique `"Strong"` pour le type de `Replacement` — c'est une coquille évidente pour `"String"`. L'exemple de réponse JSON (`{"DLNr": "0034", "Elnumerdd": "00-457.09"}`) confirme que le type réel est un objet, pas une chaîne.

---

### 6.3 SubmitOrder

**Description** : Passe une commande pour un groupe d'articles basée sur les numéros TecDoc.

**Structure de requête** (reproduite telle quelle depuis le PDF, page 48) :
```json
{
  "Auth": {"FIKS": "99999", "Motonet": "9999"},
  "OrderGUID": "3026a8d3-e162420a-9b58-0b4b68302339",
  "Elems": [
    {"Quantity": 3, "DLNr": "0043", "Elnumerdd": "CCH865"},
    {"Quantity": 1, "DLNr": "0003", "Elnumerdd": "03.2419-8150.3"}
  ]
}
```

> ⚠️ **UUID malformé dans le PDF** : l'`OrderGUID` ci-dessus (`3026a8d3-e162420a-9b58-0b4b68302339`) ne respecte pas le format UUID standard 8-4-4-4-12. Le 2ème groupe contient 8 caractères (`e162420a`) au lieu de 4. Il manque un tiret entre `e162` et `420a`. La valeur corrigée probable est `3026a8d3-e162-420a-9b58-0b4b68302339` (format 8-4-4-4-12). C'est l'unique exemple disponible dans le PDF — reproduit ici avec sa coquille.

**Structure de requête corrigée (format UUID standard)** :
```json
{
  "Auth": {"FIKS": "99999", "Motonet": "9999"},
  "OrderGUID": "3026a8d3-e162-420a-9b58-0b4b68302339",
  "Elems": [
    {"Quantity": 3, "DLNr": "0043", "Elnumerdd": "CCH865"},
    {"Quantity": 1, "DLNr": "0003", "Elnumerdd": "03.2419-8150.3"}
  ]
}
```

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `FIKS` | Numéro de compte partenaire | String |
| `Motonet` | Numéro motonet partenaire | String |
| `OrderGUID` | ID de la commande | String |
| `Quantity` | Quantité commandée | Integer |
| `DLNr` | Code fabricant conforme TecDoc | String |
| `Elnumerdd` | Numéro d'article fabricant conforme TecDoc | String (**le PDF indique "Double" mais c'est une erreur** : les exemples comme `"03.2419-8150.3"` ou `"CCH865"` sont des chaînes alphanumériques impossibles à représenter en Double — traiter impérativement comme String) |

**Réponse** : tableau JSON, une entrée par article, dans le même ordre que l'input.

| Champ | Description | Détails | Type |
|-------|-------------|---------|------|
| `Error` | Message d'erreur | `null` si succès ; `"Article not found."` ; `"Inactive article"` ; `"Lock: Z"` ; `"Lock: D"` | String |
| `QuantityOrdered` | Quantité commandée | — | Double |
| `QuantityStep` | Quantité de vente | Type non précisé dans le PDF ; vraisemblablement **Double** par analogie avec les autres champs numériques. ⚠️ Le PDF dit "Selling quantity" sans préciser si c'est un **minimum absolu** (ex. : min. 3 unités) ou un **incrément de commande** (ex. : multiples de 4 uniquement). Ces deux sémantiques ont des implications différentes pour la validation côté client. À préciser auprès de Moto-Profil. | — |
| `RetailPrice` | Prix de détail | — | Double |
| `Price` | Prix pour le client | — | Double |
| `VAT` | Montant TVA | En % | Double |
| `Replacement` | Numéro remplaçant DLNr + Elnumerdd | `null` si pas de remplaçant | String |

> Note : la table de la page 40 mentionne également `GetPriceAndQuantityURL` (retourne stock et prix avec ELID) mais **cette méthode n'est pas documentée dans les pages suivantes**.

---

## 7. WSMotoOferta.asmx — Listes de prix (catalogues offline)

Ce service fournit des **listes de prix complètes** téléchargeables pour le catalogue Moto-Profil. Ces méthodes sont principalement utilisées pour synchronisation offline.

> **Contrainte de taux** : la plupart des méthodes peuvent être appelées **au maximum une fois par heure par client par localisation**.

---

### 7.1 ZwrocArtykulyProgramuMotoProfit

**Description** : Retourne la liste des articles du programme de fidélité MotoProfit (format objet XML).

**Paramètres** : `Fiks`, `nr_kontrahenta_motonet`

**Réponse** : Liste d'objets `ArtykulOfertaMotoProfit`.

**Structure XML** :
```xml
<ArrayOfArtykulOfertaMotoProfit>
  <ArtykulOfertaMotoProfit>
    <Prefiks>string</Prefiks>
    <Indeks>string</Indeks>
    <BonusPH>decimal</BonusPH>
    <BonusWarsztat>decimal</BonusWarsztat>
  </ArtykulOfertaMotoProfit>
  ...
</ArrayOfArtykulOfertaMotoProfit>
```

| Champ | Description |
|-------|-------------|
| `Prefiks` | Préfixe fabricant |
| `Indeks` | Index article |
| `BonusPH` | Bonus accordé au **partenaire** pour la vente de l'article |
| `BonusWarsztat` | Bonus accordé au **client du partenaire** pour l'achat de l'article |

**Exemple C#** :
```csharp
var ws = new WSMotoOferta();
ArtykulOfertaMotoProfit[] listaObjectow = ws.ZwrocArtykulyProgramuMotoProfit(fiks, motonet);
foreach (var artykulOferta in listaObiektow)  // ← bug de compilation dans le PDF source
{
    var prefiks = artykulOferta.Prefiks;
    var indeks = artykulOferta.Indeks;
    var bonusPartnerH = artykulOferta.BonusPH;
    var bonusWarsztat = artykulOferta.BonusWarsztat;
}
```

> ⚠️ **Erreur de compilation dans le PDF source** : la variable est déclarée `listaObjectow` (avec "w") mais utilisée dans le `foreach` comme `listaObiektow` (avec "w" différent — "Object" vs "Obiekt"). Ce code ne compile pas tel quel. La correction est d'utiliser le même nom de variable dans les deux lignes.

---

### 7.2 ZwrocArtykulyProgramuMotoProfitCSV

**Description** : Retourne la liste des articles du programme MotoProfit en format **CSV**.

**Paramètres** : `Fiks`, `nr_kontrahenta_motonet`

**Réponse** : Liste de strings.

**Structure d'une ligne** :
```
"prefiks";"indeks";bonusPartnerPH;bonusWarsztat
```

| Champ | Description |
|-------|-------------|
| `bonusPartnerPH` | Bonus accordé au partenaire pour la vente |
| `bonusWarsztat` | Bonus accordé au client du partenaire pour l'achat |

**Exemple** :
```
"ABS";"0002Q";2,34;3,45
```

**Exemple C#** (page 55 du PDF — reproduit avec ses erreurs de syntaxe) :
```csharp
Var ws = new WSMotoOfeta();
String[] listaString = ws.ZwrocArtykulyProgramuMotoProfitCsv(fiks, motonet);
Foreach (var artykulOferta in listaString) {
    var artykulOfertaDane = artykulOferta.Split(`;');
    var prefiks = artykulOfertaDane[0];
    var indeks = artykuofertaDane[1];
    var bonusPartnerH = artykulOfertaDane[2];
    var bonusWarsztat = artykulOfertaDane[3];
}
```

> ⚠️ **5 bugs dans le code C# du PDF (page 55)** — code non compilable en l'état :
> 1. `Var` (majuscule) → doit être `var`
> 2. `WSMotoOfeta` → doit être `WSMotoOferta` (`r` manquant)
> 3. `Foreach` (majuscule) → doit être `foreach`
> 4. `Split(`;')` — guillemets mixtes : backtick `` ` `` en ouverture, apostrophe `'` en fermeture → doit être `Split(';')`
> 5. `artykuofertaDane` → doit être `artykulOfertaDane` (`l` manquant dans le nom de variable)

---

### 7.3 ZwrocCennikDetalOffline *(ARCHIVÉE)*

> **⚠️ Fonction archivée. Utiliser `ZwrocCennikDetalOfflineWiecej` à la place.**

**Contrainte** : max 1 appel/heure par client par localisation.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `Wersja` | Identifiant de version logicielle (peut être n'importe quelle chaîne) | String |

> Note : le PDF liste `Wersja` comme paramètre de cette méthode. Il n'est pas établi si ce paramètre existait dès l'origine ou a été ajouté lors d'une version ultérieure.

**Stock codé** : 0-5 = valeur exacte ; **6 = plus de cinq unités**

**Structure d'une ligne** :
```
Prefiks|indeks|type|stock|NET_retail_price|GROSS_retail_price|VAT_amount|NET_price_for_Partner
```

> ⚠️ **Typo dans le PDF** : la description textuelle du PDF (page 56) indique `Profiks` (avec `o`) au lieu de `Prefiks` (avec `e`) pour le premier champ. C'est une coquille évidente — le terme correct `Prefiks` est utilisé dans l'ensemble du document.

| Valeur `type` | Signification |
|--------------|---------------|
| `T` | Article régulier |
| `K` | Noyau de dépôt (deposit core) |

---

### 7.4 ZwrocCennikDetalOfflineSzczegolyCSV *(ARCHIVÉE)*

> **⚠️ Fonction archivée. Utiliser `ZwrocCennikDetailOfflineSzczegolyCSVWiecej` à la place.**

**Contrainte** : max 1 appel/heure par client par localisation.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `Wersja` | Identifiant de version logicielle (peut être n'importe quelle chaîne) | String |

**Stock codé** : 0-5 = valeur exacte ; **6 = plus de cinq unités**

**Structure d'une ligne (séparateur `;`)** :
```
"Prefiks";"indeks";"type";"NET_retail_price";"GROSS_retail_price";"VAT_amount";"NET_price_for_Partner";"currency";"not_returnable";"deposite_core_value";"minimum_order_quantity";"supplier's_number";"DLNr";"Elnumerdd"
```

**Exemple** :
```
"ABS";"0002Q";"T";"0";"31,88";"39,21";"23";"16,58";"PLN";"N";"0";"1";"0002Q";"0206";"0002Q"
"ABS";"421591_REG";"K";"0";"140";"172,2";"23";"117,32";"PLN";"N";"0";"2"
```

> ⚠️ **Incohérence champ `stock`** : la description textuelle du PDF liste 14 champs et ne mentionne pas `stock`. Pourtant l'exemple de la ligne `T` contient **15 valeurs** — le "0" en 4ème position est le stock non documenté. Ce champ est donc présent dans l'exemple mais absent de la description officielle.
>
> ⚠️ **Lignes tronquées pour articles `K`** : la ligne `421591_REG` (type K) ne contient que 12 champs au lieu des 15 observés pour le type T. Les colonnes `supplier's_number`, `DLNr` et `Elnumerdd` semblent absentes pour les noyaux de dépôt. Ce comportement n'est pas expliqué dans le PDF.

---

### 7.5 ZwrocCennikDetailOfflineSzczegolyCSVWiecej

**Description** : Retourne la liste complète des prix de détail avec stock — **plage étendue**. **C'est la fonction recommandée** (remplace `ZwrocCennikDetalOfflineSzczegolyCSV`).

**Contrainte** : max 1 appel/heure par client par localisation.

**Paramètres** :

| Nom | Description | Type |
|-----|-------------|------|
| `Fiks` | Numéro de compte partenaire | String |
| `nr_kontrahenta_motonet` | Numéro motonet partenaire | String |
| `Wersja` | Identifiant de version logicielle (peut être n'importe quelle chaîne) | String |

**Stock codé** : 0-25 = valeur exacte ; **26 = plus de 25 unités**

**Structure d'une ligne** :
```
"prefiks";"indeks";"type";"stock";"NET_retail_price";"GROSS_retail_price";"VAT_amount";"NET_price_for_Partner";"currency";"not_returnable";"deposite_core_value";"minimum_order_quantity";"supplier's_number";"DLNr";"Elnumerdd"
```

**Exemple** :
```
"ABS";"0002Q";"T";"0";"31,88";"39,21";"23";"16,58";"PLN";"N";"0";"1";"0002Q";"0206";"0002Q"
"ABS";"421591_REG";"K";"0";"140";"127,2";"23";"117,32";"PLN";"N";"0";"2"
```

> ⚠️ **Incohérence du document source — conflit de prix entre méthodes recommandées** : pour l'article `ABS|421591_REG|K`, le prix GROSS diverge selon la méthode :
>
> | Méthode | Statut | GROSS `ABS\|421591_REG\|K` |
> |---------|--------|--------------------------|
> | `ZwrocCennikDetalOfflineSzczegolyCSV` (§7.4) | Archivée | `172,2` |
> | `ZwrocCennikDetailOfflineSzczegolyCSVWiecej` (§7.5) | **Recommandée** | `127,2` |
> | `ZwrocCennikDetalOfflineWiecej` (§7.6) | **Recommandée** | `172,2` |
>
> Deux méthodes recommandées retournent des valeurs différentes. La méthode archivée (§7.4) et la méthode recommandée §7.6 s'accordent sur `172,2`. C'est donc très probablement **§7.5 qui contient la coquille** (`127,2` au lieu de `172,2`). Reproduit tel quel depuis le PDF.
>
> ⚠️ Même observation sur les lignes tronquées pour les articles de type `K` que dans la section 7.4.

---

### 7.6 ZwrocCennikDetalOfflineWiecej

**Description** : Retourne la liste des prix de détail avec stock — **plage étendue**. **C'est la fonction recommandée** (remplace `ZwrocCennikDetalOffline`).

**Contrainte** : max 1 appel/heure par client par localisation.

**Paramètres** : `Fiks`, `nr_kontrahenta_motonet`, `Wersja`

**Stock codé** : 0-25 = valeur exacte ; **26 = plus de 25 unités**

**Structure d'une ligne** :
```
Prefiks|indeks|type|stock|NET_retail_price|GROSS_retail_price|VAT_amount|Net_price_for_Partner
```

**Exemple** :
```
ABS|421591|T|0|384,64|473,11|23|351,23
ABS|421591_REG|K|0|140|172,2|23|117,32
```

---

### 7.7 ZwrocListeArtykulowMPTD

**Description** : Retourne la liste des articles Moto-Profil avec leur correspondance dans le catalogue TecDoc.

**Paramètres** : `Fiks`, `nr_kontrahenta_motonet`

**Réponse** : Liste de strings.

**Structure d'une ligne** :
```
Prefiks|indeks|producer_code|producer_item_number
```

| Champ | Description |
|-------|-------------|
| `Prefiks` | Préfixe article dans l'offre Moto-Profil |
| `indeks` | Index article dans l'offre Moto-Profil |
| `producer code` | Code fabricant conforme TecDoc (DLNr) |
| `producer item number` | Numéro article fabricant conforme TecDoc (Elnumerdd) |

**Exemples** :
```
ATE|03.2419-8150|0003|03.2419-8150.3.
RTS|017.00020|0430|017-00020
```

> ⚠️ **Risque de "Article not found" en production** : le premier exemple montre `Elnumerdd = 03.2419-8150.3.` avec un **point final**. Or le même article est référencé dans §6.1/6.2 (`GetPriceAndQuantity` / `GetPriceAndQuantityMore`) avec `"Elnumerdd": "03.2419-8150.3"` **sans point final**. Ces deux valeurs proviennent du même PDF.
>
> Si les données extraites de `ZwrocListeArtykulowMPTD` sont utilisées pour alimenter les requêtes de `GetPriceAndQuantityMore`, un `Elnumerdd` avec point final retournera probablement `"Article not found."`. **À valider auprès de Moto-Profil** : le point final est-il un artefact typographique du PDF ou fait-il partie du numéro article TecDoc ?

---

### 7.8 ZwrocPlikOfertyMotoProfit

**Description** : Retourne un fichier CSV avec l'offre MotoProfit complète.

**Paramètres** : `Fiks`, `nr_kontrahenta_motonet`

**Réponse** : Tableau d'octets (`Byte[]`) contenant un fichier CSV avec en-tête.

> ⚠️ **Structure du CSV non documentée** : le PDF indique uniquement "Byte array contains csv file with header" sans définir les colonnes ni le format des lignes. La structure du fichier n'est pas décrite dans le document source. À demander à Moto-Profil ou à inférer en comparant avec `ZwrocArtykulyProgramuMotoProfitCSV` (section 7.2), qui retourne le même programme MotoProfit en CSV avec la structure `"prefiks";"indeks";bonusPartnerPH;bonusWarsztat`.

**Remarque** : Le fichier d'offre est **mis à jour une fois par heure**.

**Exemple C#** (page 64 du PDF — reproduit avec ses erreurs de syntaxe) :
```csharp
Var ws = ner WSMotoOferta ();
Byte[] dane = ws.ZwrocPlikOfertyMotoProfit (fiks, motonet);
FileStream file = File.Create (@'e:\tmp\tmp.csv");
File.Write(dane, 0, dane.Length);
File.Close();
```

> ⚠️ **5 bugs dans le code C# du PDF (page 64)** — code non compilable en l'état :
> 1. `Var` (majuscule) → `var`
> 2. `ner` → `new`
> 3. Guillemets mixtes dans `@'e:\tmp\tmp.csv"` (ouverture apostrophe, fermeture guillemet double) → `@"e:\tmp\tmp.csv"`
> 4. `File.Write` → `file.Write` (référence à la variable `FileStream file`, pas à la classe statique `File`)
> 5. `File.Close()` → `file.Close()`
>
> **Version corrigée** :
> ```csharp
> var ws = new WSMotoOferta();
> Byte[] dane = ws.ZwrocPlikOfertyMotoProfit(fiks, motonet);
> FileStream file = File.Create(@"e:\tmp\tmp.csv");
> file.Write(dane, 0, dane.Length);
> file.Close();
> ```

---

### 7.9 ZwrocCennikDetalOfflinePelny

**Description** : Retourne la liste complète des prix de détail avec les stocks **par entrepôt** (Chorzów, Warszawa, Świebodzin).

**Contrainte** : max 1 appel/heure par client par localisation.

**Paramètres** : `Fiks`, `nr_kontrahenta_motonet`

> Note : Le paramètre `Wersja` (présent dans toutes les autres méthodes offline) **n'est pas listé** dans le PDF pour cette méthode. S'il s'agit d'un oubli ou d'une différence intentionnelle n'est pas précisé.

**Stock codé** : 0-5 = explicité dans le PDF comme "implicit amount" (terme exact du document source), 6 = plus de cinq unités. Le PDF emploie "implicit" sans définition supplémentaire — les autres méthodes offline utilisent "explicit" pour le même concept.

**Structure d'une ligne** :
```
"prefiks";"indeks";"type";"stock_CHORZOW";"stock_WARSZAWA";"STOCK_SWIEBODZIN";"NET_retail_price";"GROSS_retail_price";"VAT_amount";"NET_price_for_Partner";"currency";"not_returnable";"deposite_core_value";"minimum_order_quantity";"supplier's_number";"DLNr";"Elnumerdd"
```

**Entrepôts** : CHORZOW, WARSZAWA, SWIEBODZIN (trois entrepôts distincts).

**Exemples** :
```
"ABS";"0002Q";"T";"0";"5";"6";"31,88";"39,21";"23";"16,58";"PLN";"N";"0";"1";"0002Q";"0206";"0002Q"
"ABS";"421591_REG";"K";"0";"";"6";"140";"172,2";"23";"117,32";"PLN";"N";"0";"2";"";"";"" 
```

> **Comportement type K — différent de 7.4 et 7.5** : contrairement aux sections 7.4 et 7.5 où les lignes de type `K` sont tronquées à 12 champs, ici la ligne `K` contient les **17 champs complets**, avec les colonnes `supplier's_number`, `DLNr` et `Elnumerdd` remplacées par des chaînes vides (`"";"";""`). Le parser doit gérer les deux comportements selon la méthode appelée.

---

## 8. Codes d'erreur et états spéciaux

### 8.1 Codes pour les méthodes de stock/prix et de commande (pipe-separated)

| Code | Signification | Exemple de réponse |
|------|--------------|-------------------|
| `-1` | Article **inactif** | `-1\|-1\|-1\|-1\|-1` |
| `-2` | **Numéro motonet incorrect** (article inexistant) | `-2\|-2\|-2\|-2\|-2` |
| `Z\|...` | Partenaire **bloqué pour factures impayées** | Voir tableau détaillé ci-dessous |
| `D\|...` | Partenaire **bloqué pour confirmations de livraisons manquantes** | Voir tableau détaillé ci-dessous |

**Format Z/D selon la méthode — différences critiques pour le parsing** :

| Méthode | Format Z | Format D | Nb champs après Z/D |
|---------|---------|---------|-------------------|
| `ZamowTowary`, `ZamowTowaryMultiMag`, `ZamowTowaryNrZamowienia` | `Z\|prix_détail\|prix_partenaire\|TVA` | `D\|prix_détail\|prix_partenaire\|TVA` | 3 (pas de stock) — **⚠️ à valider** |
| `ZwrocStanCeny` *(archivée)*, `ZwrocStanCenyWiecej` | `Z\|stock(0-6 ou 0-26)\|prix_détail\|prix_partenaire\|TVA` | idem | 4 (1 valeur de stock) |
| `ZwrocStanCenyDostepnosc` *(archivée)*, **`ZwrocStanCenyDostepnoscWiecej`** | `Z\|main_stock\|local_stock\|prix_détail\|prix_partenaire\|TVA` | idem | 5 (2 valeurs de stock) |

> ⚠️ **Impact direct sur le parser** : le nombre de champs après `Z` ou `D` varie de 3 à 5 selon la méthode appelée. Un parser générique doit brancher sur le nom de la méthode, pas seulement détecter le préfixe `Z|`/`D|`.
>
> ⚠️ **Ambiguïté spécifique aux méthodes de commande** : la ligne "3 (pas de stock)" pour `ZamowTowary` et ses variantes est basée sur l'exemple du PDF. Le texte descriptif du même document indique pourtant 4 champs (avec stock). Cette contradiction n'existe pas pour les méthodes de stock (texte et exemple cohérents). Valider le format réel auprès de Moto-Profil avant d'implémenter le parser pour les méthodes de commande.

### 8.2 Codes d'erreur pour les méthodes JSON (WSMotoKlientTD)

| Valeur `Error` | Signification |
|---------------|--------------|
| `null` | Opération réussie |
| `"Article not found."` | Article non trouvé |
| `"Inactive article"` | Article inactif |
| `"Lock: Z"` | Partenaire bloqué — factures impayées |
| `"Lock: D"` | Partenaire bloqué — livraisons non confirmées |

---

## 9. Fonctions archivées vs fonctions recommandées

| Fonction archivée | Fonction recommandée |
|------------------|---------------------|
| `ZwrocStanCeny` (stock 0-6) | `ZwrocStanCenyDostepnoscWiecej` (stock 0-26, local+principal) |
| `ZwrocStanCenyDostepnosc` (stock 0-6) | `ZwrocStanCenyDostepnoscWiecej` (stock 0-26) |

> **Note sur `ZwrocStanCenyWiecej` (section 5.18)** : cette méthode est **active et non archivée**, mais elle retourne un stock global unique (sans distinction local/principal). Elle constitue une alternative intermédiaire à `ZwrocStanCenyDostepnoscWiecej` : plage étendue (0-26) mais **une seule valeur de stock** au lieu de deux. Pour tout nouveau développement, préférer `ZwrocStanCenyDostepnoscWiecej` qui apporte la granularité local/principal en plus.
| `GetPriceAndQuantity` (stock 0-5) | `GetPriceAndQuantityMore` (stock 0-26) |
| `ZwrocCennikDetalOffline` (stock 0-6) | `ZwrocCennikDetalOfflineWiecej` (stock 0-26) |
| `ZwrocCennikDetalOfflineSzczegolyCSV` (stock 0-6) | `ZwrocCennikDetailOfflineSzczegolyCSVWiecej` (stock 0-26) |

> ⚠️ **Note de casse** : le document source utilise parfois la minuscule initiale `zwrocCennikDetalOffline` (ex. dans le tableau WSMotoOferta et l'historique v1.7.7). Dans toute cette analyse, les noms sont normalisés avec majuscule initiale (`ZwrocCennikDetalOffline`). Vérifier la casse réelle via le WSDL avant l'implémentation.
>
> ⚠️ **Changement de mot `Detal` → `Detail`** : le passage de la méthode archivée à la méthode recommandée ne modifie pas seulement la casse — le mot lui-même change : `Detal` (polonais) devient `Detail` (anglais). Ajouter simplement `Wiecej` au nom archivé donnera `ZwrocCennikDetalOfflineSzczegolyCSVWiecej` — une méthode **inexistante**. Le nom correct est `ZwrocCennik**Detail**OfflineSzczegolyCSVWiecej`.
>
> ⚠️ **Incohérence interne au PDF** : le tableau d'index de WSMotoOferta (page 52) liste cette méthode sous le nom `ZwrocCennikDetalOfflineSzczegolyCSVWiecej` (avec `Detal`), mais la section qui la définit (page 60) l'appelle `ZwrocCennikDetailOfflineSzczegolyCSVWiecej` (avec `Detail`). Le PDF lui-même est incohérent sur le nom de cette méthode. Le WSDL (`?wsdl`) est la référence à utiliser pour déterminer le nom exact lors de l'implémentation.

**Raison principale de la migration** : Les nouvelles fonctions retournent des plages de stock **plus précises** (0-25 explicite vs 0-5) permettant de distinguer jusqu'à 26 unités en stock.

---

## 10. Tableau récapitulatif de toutes les méthodes

### WSMotoKlient.asmx

| Méthode | Description courte | Paramètres clés | Type de réponse | Statut |
|---------|-------------------|-----------------|-----------------|--------|
| `InformacjaOKontrahencie` | Devise du compte partenaire | Fiks, motonet | String (devise) | Actif |
| `InvoiceCommission` | Facture commission + commande optionnelle | JSON (Auth + Items) | JSON | Actif |
| `ZwrocDostawyKontrahenta` | Liste des livraisons | Fiks, motonet | String[] pipe-sep | Actif |
| `ZamowTowary` | Passer une commande | Fiks, motonet, lista + GUID | String[] pipe-sep | Actif |
| `ZamowTowaryMultiMag` | Passer une commande (multi-entrepôts) | Fiks, motonet, lista + GUID | String[] pipe-sep | Actif |
| `ZamowTowaryNrZamowienia` | Passer une commande avec N° commande | Fiks, motonet, lista + GUID + nr_zamowienia | String[] pipe-sep | Actif |
| `PotwierdzZamowienie` | Confirmer réception commande | Fiks, motonet, GUID | String[] ou vide | Actif |
| `ZwrocSzczegolyZamowieniaLista` | Détails commande par entrepôt | Fiks, motonet, GUID | String[] pipe-sep | Actif |
| `ZwrocDepozyty` | Commandes passées/réalisées à une date | Fiks, motonet, Data | String[] pipe-sep | Actif |
| `ZwrocNumeryFaktur` | N° de factures d'une journée | Fiks, motonet, Data | String[] pipe-sep | Actif |
| `ZwrocPozycjeFaktury` | Articles d'une facture | Fiks, motonet, numer_ksiegowy | String[] pipe-sep | Actif |
| `ZwrocPozycjeFakturyZVat` | Articles d'une facture avec TVA | Fiks, motonet, numer_ksiegowy | String[] pipe-sep | Actif |
| `ZwrocNumeryFKZ` | N° d'avoirs d'une journée | Fiks, motonet, Data | String[] pipe-sep | Actif |
| `ZwrocPozycjeFKZ` | Articles d'un avoir FKZ | Fiks, motonet, Identyfikator (int) | String[] pipe-sep | Actif |
| `ZwrocNumeryLZ` | N° de listes de chargement d'une journée | Fiks, motonet, Data | String[] pipe-sep | Actif |
| `ZwrocPozycjeLZ` | Articles d'un LZ (avec gestion multi-boîtes) | Fiks, motonet, Identyfikator (int) | String[] pipe-sep | Actif |
| `ZwrocStanCeny` | Stock + prix (plage 0-6) | Fiks, motonet, lista_nr_motonet | String[] pipe-sep | **ARCHIVÉE** |
| `ZwrocStanCenyWiecej` | Stock + prix (plage 0-26) | Fiks, motonet, lista_nr_motonet | String[] pipe-sep | Actif |
| `ZwrocStanCenyDostepnosc` | Stock local+principal + prix (0-6) | Fiks, motonet, lista_nr_motonet | String[] pipe-sep | **ARCHIVÉE** |
| `ZwrocStanCenyDostepnoscWiecej` | Stock local+principal + prix (0-26) | Fiks, motonet, lista_nr_motonet | String[] pipe-sep | **Recommandée** |

### WSMotoKlientTD.asmx

| Méthode | Description courte | Paramètres clés | Type de réponse | Statut |
|---------|-------------------|-----------------|-----------------|--------|
| `GetPriceAndQuantity` | Stock + prix par TecDoc (0-5) | JSON Auth + Elems(DLNr, Elnumerdd) | JSON array | **ARCHIVÉE** |
| `GetPriceAndQuantityMore` | Stock + prix par TecDoc (0-26) | JSON Auth + Elems(DLNr, Elnumerdd) | JSON array | **Recommandée** |
| `SubmitOrder` | Passer commande par TecDoc | JSON Auth + OrderGUID + Elems | JSON array | Actif |
| `GetPriceAndQuantityURL` | Stock + prix avec ELID | — | — | Mentionné (non documenté) |

### WSMotoOferta.asmx

| Méthode | Description courte | Paramètres clés | Type de réponse | Statut | Limite |
|---------|-------------------|-----------------|-----------------|--------|--------|
| `ZwrocArtykulyProgramuMotoProfit` | Articles MotoProfit (XML objet) | Fiks, motonet | XML objects | Actif | — |
| `ZwrocArtykulyProgramuMotoProfitCSV` | Articles MotoProfit (CSV) | Fiks, motonet | String[] CSV | Actif | — |
| `ZwrocCennikDetalOffline` | Prix détail + stock (0-6) | Fiks, motonet, Wersja | String[] pipe-sep | **ARCHIVÉE** | 1/heure |
| `ZwrocCennikDetalOfflineSzczegolyCSV` | Prix détail détaillé CSV (0-6) | Fiks, motonet, Wersja | String[] CSV | **ARCHIVÉE** | 1/heure |
| `ZwrocCennikDetailOfflineSzczegolyCSVWiecej` | Prix détail détaillé CSV (0-26) | Fiks, motonet, Wersja | String[] CSV | **Recommandée** | 1/heure |
| `ZwrocCennikDetalOfflineWiecej` | Prix détail + stock (0-26) | Fiks, motonet, Wersja | String[] pipe-sep | **Recommandée** | 1/heure |
| `ZwrocListeArtykulowMPTD` | Articles MP avec correspondance TecDoc | Fiks, motonet | String[] pipe-sep | Actif | — |
| `ZwrocPlikOfertyMotoProfit` | Fichier CSV offre MotoProfit | Fiks, motonet | Byte[] (CSV) | Actif | Màj 1/heure |
| `ZwrocCennikDetalOfflinePelny` | Prix + stock par entrepôt (CHO/WAW/SWI) | Fiks, motonet | String[] CSV | Actif | 1/heure |

---

## 11. Points d'attention pour l'implémentation

### 11.1 Identification des articles

Il existe **deux systèmes d'identification** selon le Web Service utilisé :

| Système | Champs | Exemple | Service |
|---------|--------|---------|---------|
| **Motonet** | `NrMotonet` = Prefiks + Indeks | `ABS0215Q` | WSMotoKlient |
| **TecDoc** | `DLNr` + `Elnumerdd` | `"0003"` + `"03.2419-8150.3"` | WSMotoKlientTD |
| **Correspondance** | Utiliser `ZwrocListeArtykulowMPTD` | — | WSMotoOferta |

### 11.2 Gestion des GUID de commande

- Le GUID est **généré côté client** et envoyé comme dernière ligne de `lista_nr_motonet_ilosc`.
- Il sert à **vérifier** la commande via `PotwierdzZamowienie` en cas de timeout ou d'erreur réseau.
- Format attendu : `452E4B5D-B5FF-44a2-B733-EDE0DC28C77E` — l'analyse du seul exemple disponible indique un **UUID v4 conforme à la RFC 4122** (3ème groupe commence par `4` = version 4 ; 4ème groupe commence par `B` = variant bits `1011`). Le PDF ne spécifie pas explicitement la version UUID. Générer des UUID v4 est l'approche la plus sûre, mais à confirmer auprès de Moto-Profil si d'autres variantes sont acceptées.

### 11.3 Interprétation du stock

| Plage stock | Méthodes concernées | Signification de la valeur max |
|-------------|--------------------|-----------------------------|
| 0-6 (max = 6) | Méthodes archivées | 6 = "plus de 5 unités" |
| 0-26 (max = 26) | Méthodes Wiecej/More | 26 = "plus de 25 unités" |

**En pratique** : les valeurs max (6 ou 26) signifient **"plus que" et non une valeur exacte**.

### 11.4 Gestion des blocages partenaire

Deux types de blocages peuvent survenir lors des commandes et consultations de stock :
- **Blocage Z** : trop de factures impayées — la réponse commence par `Z|` (pipe-sep) ou `"Lock: Z"` (JSON)
- **Blocage D** : confirmations de livraisons manquantes — commence par `D|` ou `"Lock: D"`

Dans les deux cas, des informations de prix et stock sont tout de même retournées.

### 11.5 Articles remplaçants

Quand un article a un remplaçant, des **champs supplémentaires** sont ajoutés en fin de ligne (méthodes pipe-sep) ou dans un objet `Replacement` (méthodes JSON). Il faut gérer ces deux cas.

### 11.6 Encodage et caractères spéciaux

- Les PDFs contiennent des caractères polonais (ę, ó, ś, ż, etc.) — l'implémentation doit prévoir **UTF-8**.
- Les prix utilisent parfois la **virgule** comme séparateur décimal (ex. : `20,56`) au lieu du point — prévoir les deux formats.

### 11.7 Contrainte de taux (WSMotoOferta)

Les méthodes de catalogue offline sont limitées à **1 appel par heure par client par localisation**. Ne pas construire de polling fréquent sur ces endpoints.

### 11.8 Token OAuth — durée de vie

Le Bearer token a une durée de vie de **604 800 secondes (7 jours)**. Implémenter un renouvellement avant expiration.

### 11.9 Version du document

La documentation des Web Services SOAP est en version **1.7.9** (dernière mise à jour : 2020-09-08). L'API REST ProfiAuto est un document séparé sans numéro de version ni date indiqués — aucune conclusion sur son antériorité ou postériorité ne peut être tirée du document lui-même.

### 11.10 Accès au WSDL (Web Services SOAP)

Pour les services SOAP `.asmx`, le contrat WSDL est accessible en ajoutant `?wsdl` à l'URL du service :

| Service | URL principale | URL de secours |
|---------|---------------|----------------|
| WSMotoKlient | `https://ws1.moto-profil.pl/MotoBiznesWS/WSMotoKlient.asmx?wsdl` | `https://ws2.moto-profil.pl/MotoBiznesWS/WSMotoKlient.asmx?wsdl` |
| WSMotoKlientTD | `https://ws1.moto-profil.pl/MotoBiznesWS/WSMotoKlientTD.asmx?wsdl` | `https://ws2.moto-profil.pl/MotoBiznesWS/WSMotoKlientTD.asmx?wsdl` |
| WSMotoOferta | `https://ws1.moto-profil.pl/MotoBiznesWS/WSMotoOferta.asmx?wsdl` | `https://ws2.moto-profil.pl/MotoBiznesWS/WSMotoOferta.asmx?wsdl` |

Le WSDL permet de vérifier la casse exacte des noms de méthodes et les types de paramètres, et de générer automatiquement des proxies client dans la plupart des langages.

### 11.11 InvoiceCommission — comportement optionnel non précisé

La description indique que la fonction "peut optionnellement passer une commande pour les pièces". Aucun champ de la requête ne contrôle explicitement ce comportement dans les exemples du PDF. Le mécanisme d'activation/désactivation n'est pas documenté.

### 11.12 ZwrocDepozyty — ambiguïté terminologique

Le nom polonais `depozyty` désigne les **dépôts/consignations** dans le secteur automobile (noyaux consignés). La description anglaise du PDF traduit par "placed and realized orders on given date", ce qui correspond à des commandes, pas à des consignations. Ces deux notions sont distinctes dans le domaine des pièces auto. Le PDF ne lève pas cette ambiguïté.

---

## Historique des versions (Dokumentacja WS MP)

| Version | Date | Changement |
|---------|------|------------|
| 1.7.2 | 2018-07-17 | Version de base documentée |
| 1.7.3 | 2018-08-01 | `InvoiceCommission` : ajout de `InvoicePrice` dans la réponse |
| 1.7.4 | 2019-02-12 | Ajout dans WSMotoOferta : `ZwrocArtykulyProgramuMotoProfit`, `ZwrocArtykulyProgramuMotoProfitCsv`, `ZwrocPlikOfertyMotoProfit` |
| 1.7.5 | 2019-08-19 | `WSMotoKlientTD→GetPriceAndQuantity` : ajout du champ `Deposit` |
| 1.7.6 | 2019-10-04 | Ajout de `ZamowTowaryNrZamowienia` (commande avec numéro de commande) |
| 1.7.7 | 2020-05-18 | Ajout info disponibilité stock (plage étendue 0-26) dans : `ZwrocStanCeny`, `ZwrocStanCenyWiecej`, `ZwrocStanCenyDostepnosc`, `ZwrocStanCenyDostepnoscWiecej`, `ZwrocCennikDetalOfflineSzczegolyCSV`, `ZwrocCennikDetalOfflineSzczegolyCSVWiecej`, `ZwrocCennikDetalOffline` (noté `zwrocCennikDetalOffline` dans le PDF), `ZwrocCennikDetalOfflineWiecej` (noté `zwrocCennikDetalOfflineWiecej` dans le PDF) |
| 1.7.8 | 2020-06-01 | Ajout dans WSMotoKlient : `ZwrocPozycjeFakturyZVat` |
| 1.7.9 | 2020-09-08 | Ajout dans WSMotoOferta : `ZwrocCennikDetalOfflinePelny` |
