# CLAUDE.md


# Notification Module — Instructions pour Claude Code

## Contexte du projet

Application **RadioLog** — gestion de communications radio pour événements.
Stack : Node.js, TypeScript, Express, MongoDB, Zod, Auth0 JWT.

Tu recevras en pièces jointes les fichiers clés suivants — ne les réinvente pas :

- `conversation.model.ts`
- `notification.service.ts`
- `conversation.routes.ts`
- `common.model.ts`
- `message.service.ts`

## Arborescence complète du projet

```
backend/src/
├── app.ts
├── server.ts
├── auth0/
│   ├── auth0.model.ts
│   └── auth0.service.ts
├── canals/
│   ├── canal.database.ts
│   ├── canal.model.ts
│   ├── canal.routes.ts
│   ├── canal.service.ts
│   └── canal.validator.ts
├── common/
│   └── common.model.ts          ← fourni en pièce jointe
├── configs/
│   ├── config.database.ts
│   └── config.ts
├── conversations/
│   ├── conversation.database.ts
│   ├── conversation.model.ts    ← fourni en pièce jointe
│   ├── conversation.routes.ts   ← fourni en pièce jointe
│   ├── conversation.service.ts
│   ├── conversation.validator.ts
│   ├── message.database.ts
│   ├── message.fake.ts
│   ├── message.service.ts       ← fourni en pièce jointe
│   └── notification.service.ts  ← fourni en pièce jointe
├── events/
├── middlewares/
│   ├── auth.guard.ts
│   ├── error-handler.ts
│   ├── paging.validator.ts
│   ├── require-permissions.ts
│   └── schema-validator.ts
├── organisations/
├── places/
├── radios/
├── records/
├── teams/
├── users/
└── utils/
    ├── errors.ts
    ├── logger.ts
    └── permissions.ts
```

## Règles absolues

- **Ne modifier aucun fichier qui n’est pas lié aux notifications.**
- Ne toucher à aucun module existant (canals, events, records, teams, etc.).
- Pour `conversation.routes.ts` : ne modifier que la section notifications, laisser les routes existantes intactes.
- Ne pas créer de tests.
- Ne pas modifier `package.json` — utiliser uniquement les dépendances déjà disponibles : Express, MongoDB, Zod, node-fetch/fetch natif.
- Logger les erreurs silencieusement, ne jamais faire crasher le serveur sur une erreur de notification.
- Respecter les patterns existants : couches `model` → `database` → `service` → `routes`, validation Zod, `async/await`.

## Variables d’environnement disponibles dans `backend/.env`

```env
TELEGRAM_TOKEN=<token du bot>
TELEGRAM_CHAT_ID=<id du groupe>         # v1 groupe seulement
TELEGRAM_INVITE_LINK=<lien invitation>  # variante groupe seulement
```

À documenter dans chaque variante les variables supplémentaires nécessaires.

## Collection MongoDB existante

- `conversations` — conversations
- `messages` — messages

## Notification v1 actuelle (référence)

`notification.service.ts` expose `sendNotification(message, conversationId)` qui broadcast dans un groupe Telegram via `POST /bot{token}/sendMessage`. C’est le point de départ de toutes les variantes.

-----

## Variantes à implémenter

Chaque variante doit être dans son propre dossier à la racine :

```
variant-group/
variant-polling-memberid/
variant-polling-uuid/
variant-webhook-ready/
  ├── memberid/
  └── uuid/
```

Chaque dossier contient **uniquement les fichiers modifiés ou créés**. Les fichiers non modifiés ne doivent pas être recopiés.

-----

## Variante 1 — `variant-group/`

### Description

Broadcast vers un groupe Telegram commun. Tous les membres rejoignent via un lien d’invitation. Aucune liaison en base de données.

### Ce qui change par rapport à la v1

- Ajout de `TELEGRAM_INVITE_LINK` dans `.env`
- `notification.service.ts` reste identique
- Aucune autre modification

### Fichiers à produire

```
variant-group/
└── .env.example        # documenter TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_INVITE_LINK
```

### Comportement

- L’invite link est exposé via `GET /api/conversations/telegram-link` (pas d’auth requise)
- Réponse : `{ inviteLink: string }`

-----

## Variante 2 — `variant-polling-memberid/`

### Description

Le membre reçoit un lien contenant son `memberId`. En cliquant, il démarre le bot Telegram avec `/start <memberId>`. Le backend poll Telegram toutes les **3 secondes** pour traiter les nouveaux `/start` et enregistre la liaison `memberId ↔ chat_id` en base.

### Variables d’environnement supplémentaires

```env
TELEGRAM_BOT_USERNAME=<username_du_bot>   # pour construire le lien t.me
```

### Lien généré

```
https://t.me/<TELEGRAM_BOT_USERNAME>?start=<memberId>
```

Exposé via `GET /api/conversations/telegram-link/:memberId` (auth requise, READ_DATA).
Réponse : `{ link: string }`

### Collection MongoDB : `telegram_links`

```ts
{
  _id: ObjectId,
  memberId: ObjectId,
  chatId: string,
  linkedAt: Date
}
```

Index unique sur `memberId`. Si un memberId est déjà lié, on met à jour le `chatId` — pas d’expiration.

### Polling

- Démarrer au lancement du serveur dans `server.ts` via `startPolling()`
- Intervalle : 3 secondes
- Utiliser `getUpdates` avec `offset` persisté en mémoire pour ne pas retraiter les mêmes updates
- Traiter uniquement les messages `/start <memberId>`
- En cas d’erreur : logger avec `console.error` et continuer

### Notification

- `sendNotification()` récupère tous les `chatId` de la collection `telegram_links`
- Envoie un DM à chacun via `sendMessage`
- Si un envoi échoue pour un `chatId` : logger et continuer les autres

