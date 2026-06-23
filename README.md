# Intégration Moto-Profil → Odoo

> 👉 **Nouvelle session / nouvelle machine ?** Commencez par **[`HANDOFF.md`](HANDOFF.md)** —
> il consolide tout le contexte, l'état d'avancement et les prochaines étapes.


Récupérer le catalogue de pièces auto **Moto-Profil / ProfiAuto** (fournisseur polonais —
références, prix, disponibilités) et l'**importer dans Odoo** (`mycargo.odoo.com`).

> **Règle d'or du projet — EXTRACTION UNIQUEMENT côté Moto-Profil.**
> On lit/consulte l'API Moto-Profil ; on n'écrit jamais, on ne passe jamais de commande.
> Les seules écritures autorisées visent **notre propre** instance Odoo.

---

## État du projet — 2026-06-16

| Brique | État | Détail |
|---|---|---|
| **SOAP Moto-Profil** | ✅ **Opérationnel** | Auth OK avec le compte test `FIKS 15060 / MOTONET 0BHS`. **Catalogue complet extrait : 573 109 produits.** |
| **REST Moto-Profil** | 🟡 Partiel | Token OAuth OK ; prix/stock live (`GetPriceAndQuantity`) fonctionnel. Commandes bloquées (livraisons non confirmées) — sans impact, lecture seule. |
| **Schéma Odoo** | ✅ Exporté | 800 modèles documentés dans `odoo/schema/` (navigable via `index.html`). |
| **Import Odoo** | ⬜ À construire | Mapping catalogue → `product.template` pas encore écrit. C'est la **prochaine étape**. |

**Débloqué le 16/06/2026** (e-mails IT Moto-Profil) : pas d'autorisation IP nécessaire ;
compte test fourni ; SOAP = FIKS+MOTONET, REST = login/mdp ProfiAutoID. Voir
[`docs/moto-profil/`](docs/moto-profil/) et [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## Structure du dépôt

```
odoo/
├── README.md              ← vous êtes ici
├── ARCHITECTURE.md        ← flux technique & décisions d'intégration
├── CREDENTIALS.md         ← tous les identifiants (PRIVÉ — non versionné)
├── CREDENTIALS.example.md ← modèle d'identifiants
│
├── docs/                  ← DOCUMENTATION
│   ├── README.md          ← index documentaire (quoi lire, dans quel ordre)
│   ├── moto-profil/       ← analyse maître, REST, traductions, PDF sources
│   └── odoo/              ← (doc Odoo — à venir)
│
├── motoprofil/            ← EXTRACTION depuis l'API Moto-Profil
│   ├── get_catalogue.ps1  ← extraction catalogue complet (SOAP, lecture seule)
│   ├── parse_catalogue.ps1← reconstruit le CSV depuis un XML brut déjà téléchargé
│   └── tests/             ← collection HTTPyac (78 requêtes read-only) + logs/
│
├── odoo/                  ← INTÉGRATION Odoo
│   ├── create_products.py ← création produits en masse (XML-RPC, ÉCRITURE)
│   ├── explore_model.py   ← explorateur de modèles (type Swagger), lecture
│   ├── export_schema.py   ← export du schéma complet → schema/
│   ├── samples/           ← jeux de données d'exemple (products.json)
│   └── schema/            ← schéma Odoo généré (800 modèles + index HTML)
│
├── data/                  ← DONNÉES EXTRAITES (volumineux, non versionné)
│   └── catalogue/<horodatage>/  ← catalogue_pelny.csv, .raw.xml, tecdoc, meta…
│
└── archive/              ← historique récupérable (exploration, e-mails, anciens tests)
```

---

## Démarrage rapide

### 1. Extraire le catalogue Moto-Profil (SOAP)
```powershell
cd motoprofil
.\get_catalogue.ps1 -Fiks "15060" -Motonet "0BHS"
# → data/catalogue/<horodatage>/catalogue_pelny.csv  (~573k lignes)
```
⚠️ `ZwrocCennikDetalOfflinePelny` est **limité à 1 appel/heure** (garde-fou intégré).
Pour re-parser un XML déjà téléchargé sans rappeler l'API :
```powershell
.\parse_catalogue.ps1 -RawXml "..\data\catalogue\<ts>\catalogue_pelny.raw.xml" -Out "..\data\catalogue\<ts>\catalogue_pelny.csv"
```

### 2. Explorer le schéma Odoo
```powershell
cd odoo
python explore_model.py product.template --search price   # champs d'un modèle
# ou ouvrir odoo/schema/index.html dans un navigateur
```

### 3. (À venir) Importer le catalogue dans Odoo
Le script `odoo/create_products.py` sait créer des produits depuis un JSON ; le mapping
catalogue Moto-Profil → champs Odoo reste à définir (voir [`ARCHITECTURE.md`](ARCHITECTURE.md)).

---

## Identifiants

Tous les identifiants (Odoo + Moto-Profil REST/SOAP) sont centralisés dans **`CREDENTIALS.md`**
(fichier privé, à ne pas partager). Un modèle vide est fourni dans `CREDENTIALS.example.md`.

> ⚠️ Les scripts Python Odoo contiennent encore la clé API Odoo en dur — TODO : externaliser
> via variable d'environnement. Voir `CREDENTIALS.md`.
