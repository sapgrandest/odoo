#!/usr/bin/env python3
"""
Export complet du schéma Odoo dans un dossier.
Génère un fichier JSON par modèle + un index HTML navigable.
Usage: python export_schema.py
"""

import xmlrpc.client
import ssl
import sys
import json
import os
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

URL      = "https://mycargo.odoo.com"
DB       = "mycargo"
USERNAME = os.environ.get("ODOO_USERNAME", "han.necati@gmail.com")
PASSWORD = os.environ.get("ODOO_API_KEY", "")  # voir CREDENTIALS.md (jamais en dur)
OUT_DIR  = "odoo_schema"

if not PASSWORD:
    sys.exit("ODOO_API_KEY manquant. Exportez-le : $env:ODOO_API_KEY='...'  (voir CREDENTIALS.md)")

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE


def connect():
    common = xmlrpc.client.ServerProxy(f"{URL}/xmlrpc/2/common", context=ssl_ctx)
    uid = common.authenticate(DB, USERNAME, PASSWORD, {})
    models = xmlrpc.client.ServerProxy(f"{URL}/xmlrpc/2/object", context=ssl_ctx)
    print(f"Connecté (uid={uid})")
    return uid, models


def get_all_models(uid, models):
    return models.execute_kw(DB, uid, PASSWORD,
        "ir.model", "search_read",
        [[]], {"fields": ["model", "name", "info"], "order": "model"}
    )


def get_fields(uid, models, model_name):
    try:
        return models.execute_kw(DB, uid, PASSWORD,
            model_name, "fields_get", [],
            {"attributes": ["string", "type", "required", "readonly", "help", "selection", "relation"]}
        )
    except Exception:
        return {}


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def write_index_html(out_dir, all_models):
    rows = ""
    for m in all_models:
        safe = m["model"].replace(".", "_")
        rows += f'<tr><td><a href="models/{safe}.json">{m["model"]}</a></td><td>{m["name"]}</td></tr>\n'

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Odoo Schema — {DB}</title>
  <style>
    body {{ font-family: monospace; padding: 2rem; background: #0f0f0f; color: #e0e0e0; }}
    h1 {{ color: #7c8cf8; }}
    input {{ width: 400px; padding: .4rem .8rem; margin-bottom: 1rem;
             background: #1e1e1e; border: 1px solid #444; color: #e0e0e0; border-radius: 4px; }}
    table {{ border-collapse: collapse; width: 100%; }}
    th {{ text-align: left; border-bottom: 2px solid #444; padding: .4rem .8rem; color: #7c8cf8; }}
    td {{ padding: .3rem .8rem; border-bottom: 1px solid #222; }}
    tr:hover td {{ background: #1e1e1e; }}
    a {{ color: #7c8cf8; text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
    .count {{ color: #888; font-size: .9rem; }}
  </style>
</head>
<body>
  <h1>Odoo Schema — {DB}</h1>
  <p class="count">{len(all_models)} modèles</p>
  <input type="text" id="search" placeholder="Filtrer..." oninput="filter()">
  <table id="tbl">
    <thead><tr><th>Modèle technique</th><th>Nom affiché</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>
  <script>
    function filter() {{
      const q = document.getElementById('search').value.toLowerCase();
      document.querySelectorAll('#tbl tbody tr').forEach(r => {{
        r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
      }});
    }}
  </script>
</body>
</html>"""

    with open(out_dir / "index.html", "w", encoding="utf-8") as f:
        f.write(html)


def main():
    uid, models_proxy = connect()

    out_dir = Path(OUT_DIR)
    models_dir = out_dir / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    print("Récupération de la liste des modèles...")
    all_models = get_all_models(uid, models_proxy)
    print(f"{len(all_models)} modèles trouvés.\n")

    write_json(out_dir / "index.json", [
        {"model": m["model"], "name": m["name"]} for m in all_models
    ])

    errors = []
    for i, m in enumerate(all_models, 1):
        model_name = m["model"]
        safe_name  = model_name.replace(".", "_")
        print(f"  [{i}/{len(all_models)}] {model_name}", end="\r")

        fields = get_fields(uid, models_proxy, model_name)

        payload = {
            "model":       model_name,
            "name":        m["name"],
            "field_count": len(fields),
            "fields":      fields,
        }
        write_json(models_dir / f"{safe_name}.json", payload)

    print(f"\n\nTerminé. {len(all_models) - len(errors)} modèles exportés, {len(errors)} erreurs.")

    write_index_html(out_dir, all_models)
    print(f"Index HTML : {out_dir / 'index.html'}")


if __name__ == "__main__":
    main()
