# Documentation Web Service — MOTO-PROFIL (Traduction FR)
**2021**
MOTO-PROFIL SP. Z O. O. | Niedźwiedziniec 10, 41-506 Chorzów

> Traduction technique fidèle du document original : `Dokumentacja WS MP.pdf`

---

## Historique des versions

| Numéro de version | Notes de version | Date de modification |
|---|---|---|
| 1.7.2 | — | 2018-07-17 |
| 1.7.3 | InvoiceCommision — InvoicePrice dans la réponse | 2018-08-01 |
| 1.7.4 | Méthodes supplémentaires dans WSMotoOferta : ZwrocArtykulyProgramuMotoProfit, ZwrocArtykulyProgramuMotoProfitCsv, ZwrocPlikOfertyMotoProfit | 2019-02-12 |
| 1.7.5 | Attribut supplémentaire "Deposit" dans WSMotoKlientTD->GetPriceAndQuantity | 2019-08-19 |
| 1.7.6 | ZamowTowaryNrZamowienia — Passage d'une commande avec numéro de commande | 2019-10-04 |
| 1.7.7 | Informations supplémentaires sur la disponibilité du stock dans les méthodes correspondantes : (jusqu'à 6 unités) (jusqu'à 26 unités) — ZwrocStanCeny, ZwrocStanCenyWiecej, ZwrocStanCenyDostepnosc, ZwrocStanCenyDostepnoscWiecej, ZwrocCennikDetalOfflineSzczegolyCSV, ZwrocCennikDetalOfflineSzczegolyCSVWiecej, zwrocCennikDetalOffline, zwrocCennikDetalOfflineWiecej | 2020-05-18 |
| 1.7.8 | Méthode supplémentaire dans WSMotoKlient : ZwrocPozycjeFakturyZVat | 2020-06-01 |
| 1.7.9 | Méthode supplémentaire dans WSMotoOferta : ZwrocCennikDetalOfflinePelny | 2020-09-08 |

**URL principale :** https://ws1.moto-profil.pl/MotoBiznesWS/ *(màj email IT 02/06/2026 ; ancienne IP obsolète : https://195.242.186.3/MotoBiznesWS/)*

**URL de secours :** https://ws2.moto-profil.pl/MotoBiznesWS/ *(ancienne IP obsolète : https://195.242.186.16/MotoBiznesWS/)*

---

## Vue d'ensemble des Web Services

Toutes les opérations sont réparties en plusieurs Web Services :

| Nom du WS | Description |
|---|---|
| WSMotoKlient.asmx | Contient les fonctions de passation de commandes, de vérification des prix et de récupération des documents |
| WSMotoKlientTD.asmx | Contient les fonctions de passation de commandes et de vérification des prix basées sur les numéros TecDoc |
| WSMotoOferta.asmx | Contient les fonctions de récupération de la liste des prix |

---

## Terminologie de base

- **nr_kontrahenta_motonet** — Second numéro client unique à l'agence.
- **Fiks** — Numéro de compte client (Partner).
- **lista_nr_motonet** — Combinaison du Préfixe et de l'Indice Moto-Profil.
- **Prefiks** — Abréviation du fabricant, exemple : ("STM" = STEMOT).
- **Indeks** — Référence article.
- **MotoProfit** — Programme de fidélité.
- **GUID** — Identifiant unique global (*Globally Unique Identifier*).

---

# WSMotoKlient.asmx

## Liste des opérations

| Nom | Description |
|---|---|
| InformacjaOKontrahencie | Retourne les informations sur la devise du partenaire |
| InvoiceCommision | Émet une facture de commission et passe optionnellement une commande pour les pièces vendues |
| ZwrocDostawyKontrahenta | Retourne la liste des livraisons du client |
| ZamowTowary | Passe une commande |
| ZamowTowaryMultiMag | Passe une commande (réponse étendue) |
| ZamowTowaryNrZamowienia | Passe une commande avec numéro de commande |
| PotwierdzZamowienie | Fonction utilisée pour vérifier si une commande envoyée a été acceptée pour réalisation |
| ZwrocSzczegolyZamowieniaLista | Retourne la liste des informations sur les quantités commandées dans les entrepôts particuliers |
| ZwrocDepozyty | Retourne les commandes passées ou réalisées à une date donnée |
| ZwrocNumeryFaktur | Retourne les numéros de factures émises un jour donné |
| ZwrocPozycjeFaktury | Retourne la liste des articles d'une facture donnée |
| ZwrocPozycjeFakturyZVat | Retourne la liste des articles d'une facture donnée avec le montant de TVA |
| ZwrocNumeryFKZ | Retourne la liste des factures correctives FKZ |
| ZwrocPozycjeFKZ | Retourne la liste des articles FKZ |
| ZwrocNumeryLZ | Retourne la liste des LZ |
| ZwrocPozycjeLZ | Retourne la liste des articles LZ |
| ZwrotStanCeny | Retourne le stock et les prix (prix Partenaire, prix de détail et montant TVA) |
| ZwrocStanCenyWiecej | Retourne le stock et le prix d'un produit (groupe de produits) |
| ZwrocStanCenyDostepnosc | Retourne le stock et les prix pour le stock local et le stock principal |
| ZwrocStanCenyDostepnoscWiecej | Retourne le stock et le prix d'un produit (groupe de produits) pour le stock local et le stock principal |

---

