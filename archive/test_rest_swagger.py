import os, requests, urllib3, json
urllib3.disable_warnings()

r = requests.post(
    "https://id.profiauto.pl/connect/token",
    data={"grant_type": "password", "scope": "motoprofil-api",
          "username": os.environ.get("MP_REST_USER", "SAP GRAND EST"),
          "password": os.environ.get("MP_REST_PASSWORD", "")},  # voir CREDENTIALS.md
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    verify=False
)
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

r = requests.get("https://api.profiauto.net/swagger/docs/docs/clientstockprice.json", headers=h, verify=False)
spec = r.json()
print("=== Schemas ===")
print(json.dumps(spec.get("components", {}).get("schemas", {}), indent=2))
