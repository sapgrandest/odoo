# Authentification API MotoProfil — Traduction FR
> Traduction technique fidèle du document original : `Auth_API_ProfiAuto_ENG.pdf`

---

L'API MotoProfil requiert une authentification par jeton OAuth Bearer, qui peut être généré en utilisant le même identifiant et mot de passe que ceux utilisés pour se connecter à https://online.profiauto.com, https://eserwis1.moto-profil.pl ou https://id.profiauto.pl. Certaines méthodes peuvent nécessiter des permissions supérieures au compte de base et demanderont une configuration supplémentaire côté MotoProfil pour fonctionner correctement.

---

## Génération du jeton Bearer

Pour générer le jeton Bearer nécessaire à l'authentification, il faut envoyer une requête POST à l'adresse : https://id.profiauto.pl/connect/token

### En-tête (Header)

| Clé | Valeur |
|---|---|
| Content-Type | application/x-www-form-urlencoded |

### Corps (Body)

| Clé | Valeur | Commentaire |
|---|---|---|
| grant_type | password | Méthode d'authentification |
| scope | motoprofil-api | Périmètre d'accès ; pour toutes les API utiliser : moto-profil-api |
| username | login | Identifiant utilisé sur https://id.profiauto.pl |
| password | pas123!@# | Mot de passe utilisé sur https://id.profiauto.pl |

### Exemple de requête

```http
POST /connect/token HTTP/1.1
Host: id.profiauto.pl
Content-Type: application/x-www-form-urlencoded
Content-Length: 78

grant_type=password&scope=motoprofil-api&username=login&password=pas123!%40%23
```

---

## Réponse en cas d'authentification réussie

Une authentification réussie retourne une réponse contenant le jeton Bearer :

```json
{
  "token_type": "Bearer",
  "access_token": "yKjsfCUcwvLm5uevLHk56pS7xmwMhtCspmBXFV7uUbyTjGpsSY5VGYxLeSacFAHRQcUj...",
  "expires_in": 604800
}
```

Le contenu du champ **access_token** est le jeton Bearer utilisé pour authentifier les communications ultérieures avec les autres API (avec le préfixe `"Bearer "`).

| Clé | Valeur | Commentaire |
|---|---|---|
| Authorization | Bearer yKjsfCUcwvLm5uevLHk56p… | Bearer {access_token} |

---

## Exemple de requête avec authentification

Exemple de requête pour le prix et la quantité d'un article avec authentification. Requête POST sur l'adresse :

```
https://api.profiauto.net/api/External/PriceAndQuantity/GetPriceAndQuantity
```

### En-tête (Header)

| Clé | Valeur |
|---|---|
| Content-Type | application/json |
| Authorization | Bearer yKjsfCUcwvLm5uevLHk56p… |

### Corps (Body)

```json
{
  "items": [
    "FTROP570"
  ]
}
```

### Exemple de requête complet

```http
POST /api/External/PriceAndQuantity/GetPriceAndQuantity HTTP/1.1
Host: api.profiauto.net
Authorization: Bearer yKjsfCUcwvLm5uevLHk56pS7xmwMhtCspmBXFV7uUbyTjGpsSY5VGYxLeSacFAHRQcUj...
Content-Type: application/json
Content-Length: 39

{
  "items": [
    "FTROP570"
  ]
}
```

---

*Fin du document — Source : `Auth_API_ProfiAuto_ENG.pdf`*