### Fichiers à produire

```
variant-polling-memberid/
├── .env.example
├── conversations/
│   ├── notification.service.ts     # modifié : DM individuels + getLink
│   ├── notification.database.ts    # nouveau : CRUD telegram_links
│   ├── notification.model.ts       # nouveau : TelegramLink type
│   └── conversation.routes.ts      # modifié : ajout GET telegram-link/:memberId
└── server.ts                       # modifié : appel startPolling()
```

### Message de confirmation du bot

```
✅ Ton compte RadioLog est maintenant relié.
Tu recevras les notifications directement ici.
```

-----

## Variante 3 — `variant-polling-uuid/`

### Description

Identique à la variante 2 mais le lien contient un **UUID** à la place du `memberId`. Le backend génère un UUID, le stocke en base avec le `memberId` et une **expiration de 15 minutes**. Le membre n’a rien à faire de plus qu’un clic.

### Variables d’environnement supplémentaires

```env
TELEGRAM_BOT_USERNAME=<username_du_bot>
```

### Lien généré

```
https://t.me/<TELEGRAM_BOT_USERNAME>?start=<uuid>
```

Exposé via `GET /api/conversations/telegram-link/:memberId` (auth requise, READ_DATA).

- Génère un UUID v4
- Le stocke en base avec expiration `now + 15min`
- Réponse : `{ link: string }`

### Collection MongoDB : `telegram_links`

```ts
{
  _id: ObjectId,
  memberId: ObjectId,
  chatId: string,          // null jusqu'à la liaison
  token: string,           // UUID v4
  tokenExpiresAt: Date,    // now + 15min au moment de la génération du lien
  linkedAt?: Date
}
```

Index unique sur `memberId` (upsert à chaque nouvelle génération de lien).

### Polling

- Identique à la variante 2
- Lors du traitement du `/start <uuid>` :
1. Chercher le token en base
1. Vérifier qu’il n’est pas expiré (`tokenExpiresAt > now`)
1. Si valide : sauvegarder le `chatId`, confirmer au membre
1. Si expiré : répondre “Lien expiré, génère un nouveau lien depuis l’application”

### Fichiers à produire

```
variant-polling-uuid/
├── .env.example
├── conversations/
│   ├── notification.service.ts
│   ├── notification.database.ts
│   ├── notification.model.ts
│   └── conversation.routes.ts
└── server.ts
```

-----

## Variante 4 — `variant-webhook-ready/memberid/` et `variant-webhook-ready/uuid/`

### Description

Identique aux variantes polling (2 et 3) mais l’architecture est préparée pour une migration vers webhook sans réécriture. Le polling et le webhook partagent la même logique de traitement.

### Principe d’architecture

Extraire le traitement d’un update Telegram dans une fonction pure partagée :

```ts
// telegram.processor.ts
export async function processTelegramUpdate(update: TelegramUpdate): Promise<void>
```

- **Polling** : appelle `processTelegramUpdate` pour chaque update récupéré via `getUpdates`
- **Webhook** : le endpoint `POST /api/telegram/webhook` appelle `processTelegramUpdate` avec le body reçu

### Endpoint webhook (inactif par défaut)

```
POST /api/telegram/webhook
```

- Protégé par vérification du secret Telegram (`X-Telegram-Bot-Api-Secret-Token` header)
- Variable d’environnement : `TELEGRAM_WEBHOOK_SECRET`
- En dev : le webhook endpoint existe mais le polling tourne — les deux peuvent coexister
- En prod : désactiver le polling via `TELEGRAM_POLLING_ENABLED=false`

### Variables d’environnement supplémentaires

```env
TELEGRAM_BOT_USERNAME=<username_du_bot>
TELEGRAM_WEBHOOK_SECRET=<secret_token>
TELEGRAM_POLLING_ENABLED=true   # false en prod
```

### Fichiers à produire (par sous-variante)

```
variant-webhook-ready/memberid/
├── .env.example
├── conversations/
│   ├── notification.service.ts
│   ├── notification.database.ts
│   ├── notification.model.ts
│   ├── conversation.routes.ts
│   └── telegram.processor.ts    # nouveau : logique partagée polling/webhook
├── routes/
│   └── telegram.routes.ts       # nouveau : POST /api/telegram/webhook
├── app.ts                       # modifié : enregistrer telegram.routes
└── server.ts                    # modifié : startPolling() conditionnel

variant-webhook-ready/uuid/
└── (même structure, logique UUID identique à variante-polling-uuid)
```

### Migration vers webhook en prod

Documenter dans chaque `.env.example` les étapes exactes :

1. Déployer avec URL publique HTTPS
1. Appeler `POST https://api.telegram.org/bot{TOKEN}/setWebhook` avec l’URL
1. Passer `TELEGRAM_POLLING_ENABLED=false`
1. Redémarrer

-----

## Marche à suivre pour Claude Code

1. Lire tous les fichiers fournis en pièces jointes avant de commencer
1. Implémenter les 5 variantes dans l’ordre : group → polling-memberid → polling-uuid → webhook-memberid → webhook-uuid
1. Pour chaque variante, ne produire que les fichiers listés dans “Fichiers à produire”
1. Ne copier aucun fichier non modifié
1. Chaque fichier doit compiler sans erreur TypeScript
1. Chaque `notification.service.ts` doit exporter `sendNotification(message: Message, conversationId: ConversationID): Promise<void>` — c’est le contrat que `message.service.ts` appelle
1. Les routes de test temporaires (`/test-notification`) présentes dans `conversation.routes.ts` fourni doivent être supprimées dans toutes les variantes
1. Documenter les variables d’environnement dans chaque `.env.example`