## InformacjaOKontrahencie

### Description
La fonction retourne les informations sur la devise du partenaire.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |

### Réponse
Dans la version actuelle, seul le symbole de la devise du compte est retourné.

À l'avenir, les données retournées pourront être étendues. Les méthodes resteront rétrocompatibles. Toute nouvelle information sera précédée du caractère `|`.

---

## InvoiceCommission

### Description
Cette fonction émet une facture pour les pièces que le Partenaire a vendues en commission. Elle peut optionnellement passer une commande pour ces pièces.

### Requête
Le paramètre de requête est un objet JSON converti en chaîne de caractères. Aucun élément du corps ne peut être null.

**Exemple :**

```json
{
  "Auth": {
    "FIKS": "99999",
    "Motonet": "8888"
  },
  "Items": [
    { "NrMotonet": "FTROP570", "Quantity": 1.0 },
    { "NrMotonet": "ABS0215Q", "Quantity": 2.0 }
  ]
}
```

### Paramètres du corps de la requête

| Nom | Description | Type |
|---|---|---|
| FIKS | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| article_motonet | Numéro motonet de l'article | string |
| Quantity | Quantité que le Partenaire souhaite facturer | double |

### Réponse
La réponse est également un objet JSON converti en chaîne de caractères.

**Exemple :**

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

### Éléments du corps de la réponse

| Nom | Description | Détails | Type | Vide |
|---|---|---|---|---|
| Error | Message d'erreur en cas de problème | Vide si l'opération a réussi | String | Oui |
| NrMotonet | Numéro motonet de l'article | — | string | non |
| OrderedQuantity | Quantité commandée automatiquement | Retourne -1 si NrMotonet n'est pas trouvé dans le bon de sortie de commission WZ | double | non |
| InvoiceQuantity | Quantité facturée | Retourne -1 si NrMotonet n'est pas trouvé dans le bon de sortie de commission WZ | double | non |
| InvoicePrice | Prix de l'article sur la facture | — | double | non |
| Replacement | Numéro motonet de l'article de remplacement | Si le remplacement existe | string | oui |

---

## ZwrocDostawyKontrahenta

### Description
Cette fonction récupère la liste des livraisons du client.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |

### Réponse
La fonction retourne une liste de chaînes de caractères.

**Structure de chaque ligne :**
```
nom_livraison|heure|jour_livraison|description|nom_stock_local|stock_principal
```

**Exemple de réponse :**
```
|18:31|TTTTTN||Magazyn główny|T
|15:01|NNNNNT||Magazyn główny|T
|11:05|TTTTTN||Magazyn Warszawa|N
```

**Légende des champs :**
- **nom_livraison** — Nom de la livraison
- **heure** — Heures auxquelles les commandes pour la livraison sont acceptées
- **jour_livraison** — Jours où la livraison est possible (champs 0-6 = Lundi-Samedi ; T = Oui / N = Non)
- **description** — Description de la livraison
- **nom_stock_local** — Nom du stock local
- **stock_principal** — Indicateur T = Oui / N = Non, si la livraison provient du stock principal

---

## ZamowTowary

### Description
Cette fonction passe une commande pour un groupe d'articles.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| lista_nr_motonet_ilosc | Liste des articles commandés | string [] |

### Structure de chaque ligne (lista_nr_motonet_ilosc)

```
numéro_motonet_article|quantité_commandée|F ou P
```

- **F** — facture
- **P** — reçu (optionnel)

**Le dernier élément de la liste a la structure suivante :**
```
GUID|guid_id_commande_généré|G
```

L'ID de commande doit être au format GUID, ex. : `452E4B5D-B5FF-44a2-B733-EDE0DC28C77E`

**Exemple de lista_nr_motonet_ilosc :**
```
ABS0215Q|2|F
FTROP570|1|F
GUID|452E4B5D-B5FF-44a2-B733-EDE0DC28C77E|G
```

### Réponse
La fonction retourne une liste de chaînes de caractères. Chaque ligne est une information sur un article commandé particulier. L'ordre des lignes est identique à celui de la liste d'entrée. Le dernier élément (GUID) est supprimé.

**Structure de chaque ligne :**
```
prix_détail|prix_partenaire|montant_TVA|quantité_commandée|quantité_vendue|numéro_motonet_remplaçant (si existant)|préfixe_remplaçant|indice_remplaçant|nom_remplaçant
```

**Standard :**
```
20.56|13.46|23|2|1
10.37|7.46|23|1|1
```

**Standard avec remplaçant :**
```
35.35|20,56|23|5|ABS0215Q|ABS|0215Q|SPRYNKI DO SZCZK HAM. MERCEDES W123 76-85
```

**Valeurs particulières que les éléments d'une ligne peuvent prendre :**
- `-1` — article inactif → `-1|-1|-1|-1|-1`
- `-2` — numéro motonet incorrect → `-2|-2|-2|-2|-2`

**Blocage pour factures impayées :**
```
Z|quantité_stock (0-6)|prix_détail|prix_partenaire|montant_TVA
Exemple : Z|10.00|9.12|23
```

**Blocage pour confirmations de livraisons manquantes :**
```
D|quantité_stock (0-6)|prix_détail|prix_partenaire|montant_TVA
Exemple : D|56.93|51.22|23
```

---

## ZamowTowaryMultiMag

