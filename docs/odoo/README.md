# Documentation Odoo

À rédiger lors de la construction de l'import catalogue → Odoo :

- Mapping catalogue Moto-Profil → `product.template` (voir tableau dans `../../ARCHITECTURE.md` §4)
- Stratégie d'upsert (clé `default_code`, gestion des ~573k lignes via XML-RPC)
- Catégorisation produits (mapping TecDoc ?)
- Rafraîchissement prix/stock (catalogue batch SOAP vs `GetPriceAndQuantity` REST live)

Référence du schéma Odoo (généré) : `../../odoo/schema/index.html` (800 modèles).
