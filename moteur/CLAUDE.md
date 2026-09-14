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
src/ingest.js   CSV → catalog.db. STRICT (contrat en-tête · quote:false · pré-vol schéma · coercition)
                → articles (70 col brut, indexé) + produits (DÉDOUBLONNÉE par motonet, indexée)
                swap atomique · VACUUM · alertes riches THROTTLÉES (1×/6h)
src/report.js   analyse `produits` (lentille REVENDEUR : marge, mouvements vs produits_prev) → 6 salons
                + ops.db : runs (kind = ingest/skip/fail) + meta (throttle) + helpers getMeta/setMeta
src/server.js   long-running : ordonnanceur (spawn ingest, enfant frais, single-flight) + WATCHDOG (tue un run figé)
                + /health /status + heartbeat healthchecks CONDITIONNÉ à l'activité + backup ops.db + SIGTERM propre
test/           33 tests node:test (parse, sûreté, format réel) — `npm test`
Dockerfile · docker-compose.yml   déploiement Coolify

Schéma catalog.db : articles (70 col, miroir CSV) · produits (dédup ~26 col = base viewer + default_code Odoo) · produits_prev (mouvements)
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
• motonet PAS unique dans le flux (34 398 doublons) → RÉGLÉ : table `produits` dédoublonnée (1 ligne/motonet)
  = base requêtable (recherche 1 ms) ET futur default_code Odoo. NE PAS calculer de stats sur `articles` (gonflé).
• Langue : parts_name = ANGLAIS, catégories/attributs = POLONAIS → recherche FR = 0 résultat.
  Pour le viewer (phase ②) : traduire les ~76 libellés de catégories (temot_fam/cat) UNE fois, pas les 1,2M lignes.
• Fraîcheur : skip si checksum CSV identique au dernier run (pas de rebuild inutile).
• Prix conseillé (Nett retail price) > coût sur ~99 % → marge intégrée ~88 % médiane.
• Perf : 1,2M lignes / ~62 s (avec produits+VACUUM) / ~220 Mo RAM. DB 796 Mo, 0 bloat.
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

## 🅿️ Parking — sécu & dette (audit du 2026-09-15, à traiter)
```
SÉCU (manuel)  roter mdp ProfiAuto (fuité dans le bundle catalog-pro + historique git) · durcir SSH
               (password-auth root ON, pas de fail2ban, ~57k tentatives/7j) · restreindre Coolify :8000
               · admin SFTPGo `admin/Admin2026!` + compte `mikail` non documenté · purge historique git
INFRA          supprimer l'app catalog-pro Coolify (fuite ci-dessus + accès ÉCRITURE sur le dossier source CSV)
               · backup DR d'ops.db hors du volume · confirmer SFTPGo upload_mode atomique
```

## Plus tard (phases suivantes)
```
② VIEWER  sur `produits` (déjà indexée) + FTS5 + traduction des catégories
③ ODOO    sync delta (default_code = produits.motonet) · marges/prix conseillé · images CDN
```