### Description
Cette fonction passe une commande pour un groupe d'articles (réponse multi-entrepôts).

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | string |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | string |
| lista_nr_motonet_ilosc | Liste des articles commandés | string [] |

### Structure de chaque ligne (lista_nr_motonet_ilosc)

```
numéro_motonet_article|quantité_commandée|F ou P
```

**Dernier élément :** `GUID|guid_id_commande_généré|G`

**Exemple :**
```
ABS0215Q|2|F
FTROP570|1|F
GUID|452E4B5D-B5FF-44a2-B733-EDE0DC28C77E|G
```

### Réponse
La fonction retourne une liste de chaînes de caractères. L'ordre des lignes est identique à celui de la liste d'entrée. Le dernier élément (GUID) est supprimé.

**Structure de chaque ligne :**
```
prix_détail|prix_partenaire|montant_TVA|quantité_commandée_CHO*|quantité_commandée_HUB**|quantité_vendue|numéro_motonet_remplaçant (si existant)|préfixe_remplaçant|indice_remplaçant|nom_remplaçant
```

- `*` **Quantité commandée CHO** — quantité commandée dans l'entrepôt de Chorzów
- `**` **Quantité commandée HUB** — quantité commandée dans les entrepôts de Warszawa et Jawczyce

**Standard :**
```
20.56|13.46|23|0|2|1
10.37|7.46|23|1|5|1
```

**Standard avec remplaçant :**
```
35.35|20,56|23|5|1|ABS0215Q|ABS|0215Q|SPRYNKI DO SZCZK HAM. MERCEDES W123 76-85
```

**Valeurs particulières :**
- `-1` article inactif → `-1|-1|-1|-1|-1`
- `-2` numéro motonet incorrect → `-2|-2|-2|-2|-2`
- Blocage factures impayées : `Z|10.00|9.12|23`
- Blocage confirmation livraisons : `D|56.93|51.22|23`

---

## ZamowTowaryNrZamowienia

### Description
Cette fonction passe une commande pour un groupe d'articles, en ajoutant un numéro de commande.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| lista_nr_motonet_ilosc | Liste des articles commandés | string [] |
| nr_zamowienia | Numéro de commande | String |

### Structure de chaque ligne (lista_nr_motonet_ilosc)

```
numéro_motonet_article|quantité_commandée|F ou P
```

**Dernier élément :** `GUID|guid_id_commande_généré|G`

**Exemple :**
```
ABS0215Q|2|F
FTROP570|1|F
GUID|452E4B5D-B5FF-44a2-B733-EDE0DC28C77E|G
```

### Réponse
La fonction retourne une liste de chaînes de caractères. L'ordre des lignes est identique à celui de la liste d'entrée. Le dernier élément (GUID) est supprimé.

**Structure de chaque ligne :**
```
prix_détail|prix_partenaire|montant_TVA|quantité_commandée|quantité_vendue|numéro_motonet_remplaçant (si existant)|préfixe_remplaçant|indice_remplaçant|nom_remplaçant
```

**Standard :** `20.56|13.46|23|2|1`

**Standard avec remplaçant :** `35.35|20,56|23|5|ABS0215Q|ABS|0215Q|SPRYNKI DO SZCZK HAM. MERCEDES W123 76-85`

**Valeurs particulières :**
- `-1` article inactif → `-1|-1|-1|-1|-1`
- `-2` numéro motonet incorrect → `-2|-2|-2|-2|-2`
- Blocage factures impayées : `Z|10.00|9.12|23`
- Blocage confirmation livraisons : `D|56.93|51.22|23`

---

## PotwierdzZamowienie

### Description
La fonction est utilisée pour vérifier si une commande envoyée a été acceptée pour réalisation, en cas d'erreur de connexion inattendue ou de dépassement de délai.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| Zamowienie_guid | Identifiant unique de la commande client envoyé comme dernier élément dans ZamowTowary | String |

### Réponse
Si la commande a été acceptée pour réalisation, la fonction retourne la liste des articles commandés. La forme de cette liste est exactement identique à celle retournée après la commande via `ZamowTowary`, `ZamowTowaryMultiMag` ou `ZamowTowaryNrZamowienia`.

Si la commande n'a pas été acceptée (erreur ou dépassement de délai), la fonction retourne une liste vide.

---

## ZwrocSzczegolyZamowieniaLista

### Description
La fonction récupère les informations détaillées sur les quantités commandées dans les entrepôts particuliers.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro de compte du partenaire | String |
| Guid | Identifiant unique de la commande client envoyé comme dernier élément dans ZamowTowary | String |

### Réponse
Retourne la liste des informations sur les quantités commandées dans les entrepôts particuliers.

**Structure de chaque ligne :**
```
Préfixe_indice|prix_détail|prix_client|taux_TVA|quantité_commandée_Stock_Principal|quantité_commandée_Stock_Local|numéro_motonet_remplaçant (si existant)
```

**Exemple :** `BLPADC446176|98,41|56,11|23|0|1`

---

## ZwrocDepozyty

### Description
Cette fonction récupère les commandes passées et réalisées à une date donnée.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| Data | Date souhaitée | DateTime YYYY-mm-dd |

### Réponse
La fonction retourne une liste de chaînes de caractères. Chaque ligne est une information sur une commande particulière.

**Structure de chaque ligne :** `numéro_motonet|prix_partenaire|quantité`

