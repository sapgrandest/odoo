#!/usr/bin/env python3
"""
Création de produits Odoo en masse via XML-RPC.
Usage: python create_products.py
"""

import xmlrpc.client
import json
import sys
import ssl
import os

sys.stdout.reconfigure(encoding="utf-8")

# Contourne la vérification SSL (certificat Odoo non reconnu par Windows)
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

# ── Configuration ────────────────────────────────────────────────────────────
URL      = "https://mycargo.odoo.com"
DB       = "mycargo"          # généralement le sous-domaine
USERNAME = os.environ.get("ODOO_USERNAME", "han.necati@gmail.com")
PASSWORD = os.environ.get("ODOO_API_KEY", "")  # clé API — voir CREDENTIALS.md (jamais en dur)
JSON_FILE = "products.json"

if not PASSWORD:
    sys.exit("ODOO_API_KEY manquant. Exportez-le : $env:ODOO_API_KEY='...'  (voir CREDENTIALS.md)")
# ─────────────────────────────────────────────────────────────────────────────


def connect(url: str, db: str, username: str, password: str):
    """Authentifie et retourne (uid, models_proxy)."""
    common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common", context=ssl_ctx)
    try:
        uid = common.authenticate(db, username, password, {})
    except Exception as e:
        sys.exit(f"Erreur de connexion : {e}")

    if not uid:
        sys.exit(
            "Authentification échouée. Vérifiez DB / USERNAME / PASSWORD.\n"
            "Astuce : utilisez une clé API (Paramètres › Technique › Clés API)."
        )

    models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object", context=ssl_ctx)
    print(f"Connecté à {url} (db={db}, uid={uid})")
    return uid, models


def resolve_category(models, uid, db, password, categ_name: str) -> int | None:
    """Retourne l'ID de la catégorie produit ou None si non trouvée."""
    if not categ_name:
        return None
    ids = models.execute_kw(
        db, uid, password,
        "product.category", "search",
        [[["name", "=", categ_name]]],
    )
    return ids[0] if ids else None


def load_products(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def create_products(models, uid, db, password, products: list[dict]):
    """Crée les produits et retourne la liste des IDs créés."""
    created = []
    errors  = []

    for i, p in enumerate(products, 1):
        vals = {k: v for k, v in p.items() if k != "categ_id"}

        # Résoudre la catégorie par nom → ID
        categ_name = p.get("categ_id")
        if categ_name:
            categ_id = resolve_category(models, uid, db, password, categ_name)
            if categ_id:
                vals["categ_id"] = categ_id
            else:
                print(f"  [!] Catégorie '{categ_name}' introuvable, ignorée.")

        try:
            new_id = models.execute_kw(db, uid, password, "product.template", "create", [vals])
            print(f"  [{i}/{len(products)}] Créé : {p['name']} (id={new_id})")
            created.append(new_id)
        except Exception as e:
            print(f"  [{i}/{len(products)}] ERREUR pour '{p.get('name')}' : {e}")
            errors.append({"product": p.get("name"), "error": str(e)})

    return created, errors


def main():
    uid, models = connect(URL, DB, USERNAME, PASSWORD)

    products = load_products(JSON_FILE)
    print(f"\n{len(products)} produit(s) à créer depuis '{JSON_FILE}'...\n")

    created, errors = create_products(models, uid, DB, PASSWORD, products)

    print(f"\n-- Resultat ------------------------------------------")
    print(f"  Créés  : {len(created)}")
    print(f"  Erreurs: {len(errors)}")
    if errors:
        print("\nDétail des erreurs :")
        for e in errors:
            print(f"  - {e['product']}: {e['error']}")


if __name__ == "__main__":
    main()
