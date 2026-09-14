# SAPGE — moteur de données Moto-Profil

## But
CSV catalogue Moto-Profil (SFTP horaire) → SQLite fiable → (plus tard : recherche, Odoo).
**Une phase à la fois. Léger, clair, schémas > texte.**

## État (2026-09-15)
```
① DATA    ✅ LIVRÉ & LIVE EN PROD — ingest autonome + monitoring complet
② VIEWER  ⬜ à faire — consulter/rechercher le catalogue (remplacera l'ancien catalog-pro)
③ ODOO    ⬜ à faire — mapping + sync : delta · marges/prix conseillé · images CDN · recherche véhicule
```

## Flux (live)
```
Moto-Profil ─SFTP/h─► VPS /csv/catalogue.csv ─► moteur (Coolify, auto-planifiant) ─► catalog.db
                                                 horaire · skip 1s si CSV inchangé      1 208 473 articles
```

## Le code (`moteur/`)
```
src/ingest.js   CSV → catalog.db. STRICT : contrat en-tête · quote:false · pré-vol schéma
                · coercition comptée · swap atomique + articles_prev · alertes Discord riches
src/report.js   analyse catalog.db (lentille REVENDEUR : marge, mouvements de coût) → 6 salons
                + ops.db (historique des runs → deltas)
src/server.js   long-running : ordonnanceur (spawn ingest horaire, enfant frais, single-flight)
                + /health /status + heartbeat healthchecks (5 min) + alertes conteneur
test/           33 tests node:test (parse, sûreté, format réel) — `npm test`
Dockerfile · docker-compose.yml   déploiement Coolify
```

## Déploiement (Coolify, depuis git)
```
App "moteur" (uuid t920…) · build compose depuis /moteur · repo nedjo90/sapge, branch main
Volumes : /data/sapge/moto-profil/sftp/data/motoprofil → /csv (ro) · moteur-data → /data (rw)
Env : MODE=prod · CSV_PATH=/csv/catalogue.csv · DB_PATH=/data/catalog.db · OPS_PATH=/data/ops.db
      · DISCORD_* · HEALTHCHECK_URL · INTERVAL_MIN(60) · STALE_HOURS(3)
Redéployer / uuids / token → CREDENTIALS.md § Coolify
```

## Monitoring Discord (serveur SAPGE — tout testé)
```
#coolify        infra Coolify (déploiements · conteneur · serveur · disque)   [natif Coolify]
#runs           🟢 démarré · ⚙️ ingest · 🔄 skip · 🔴 crash
#alertes  🔴    échec ingest · source figée · anomalie · DEAD-MAN (healthchecks externe)
#structures     colonnes ± · valeurs non conformes
#marges #offres #couts-achat #opportunites   lentille revendeur (verdicts en clair)
#sync #odoo-erreurs   → phase ③
```

## Faits clés / pièges (À SAVOIR avant de toucher)
```
• CSV : ;-séparé, AUCUN quoting CSV → quote:false. Le " est LITTÉRAL (pouces, ex 1/2").
        71 champs/ligne (le 71e vide, trailing ;). Décimale virgule. UTF-8 BOM.
• Lire par NOM de colonne, JAMAIS par position (= le bug historique qui a corrompu la DB).
• motonet PAS unique dans le flux → dédoublonner (fait pour les mouvements ;
  À PRÉVOIR pour le default_code Odoo en phase ③).
• Fraîcheur : skip si checksum CSV identique au dernier run (pas de rebuild inutile).
• Prix conseillé (Nett retail price) > coût sur ~99 % → marge intégrée ~88 % médiane.
• Perf : 1,2M lignes / ~54 s / ~160 Mo RAM (streaming → mémoire constante).
```

## Règles
```
⛔ Lecture seule Moto-Profil / ProfiAuto. JAMAIS d'écriture (ni SOAP ni REST).
⛔ Images Odoo (phase ③) = URL CDN hotlink cdn.profiauto.com/Image/{guid}, JAMAIS base64.
✅ Seule écriture autorisée : notre Odoo (sap-grand-est.odoo.com).
```

## Accès → CREDENTIALS.md (privé, gitignored)
```
VPS ssh -i ~/.ssh/sapge_vps root@87.106.13.182 · Coolify · Odoo · ProfiAuto · SFTP
Discord (9 webhooks) · dead-man healthchecks
CSV source : /data/sapge/moto-profil/sftp/data/motoprofil/catalogue.csv (~422 Mo, 1,2M lignes)
```

## Bosser en local
```
source .env.sh                 # webhooks Discord (gitignored)
node src/ingest.js <csv>       # ingest (MODE=test → messages 🧪)
npm test                       # 33 tests
# échantillon : head -2001 du vrai CSV ; vrai CSV complet : scp depuis le VPS
```