**Exemples :**
```
ABS0215Q|20.56|5
FTROP570|13.45|1
```

---

## ZwrocNumeryFaktur

### Description
Cette fonction récupère les numéros de factures émises un jour donné.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| Data | Date d'émission souhaitée des factures | DateTime YYYY-mm-dd |

### Réponse
La fonction retourne une liste d'informations sur les factures émises un jour donné.

**Structure de chaque ligne :**
```
numéro_facture|valeur_nette|valeur_TVA|remise|date_émission|date_paiement
```

**Exemple :** `FA 2543/06/2018/K|2353|451.19|0|2018-06-01|2018-07-01`

---

## ZwrocPozycjeFaktury

### Description
Cette fonction récupère la liste des articles d'une facture donnée.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| numer_ksiegowy | Numéro de facture | String |

### Réponse
La fonction retourne une liste des articles de la facture.

**Structure de chaque ligne :** `préfixe|indice|nr_motonet|quantité|prix|nom`

**Exemple :** `PSA|1609015780|PSA1609015780|1|131.54|POMPA SPRZGA CITROEN PEUGEOT`

---

## ZwrocPozycjeFakturyZVat

### Description
Cette fonction récupère la liste des articles d'une facture donnée avec le montant de TVA.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| numer_ksiegowy | Numéro de facture | String |

### Réponse
La fonction retourne une liste des articles de la facture. Le prix et le montant de TVA sont donnés pour 1 article.

**Structure de chaque ligne :** `Préfixe|indice|nr_motonet|quantité|prix|nom|montant_tva`

**Exemple :** `ABS|0622Q|ABS0622Q|10|18|SPRĘŻYNKI DO SZCZĘK HAM.MERCEDES BENZ|4.14`

---

## ZwrocNumeryFKZ

### Description
La fonction récupère la liste des numéros de factures correctives (FKZ) émises un jour donné.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| Data | Date | DateTime |

### Réponse
La fonction retourne une liste de chaînes de caractères où chaque ligne indique un document.

**Structure de chaque ligne :**
```
Id|numéro_document|date_émission|date_paiement|montant_NET|montant_TVA
```

**Exemple :** `1730141|FKZ 1798/06/208/K|2018-06-30 17:00:08|2018-09-13 17:00:08|-979,99|-1835,45`

---

## ZwrocPozycjeFKZ

### Description
Cette fonction récupère la liste des articles d'une facture corrective (FKZ) donnée.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | string |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | string |
| Identyfikator | Identifiant FKZ | int |

### Réponse
La fonction retourne une liste des articles de la facture corrective.

**Structure de chaque ligne :** `Préfixe|indice|quantité|prix_détail_NET`

**Exemple :** `FEB|21107|2|15.46`

---

## ZwrocNumeryLZ

### Description
La fonction récupère la liste des numéros de documents "liste de chargement" (LZ) émis un jour donné.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | string |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | string |
| Data | Date | DateTime |

### Réponse
La fonction retourne une liste de chaînes de caractères où chaque ligne indique un document.

**Structure de chaque ligne :** `Id|numéro_document|date_clôture`

**Exemple :** `3020930|LZ/282/27|2018-07-02 12:45:52`

---

## ZwrocPozycjeLZ

### Description
Cette fonction récupère la liste des articles d'un document LZ identifié par son ID.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | string |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | string |
| Identyfikator | Identifiant LZ | int |

### Réponse
La fonction retourne une liste de chaînes de caractères où chaque ligne correspond à un article du document LZ.

**Structure de chaque ligne :**
```
Préfixe|indice|quantité|prix_détail_NET|numéro_colis|quantité_du_document
```

- **Préfixe** — Préfixe de l'article dans l'offre Moto-Profil
- **Indice** — Indice de l'article dans l'offre Moto-Profil
- **quantité** — Quantité de l'article scannée/conditionnée
- **prix_détail_NET** — Prix unitaire NET de l'article, ou `*` (indique que l'article a été conditionné dans plusieurs colis)
- **numéro_colis** — Numéro du colis dans lequel l'article a été conditionné
- **quantité_du_document** — Quantité de l'article selon le document (réservation), ou `*` (indique que l'article a été conditionné dans plusieurs colis)

**Exemple de réponse :**

Si un article a été réparti dans différents colis, il apparaît sur des lignes séparées :
```
XXX|123456|1|12,53|OP-001|4
XXX|123456|1|*|OP-002|*
XXX|123456|2|*||OP-003|*
```

Ces 4 pièces commandées de l'article XXX 123456 ont été conditionnées dans 3 colis différents : OP-001 (1 pièce), OP-002 (1 pièce) et OP-003 (2 pièces).

Les lignes contenant le prix unitaire NET et la quantité du document (réservation) sont utiles pour le contrôle de la valeur totale de la livraison.

Toutes les lignes (contenant la quantité scannée et le numéro de colis) peuvent être utilisées pour contrôler la livraison en tenant compte du contenu des colis collectifs.

---

## ZwrocStanCeny

> **Fonction archivée** — La nouvelle fonction est : `ZwrocStanCenyDostepnoscWiecej`

### Description
Cette fonction récupère la quantité en stock et le prix d'un produit (groupe de produits).

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | string |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | string |
| lista_nr_motonet | Numéros motonet des articles | string [] |

