# APIs REST ProfiAuto — Découvertes complètes

> Session de reverse-engineering : 2026-06-01
> Méthode : décodage JWT + exploration Swagger

---

## Credentials

| Compte | Login | Usage |
|--------|-------|-------|
| Principal | `SAP GRAND EST` | Compte partenaire avec tous les rôles eSerwis |
| Odoo dédié | `odooclient` | Compte restreint créé pour l'intégration Odoo |

**FIKS (KontrId) = `100200345`** — extrait du claim JWT `KontrId`

---

## JWT Claims (décodés)

```json
{
  "KontrId": "100200345",
  "Domain": "katalog.profiauto.pl",
  "UserType": "PartnerMp",
  "MainAccount": "True",
  "aud": [
    "profibiznes.KlientStanCena.api",
    "profibiznes.klientzamowienie.api",
    "profibiznes.klientdokumenty.api",
    "deliveryconfirm",
    "deliveryconfirm-api",
    "returns",
    "returns-api"
  ]
}
```

---

## APIs REST disponibles (api.profiauto.net)

Swagger UI : `https://api.profiauto.net/swagger/index.html`
Specs JSON  : `https://api.profiauto.net/swagger/docs/docs.json`

### 1. ClientStockPrice — Prix et stock
**Scope** : `motoprofil-api`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/External/PriceAndQuantity/GetPriceAndQuantity` | Prix + stock pour liste de NrMotonet. Retourne : NrMotonet, DataSupplierNumber, ArticleNumber, RetailPrice, Price, VatRate, Deposit, Replacement, Availability[{Loc, Stock}] |

### 2. ClientDocuments — Documents
**Scope** : `motoprofil-api`

| Méthode | Endpoint | Input | Description |
|---------|----------|-------|-------------|
| POST | `/api/External/Documents/ListDocumentsByDate` | `{DateFrom, DateTo, DocType?}` | Liste des documents (factures, avoirs) par plage de dates |
| POST | `/api/External/Documents/GetDocumentDetails` | `{DocumentNumber}` | Détail lignes d'un document avec noms articles |

### 3. ClientOrder — Commandes
**Scope** : `motoprofil-api`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/External/Orders/SubmitOrder` | Passer une commande |
| POST | `/api/External/Orders/ConfirmOrder` | Confirmer réception |
| GET  | `/api/External/Orders/OrderShippingStatusDS/{guid}` | Statut livraison |

### 4. eSerwis — Confirmations livraison + retours
**Scope delivery** : `openid deliveryconfirm`
**Scope returns** : `motoprofil-api`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/DeliveryConfirmExternal/ConfirmDocument` | Confirmer une livraison (résout blocage D) |
| POST | `/api/DeliveryConfirmExternal/SaveDeliveryConfirmDraftVersion` | Préparer confirmation livraison |
| POST | `/api/ApiReturns/ItemToBeReturned` | Déclarer article à retourner |
| POST | `/api/ApiReturns/DeleteItemToBeReturned` | Supprimer déclaration retour |
| POST | `/api/ApiReturns/CreateReturnProtocol` | Créer protocole de retour |
| POST | `/api/ApiReturns/ReturnItemStatus` | Statut d'un retour |

### 5. DropShipping — Service livraison directe B2C
**Scope** : inconnu (401 avec motoprofil-api)
**Note** : service drop-shipping Europe (pays: DE, FR, etc.) — PAS le catalogue pièces auto

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET  | `/api/DropShipping/GetStock` | Stock DropShipping (productId, ean, country=DE) |
| POST | `/api/DropShipping/CreateOrder` | Créer commande DS |
| POST | `/api/DropShipping/CancelOrder` | Annuler commande DS |
| GET  | `/api/DropShipping/OrderStatus/{orderId}` | Statut commande DS |
| GET  | `/api/DropShipping/TrackInfo/{orderId}` | Tracking colis DS |

---

## Catalogue — Conclusion

**Pas de catalogue via REST.** Le catalogue complet est disponible uniquement via :

1. **SOAP `ZwrocCennikDetalOfflinePelny`** (195.242.186.3) — IP bloquée, whitelist requise
2. **`katalog.profiauto.pl`** — portail web, retourne 403 avec Bearer token, nécessite probablement un scope ou des credentials portail spécifiques

---

## Résoudre le blocage D (MissingDeliveryConfirmation)

Utiliser l'endpoint `ConfirmDocument` avec le scope `openid deliveryconfirm` :

```bash
# 1. Obtenir un token avec le bon scope
curl -X POST "https://id.profiauto.pl/connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&scope=openid deliveryconfirm&username=odooclient&password=..."

# 2. Confirmer le document (une fois le n° de document connu)
# POST /api/DeliveryConfirmExternal/ConfirmDocument
# Body: {"documentNumber": "LZ/xxx/xxx"}
```

⚠️ Il faut d'abord connaître les numéros de documents en attente — les obtenir via le portail `online.profiauto.com` ou via SOAP `ZwrocNumeryLZ`.
