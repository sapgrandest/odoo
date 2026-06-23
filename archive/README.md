# Archive

Fichiers **historiques ou exploratoires**, conservés pour traçabilité mais **hors du flux de
travail actif**. Rien ici n'est nécessaire au fonctionnement courant ; rien n'a été supprimé
de précieux (le projet n'étant pas sous git, on déplace plutôt que d'effacer).

| Fichier | Quoi | Pourquoi archivé |
|---|---|---|
| `email_motoprofil_request.md` | Brouillon de l'e-mail envoyé à l'IT Moto-Profil pour demander les accès | L'IT a répondu (10/06/2026) ; demande résolue |
| `test_rest_swagger.py` | Script jetable : récupère un token REST + dump les schémas Swagger | Exploration ponctuelle ; remplacé par la doc REST |
| `sapge_domains.txt` | Liste de noms de domaine `sapge.*` (brainstorm SAP Grand Est) | Sans rapport avec l'intégration API |
| `eserwis_pb_offer.png` | Capture du portail eSerwis (page « PB Offer » = export catalogue alternatif par e-mail/FTP) | Référence visuelle ; voie alternative non retenue (SOAP fonctionne) |
| `test_results_2026-06-01/` | Snapshots de tests du 01/06/2026 (REST OK, SOAP en timeout) | **Périmés** : décrivaient des blocages depuis résolus (whitelist IP, placeholders 99999) |

> Pour reprendre la voie « PB Offer » (export catalogue via le portail eSerwis), voir
> `eserwis_pb_offer.png` : menu eSerwis → PB Offer → nouveau profil → export e-mail/FTP horaire.
