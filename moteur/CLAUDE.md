# SAPGE — moteur données Moto-Profil

## But global
CSV catalogue Moto-Profil (SFTP horaire) → SQLite propre → (plus tard : recherche, Odoo).
**Une phase à la fois. Rien d'anticipé.**

## Phase EN COURS : INGEST — la coder, la tester, la visualiser, la monitorer
Rien d'autre (pas d'Odoo, pas de marges, pas de recherche).

### L'ingest
```
cron (Coolify) → ingest → catalog.db
  1. CSV plus récent que la DB ?              non → stop
  2. contrat d'en-tête (colonnes requises ?)  manque → STOP + alerte
  3. parse quote-safe, lecture par NOM (jamais par position ← bug historique)
  4. charge → articles_new
  5. swap atomique (1 transaction SQLite)
  6. log du run + ping succès/échec
```

### Tester · Visualiser · Monitorer
```
Tester     : lancer l'ingest sur le vrai CSV, vérifier le résultat
Visualiser : petite page d'état (dernier run · nb lignes · fraîcheur · erreurs)
Monitorer  : alerte si ÉCHEC et si SILENCE (dead-man externe, hors VPS)
```

## Règles
- Lecture seule Moto-Profil. Jamais d'écriture.
- Lire par NOM de colonne, jamais par position.
- Léger, clair, précis. Une phase à la fois.

## Accès → CREDENTIALS.md
```
VPS : ssh -i ~/.ssh/sapge_vps root@87.106.13.182
CSV : /data/sapge/moto-profil/sftp/data/motoprofil/catalogue.csv
      (frais, ~horaire, ~422 Mo, ~1,1M lignes, séparateur ; , décimale virgule, UTF-8 BOM)
```

## Plus tard (NE PAS s'en occuper maintenant)
② recherche / consultation   ③ sync Odoo (delta + prix conseillé / marges)