### Réponse
**Structure de chaque ligne :**
```
quantité_stock (0-6)|prix_détail|prix_partenaire|montant_TVA|numéro_motonet_remplaçant (si existant)|préfixe_remplaçant|indice_remplaçant|nom_remplaçant
```

**Règle d'encodage du stock :** 0-5 = quantité explicite ; 6 = plus de cinq unités

**Standard :** `5|20.56|13.46|23`

**Standard avec remplaçant :** `6|35.35|20,56|23|ABS0215Q|ABS|0215Q|SPRYNKI DO SZCZK HAM. MERCEDES 123 76-85`

**Valeurs particulières :**
- `-1` article inactif → `-1|-1|-1|-1`
- `-2` article inexistant → `-2|-2|-2|-2`
- Blocage factures impayées : `Z|5|10.00|9.12|23`
- Blocage confirmation livraisons : `D|4|56.93|51.22|23`

---

## ZwrocStanCenyWiecej

### Description
Cette fonction récupère la quantité en stock et le prix d'un produit (groupe de produits).

### Paramètres de la requête

| Nom | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| lista_nr_motonet | Numéros motonet des articles | String [] |

### Réponse
**Structure de chaque ligne :**
```
quantité_stock (0-26)|prix_détail|prix_partenaire|montant_TVA|numéro_motonet_remplaçant (si existant)|préfixe_remplaçant|indice_remplaçant|nom_remplaçant
```

**Règle d'encodage du stock :** 0-25 = quantité explicite ; 26 = plus de 25 unités

**Standard :** `17|20.56|13.46|23`

**Standard avec remplaçant :** `26|35.35|20,56|23|ABS0215Q|ABS|0215Q|SPRYNKI DO SZCZK HAM. MERCEDES W123 76-85`

**Valeurs particulières :**
- `-1` article inactif → `-1|-1|-1|-1`
- `-2` article inexistant → `-2|-2|-2|-2`
- Blocage factures impayées : `Z|5|10.00|9.12|23`
- Blocage confirmation livraisons : `D|4|56.93|51.22|23`

---

## ZwrocStanCenyDostepnosc

> **Fonction archivée** — La nouvelle fonction est : `ZwrocStanCenyDostepnoscWiecej`

### Description
Cette fonction récupère la quantité en stock et le prix d'un produit (groupe de produits) pour le stock local et le stock principal.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | string |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | string |
| lista_nr_motonet | Numéro motonet de l'article | string [] |

### Réponse
**Structure de chaque ligne :**
```
stock_principal (0-6)|stock_local (0-6)|prix_détail|prix_partenaire|montant_TVA|numéro_motonet_remplaçant (si existant)|préfixe_remplaçant|indice_remplaçant|nom_remplaçant
```

**Règle d'encodage du stock :** 0-5 = quantité explicite ; 6 = plus de cinq unités

**Standard :** `5|3|20.56|13.46|23`

**Standard avec remplaçant :** `6|6|35.35|20,56|23|ABS0215Q|ABS|0215Q|SPRYNKI DO SZCZK HAM. MERCEDES W123 76-85`

**Valeurs particulières :**
- `-1` article inactif → `-1|-1|-1|-1|-1`
- `-2` article inexistant → `-2|-2|-2|-2|-2`
- Blocage factures impayées : `Z|6|4|10.00|9.12|23`
- Blocage confirmation livraisons : `D|5|5|56.93|51.22|23`

---

## ZwrocStanCenyDostepnoscWiecej

### Description
Cette fonction récupère la quantité en stock et le prix d'un produit (groupe de produits) pour le stock local et le stock principal.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | string |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | string |
| lista_nr_motonet | Numéros motonet des articles | string [] |

### Réponse
**Structure de chaque ligne :**
```
stock_principal (0-26)|stock_local (0-26)|prix_détail|prix_partenaire|montant_TVA|numéro_motonet_remplaçant (si existant)|préfixe_remplaçant|indice_remplaçant|nom_remplaçant
```

**Règle d'encodage du stock :** 0-25 = quantité explicite ; 26 = plus de 25 unités

**Standard :** `25|3|20.56|13.46|23`

**Standard avec remplaçant :** `26|26|35.35|20,56|23|ABS0215Q|ABS|0215Q|SPRYNKI DO SZCZK HAM. MERCEDES W123 76-85`

**Valeurs particulières :**
- `-1` article inactif → `-1|-1|-1|-1|-1`
- `-2` article inexistant → `-2|-2|-2|-2|-2`
- Blocage factures impayées : `Z|6|4|10.00|9.12|23`
- Blocage confirmation livraisons : `D|5|5|56.93|51.22|23`

---

# WSMotoKlientTD.asmx

Ce Web Service contient les méthodes dépendant des numéros TecDoc.

## Liste des opérations

| Nom | Description |
|---|---|
| GetPriceAndQuantity | Retourne le stock et les prix (prix Partenaire, prix de détail et montant TVA) |
| SubmitOrder | Passe une commande |
| GetPriceAndQuantityMore | Retourne le stock et le prix d'un produit (groupe de produits) |
| GetPriceAndQuantityURL | Retourne le stock et le prix d'un produit (groupe de produits) avec ELID |

---

## GetPriceAndQuantity

> **Fonction archivée** — La nouvelle fonction est : `GetPriceAndQuantityMore`

### Description
Cette fonction récupère la quantité en stock et le prix d'un produit (groupe de produits).

