#!/usr/bin/env python3
"""
Explorateur de modèles Odoo - equivalent Swagger.
Usage:
  python explore_model.py product.template
  python explore_model.py product.template --search price
  python explore_model.py --list
"""

import xmlrpc.client
import ssl
import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

URL      = "https://mycargo.odoo.com"
DB       = "mycargo"
USERNAME = os.environ.get("ODOO_USERNAME", "han.necati@gmail.com")
PASSWORD = os.environ.get("ODOO_API_KEY", "")  # voir CREDENTIALS.md (jamais en dur)

if not PASSWORD:
    sys.exit("ODOO_API_KEY manquant. Exportez-le : $env:ODOO_API_KEY='...'  (voir CREDENTIALS.md)")

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

def connect():
    common = xmlrpc.client.ServerProxy(f"{URL}/xmlrpc/2/common", context=ssl_ctx)
    uid = common.authenticate(DB, USERNAME, PASSWORD, {})
    models = xmlrpc.client.ServerProxy(f"{URL}/xmlrpc/2/object", context=ssl_ctx)
    return uid, models

def list_models(uid, models):
    """Liste tous les modèles disponibles."""
    result = models.execute_kw(DB, uid, PASSWORD,
        "ir.model", "search_read",
        [[]], {"fields": ["model", "name"], "order": "model"}
    )
    print(f"\n{'Modèle technique':<50} {'Nom affiché'}")
    print("-" * 80)
    for r in result:
        print(f"{r['model']:<50} {r['name']}")
    print(f"\n{len(result)} modèles au total.")

def describe_model(uid, models, model_name, search=None):
    """Décrit tous les champs d'un modèle."""
    try:
        fields = models.execute_kw(DB, uid, PASSWORD,
            model_name, "fields_get", [],
            {"attributes": ["string", "type", "required", "readonly", "help", "selection"]}
        )
    except Exception as e:
        print(f"Erreur : {e}")
        sys.exit(1)

    if search:
        fields = {k: v for k, v in fields.items()
                  if search.lower() in k.lower() or search.lower() in v.get("string", "").lower()}

    type_order = ["char", "text", "integer", "float", "monetary", "boolean",
                  "date", "datetime", "selection", "many2one", "one2many", "many2many", "binary"]

    def sort_key(item):
        fname, finfo = item
        req = 0 if finfo.get("required") else 1
        try:
            tidx = type_order.index(finfo["type"])
        except ValueError:
            tidx = 99
        return (req, tidx, fname)

    sorted_fields = sorted(fields.items(), key=sort_key)

    print(f"\nModèle : {model_name}")
    if search:
        print(f"Filtre : '{search}'")
    print(f"{len(sorted_fields)} champ(s)\n")
    print(f"{'Champ technique':<35} {'Type':<15} {'Libellé':<30} {'Req':<5} {'RO'}")
    print("-" * 95)

    for fname, finfo in sorted_fields:
        req = "oui" if finfo.get("required") else ""
        ro  = "oui" if finfo.get("readonly") else ""
        label = finfo.get("string", "")
        ftype = finfo.get("type", "")

        # Afficher les valeurs pour les champs selection
        if ftype == "selection" and finfo.get("selection"):
            sel_vals = ", ".join(f"{k}={v}" for k, v in finfo["selection"])
            print(f"  {fname:<33} {ftype:<15} {label:<30} {req:<5} {ro}")
            print(f"    {'':33} Valeurs: {sel_vals}")
        else:
            print(f"  {fname:<33} {ftype:<15} {label:<30} {req:<5} {ro}")

def main():
    args = sys.argv[1:]

    uid, models = connect()

    if not args or "--list" in args:
        list_models(uid, models)
        return

    model_name = args[0]
    search = None
    if "--search" in args:
        idx = args.index("--search")
        search = args[idx + 1] if idx + 1 < len(args) else None

    describe_model(uid, models, model_name, search)

if __name__ == "__main__":
    main()
