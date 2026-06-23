# Documentation

## Moto-Profil — `moto-profil/`

| Document | Rôle | Langue | État |
|---|---|---|---|
| **[ANALYSE_COMPLETE_API.md](moto-profil/ANALYSE_COMPLETE_API.md)** | **Référence maître** : toutes les méthodes des 3 services SOAP + auth REST + codes d'erreur + méthodes recommandées vs archivées + notes d'implémentation (1400+ lignes) | 🇫🇷 FR | ✅ À jour |
| [REST_API.md](moto-profil/REST_API.md) | APIs REST découvertes (endpoints, scopes, JWT, DropShipping) | 🇫🇷 FR | ✅ |
| [TRADUCTION_AUTH.md](moto-profil/TRADUCTION_AUTH.md) | Traduction de la doc d'authentification OAuth | 🇫🇷 FR | ✅ |
| [TRADUCTION_WS.md](moto-profil/TRADUCTION_WS.md) | Traduction de l'ancienne doc Web Service (Polonais → FR) | 🇫🇷 FR | ✅ |

### Sources officielles — `moto-profil/source/`
| Fichier | Description |
|---|---|
| `WSMP_2026.pdf` | **Doc Web Service à jour (2026, 52 p.)** — fournie par l'IT le 16/06/2026 |
| `WSMP_2026_extracted.txt` | Texte extrait du PDF ci-dessus (pour recherche/diff) |
| `Auth_API_ProfiAuto_ENG.pdf` | Doc d'authentification OAuth (officielle) |
| `Dokumentacja_WS_MP_v1.7.9.pdf` | Ancienne doc WS (Polonais, v1.7.9) — **remplacée par WSMP 2026** |

### Note sur les traductions
- **WSMP 2026 est déjà en anglais** → pas de traduction nécessaire. Son contenu est intégré
  dans la référence maître `ANALYSE_COMPLETE_API.md` (qui couvre déjà toutes ses méthodes,
  dont `ZwrocCennikDetailOfflineSzczegolyCSVWiecej` recommandée par l'IT).
- La doc d'auth anglaise et sa traduction FR ont un **contenu identique** (vérifié) ; la
  traduction reste utile comme référence rapide en français.
- L'ancienne doc WS (Polonais) a été traduite dans `TRADUCTION_WS.md` ; conservée pour
  historique, mais **WSMP 2026 fait foi**.

**Par où commencer ?** → `ANALYSE_COMPLETE_API.md` (tout y est), puis le PDF `WSMP_2026.pdf`
pour les détails officiels à jour.

---

## Odoo — `odoo/`
Documentation à venir (mapping catalogue → `product.template`, stratégie d'import).
En attendant, le schéma complet est navigable : ouvrir `../odoo/schema/index.html`.