### Requête
Le paramètre de requête est un objet JSON converti en chaîne de caractères. Aucun élément du corps ne peut être vide.

**Exemple :**
```json
{
  "Auth": { "FIKS": "99999", "Motonet": "9999" },
  "Elems": [
    { "DLNr": "0043", "Elnumerdd": "CCH865" },
    { "DLNr": "0003", "Elnumerdd": "03.2419-8150.3" }
  ]
}
```

### Paramètres du corps de la requête

| Paramètre | Description | Type |
|---|---|---|
| FIKS | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| DLNr | Code fabricant conforme à TecDoc | String |
| Elnumerdd | Numéro d'article fabricant (conforme aux données des fournisseurs TecDoc) | double |

### Éléments du corps de la réponse

| Nom | Description | Détails | Type |
|---|---|---|---|
| Error | Message d'erreur en cas de problème | `"null"` si succès ; `"Article not found."` ; `"Inactive article"` ; `"Lock: Z"` si bloqué pour factures impayées ; `"Lock: D"` si bloqué pour livraisons non confirmées | string |
| Quantity | Quantité en stock | 0-5 = quantité explicite | Double |
| RetailPrice | Prix de détail | — | Double |
| Price | Prix pour le Client | — | Double |
| VAT | Montant TVA | En % | double |
| Discount | Remise supplémentaire | Remise obtenue si commande passée pendant des heures spéciales. Contacter votre représentant pour plus d'informations | Double |
| Replacement | Numéro(s) du remplaçant (si existant) | `"null"` si le remplaçant n'existe pas | String |
| Deposit | Valeur de la consigne | 0.0 s'il n'y a pas de consigne pour un article | Double |

---

## GetPriceAndQuantityMore

### Description
Cette fonction récupère la quantité en stock et le prix d'un produit (groupe de produits).

### Requête
Le paramètre de requête est un objet JSON converti en chaîne de caractères. Aucun élément du corps ne peut être vide.

**Exemple :**
```json
{
  "Auth": { "FIKS": "99999", "Motonet": "9999" },
  "Elems": [
    { "DLNr": "0043", "Elnumerdd": "CCH865" },
    { "DLNr": "0003", "Elnumerdd": "03.2419-8150.3" }
  ]
}
```

### Paramètres du corps de la requête

| Paramètre | Description | Type |
|---|---|---|
| FIKS | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| DLNr | Code fabricant conforme à TecDoc | String |
| Elnumerdd | Numéro d'article fabricant (conforme aux données des fournisseurs TecDoc) | double |

### Éléments du corps de la réponse

| Nom | Description | Détails | Type |
|---|---|---|---|
| Error | Message d'erreur en cas de problème | `"null"` si succès ; `"Article not found."` ; `"Inactive article"` ; `"Lock: Z"` si bloqué pour factures impayées ; `"Lock: D"` si bloqué pour livraisons non confirmées | String |
| Quantity | Quantité en stock | 0-25 = quantité explicite ; 26 = plus de 25 unités | Double |
| RetailPrice | Prix de détail | — | Double |
| Price | Prix pour le Client | — | Double |
| VAT | Montant TVA | En % | Double |
| Discount | Remise supplémentaire | Remise obtenue si commande passée pendant des heures spéciales. Contacter votre représentant commercial pour plus d'informations | Double |
| Replacement | Numéro du remplaçant (si existant) | `"null"` si le remplaçant n'existe pas | String |
| Deposit | Valeur de la consigne | 0.0 s'il n'y a pas de consigne pour un article | double |

---

## SubmitOrder

### Description
Cette fonction passe une commande pour un groupe d'articles basée sur le numéro TecDoc.

### Requête
Le paramètre de requête est un objet JSON converti en chaîne de caractères. Aucun élément du corps ne peut être vide.

**Exemple :**
```json
{
  "Auth": { "FIKS": "99999", "Motonet": "9999" },
  "OrderGUID": "3026a8d3-e162-420a-9b58-0b4b68302339",
  "Elems": [
    { "Quantity": 3, "DLNr": "0043", "Elnumerdd": "CCH865" },
    { "Quantity": 1, "DLNr": "0003", "Elnumerdd": "03.2419-8150.3" }
  ]
}
```

### Paramètres du corps de la requête

| Paramètre | Description | Type |
|---|---|---|
| FIKS | Numéro de compte du partenaire | string |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | string |
| OrderGUID | Identifiant de commande | string |
| Quantity | Quantité commandée | integer |
| DLNr | Code fabricant conforme à TecDoc | string |
| Elnumerdd | Numéro d'article fabricant (conforme aux données des fournisseurs TecDoc) | double |

### Éléments du corps de la réponse

| Nom | Description | Détails | Type |
|---|---|---|---|
| Error | Message d'erreur en cas de problème | `"null"` si succès ; `"Article not found."` ; `"Inactive article"` ; `"Lock: Z"` si bloqué pour factures impayées ; `"Lock:D"` si bloqué pour livraisons non confirmées | String |
| QuantityOrdered | Quantité commandée | — | Double |
| QuantityStep | Quantité de vente | — | — |
| RetailPrice | Prix de détail | — | Double |
| Price | Prix pour le Client | — | Double |
| VAT | Montant TVA | En % | Double |
| Replacement | Numéro du remplaçant (si existant) | `"null"` si le remplaçant n'existe pas | String |

---

# WSMotoOferta.asmx

## Liste des opérations

| Nom | Description |
|---|---|
| zwrocCennikDetalOffline | Retourne la liste des prix de détail avec le stock |
| zwrocCennikDetalOfflineSzczegolyCSV | Retourne la liste des prix de détail et d'autres détails |
| ZwrocListeArtykulowMPTD | Retourne la liste des articles Moto-Profil liés au catalogue TecDoc |
| ZwrocArtykulyProgramuMotoProfit | Retourne la liste des articles de l'offre MotoProfit |
| ZwrocArtykulyProgramuMotoProfitCsv | Retourne la liste des articles MotoProfit au format CSV |
| ZwrocPlikOfertyMotoProfit | Retourne un fichier CSV avec l'offre MotoProfit |
| ZwrocCennikDetalOfflinePelny | Retourne la liste des prix de détail avec les stocks de chaque entrepôt |
| ZwrocCennikDetalOfflineSzczegolyCSVWiecej | Retourne la liste des prix de détail avec le stock |
| zwrocCennikDetalOfflineWiecej | Retourne les prix de détail avec le stock |

---

## ZwrocArtykulyProgramuMotoProfit

### Description
Cette fonction récupère la liste des articles de l'offre MotoProfit.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |

### Réponse
La fonction retourne une liste d'objets ArtykulyOfertaMotoProfil.

```xml
<ArrayOfArtykulOfertaMotoProfit>
  <ArtykulOfertaMotoProfit>
    <Prefiks>string</Prefiks>
    <Indeks>string</Indeks>
    <BonusPH>decimal</BonusPH>
    <BonusWarsztat>decimal</BonusWarsztat>
  </ArtykulOfertaMotoProfit>
</ArrayOfArtykulOfertaMotoProfit>
```

**Exemple C# :**
```csharp
var ws = new WSMotoOferta();
ArtykulOfertaMotoProfit[] listaObjectow =
    ws.ZwrocArtykulyProgramuMotoProfit(fiks, motonet);
foreach (var artykulOferta in listaObiektow)
{
    var prefiks = artykulOferta.Prefiks;
    var indeks = artykulOferta.Indeks;
    var bonusPartnerH = artykulOferta.BonusPH;
    var bonusWarsztat = artykulOferta.BonusWarsztat;
}
```

---

## ZwrocArtykulyProgramuMotoProfitCSV

### Description
Cette fonction récupère la liste des articles de l'offre MotoProfit au format CSV.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |

### Réponse
**Structure de chaque ligne :**
```
"préfixe";"indice";bonusPartenairePH;bonusAtelier
```

- **bonusPartnerPH** — Bonus accordé au Partenaire pour la vente d'un article
- **bonusWarsztat** — Bonus accordé au client du Partenaire pour l'achat d'un article

**Exemple :** `"ABS";"0002Q";2,34;3,45`

**Exemple C# :**
```csharp
var ws = new WSMotoOfeta();
string[] listaString = ws.ZwrocArtykulyProgramuMotoProfitCsv(fiks, motonet);
foreach (var artykulOferta in listaString)
{
    var artykulOfertaDane = artykulOferta.Split(';');
    var prefiks       = artykulOfertaDane[0];
    var indeks        = artykulOfertaDane[1];
    var bonusPartnerH = artykulOfertaDane[2];
    var bonusWarsztat = artykulOfertaDane[3];
}
```

---

## ZwrocCennikDetalOffline

> **Fonction archivée** — La nouvelle fonction est : `zwrocCennikDetalOfflineWiecej`

### Remarque
La méthode ne peut être appelée qu'une seule fois par heure par un client dans un emplacement donné.

### Description
Cette fonction récupère la liste des prix de détail avec le stock.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| Wersja | Identifiant de version du logiciel (peut être n'importe quoi) | String |

### Réponse
**Structure de chaque ligne :**
```
Préfixe|indice|type|stock|prix_détail_NET|prix_détail_BRUT|montant_TVA|prix_NET_partenaire
```

**Règle d'encodage du stock :** 0-5 = quantité explicite ; 6 = plus de cinq unités

**Valeurs possibles du champ "type" :** `T` = article standard ; `K` = noyau de consigne

**Exemple :**
```
ABS|421591|T|0|384,64|473,11|23|351,23
ABS|421591_REG|K|0|140|172,2|23|117,32
```

---

## ZwrocCennikDetalOfflineSzczegolyCSV

> **Fonction archivée** — La nouvelle fonction est : `ZwrocCennikDetailOfflineSzczegolyCSVWiecej`

### Remarque
La méthode ne peut être appelée qu'une seule fois par heure par un client dans un emplacement donné.

### Description
Cette fonction récupère la liste des prix de détail avec le stock.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| Wersja | Identifiant de version du logiciel (peut être n'importe quoi) | string |

### Réponse
**Structure de chaque ligne :**
```
"Préfixe";"indice";"type";"stock";"prix_détail_NET";"prix_détail_BRUT";"montant_TVA";"prix_NET_partenaire";"devise";"non_retournable";"valeur_consigne";"quantité_minimale_commande";"numéro_fournisseur";"DLNr";"Elnumerdd"
```

**Règle d'encodage du stock :** 0-5 = quantité explicite ; 6 = plus de cinq unités

**Valeurs possibles du champ "type" :** `T` = article standard ; `K` = noyau de consigne

**Exemple :**
```
"ABS";"0002Q";" T";"0";"31,88";"39,21";"23";"16,58";"PLN";"N";"0";"1";"0002Q";"0206";"0002Q"
"ABS";"421591_REG";" K";"0";"140";"172,2";"23";"117,32";"PLN";"N";"0";"2"
```

---

## ZwrocCennikDetailOfflineSzczegolyCSVWiecej

### Remarque
La méthode ne peut être appelée qu'une seule fois par heure par un client dans un emplacement donné.

### Description
Cette fonction récupère la liste des prix de détail avec le stock.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| Wersja | Identifiant de version du logiciel (peut être n'importe quoi) | string |

### Réponse
**Structure de chaque ligne :**
```
"préfixe";"indice";"type";"stock";"prix_détail_NET";"prix_détail_BRUT";"montant_TVA";"prix_NET_partenaire";"devise";"non_retournable";"valeur_consigne";"quantité_minimale_commande";"numéro_fournisseur";"DLNr";"Elnumerdd"
```

**Règle d'encodage du stock :** 0-25 = quantité explicite ; 26 = plus de 25 unités

**Valeurs possibles du champ "type" :** `T` = article standard ; `K` = noyau de consigne

**Exemple :**
```
"ABS";"0002Q";" T";"0";"31,88";"39,21";"23";"16,58";"PLN";"N";"0";"1";"0002Q";"0206";"0002Q"
"ABS";"421591_REG";"K";"0";"140";"127,2";"23";"117,32";"PLN";"N";"0";"2"
```

---

## ZwrocCennikDetalOfflineWiecej

### Remarque
La méthode ne peut être appelée qu'une seule fois par heure par un client dans un emplacement donné.

### Description
Cette fonction récupère la liste des prix de détail avec le stock.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |
| Wersja | Identifiant de version du logiciel (peut être n'importe quoi) | String |

### Réponse
**Structure de chaque ligne :**
```
Préfixe|indice|type|stock|prix_détail_NET|prix_détail_BRUT|montant_TVA|prix_NET_partenaire
```

**Règle d'encodage du stock :** 0-25 = quantité explicite ; 26 = plus de 25 unités

**Valeurs possibles du champ "type" :** `T` = article standard ; `K` = noyau de consigne

**Exemple :**
```
ABS|421591|T|0|384,64|473,11|23|351,23
ABS|421591_REG|K|0|140|172,2|23|117,32
```

---

## ZwrocListeArtykulowMPTD

### Description
Cette fonction récupère la liste des articles Moto-Profil liés au catalogue TecDoc.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |

### Réponse
**Structure de chaque ligne :**
```
Préfixe|indice|code_fabricant|numéro_article_fabricant
```

- **Préfixe** — Préfixe de l'article dans l'offre Moto-Profil
- **Indice** — Indice de l'article dans l'offre Moto-Profil
- **Code fabricant** — Code fabricant conforme à TecDoc (DLNr)
- **Numéro d'article fabricant** — Numéro d'article fabricant (conforme aux données des fournisseurs TecDoc)

**Exemple :**
```
ATE|03.2419-8150|0003|03.2419-8150.3
RTS|017.00020|0430|017-00020
```

---

## ZwrocPlikOfertyMotoProfit

### Description
Retourne un fichier au format CSV avec l'offre MotoProfit.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |

### Réponse
Tableau d'octets contenant un fichier CSV avec en-tête.

### Remarque
Le fichier d'offre est mis à jour une fois par heure.

**Exemple C# :**
```csharp
var ws = new WSMotoOferta();
byte[] dane = ws.ZwrocPlikOfertyMotoProfit(fiks, motonet);
FileStream file = File.Create(@"e:\tmp\tmp.csv");
file.Write(dane, 0, dane.Length);
file.Close();
```

---

## ZwrocCennikDetalOfflinePelny

### Description
Cette fonction récupère la liste des prix de détail avec les stocks de chaque entrepôt.

### Remarque
La méthode ne peut être appelée qu'une seule fois par heure par un client dans un emplacement donné.

### Paramètres de la requête

| Paramètre | Description | Type |
|---|---|---|
| Fiks | Numéro de compte du partenaire | String |
| nr_kontrahenta_motonet | Numéro motonet du partenaire | String |

### Réponse
**Structure de chaque ligne :**
```
"préfixe";"indice";"type";"stock CHORZOW";"stock WARSZAWA";"stock SWIEBODZIN";"prix_détail_NET";"prix_détail_BRUT";"montant_TVA";"prix_NET_partenaire";"devise";"non_retournable";"valeur_consigne";"quantité_minimale_commande";"numéro_fournisseur";"DLNr";"Elnumerdd"
```

**Règle d'encodage du stock :** 0-5 = quantité implicite ; 6 = plus de cinq unités

**Valeurs possibles du champ "type" :** `T` = article standard ; `K` = noyau de consigne

**Exemples :**
```
"ABS";"0002Q";"T";"0";"5";"6";"31,88";"39,21";"23";"16,58";"PLN";"N";"0";"1";"0002Q";"0206";"0002Q"
"ABS";"421591_REG";"K";"0";"";"6";"140";"172,2";"23";"117,32";"PLN";"N";"0";"2";"";"";"" 
```

---

*Fin du document — Source : `Dokumentacja WS MP.pdf`, MOTO-PROFIL SP. Z O. O., version 1.7.9, 2021.*
