# Yarnery Lounge — Authorization Matrix

Server-side authorization is the security boundary. Client checks / Firestore rules are UX backstops only.

Guards (see `src/lib/server/authorize.js`): `requireUser` (any signed-in, not suspended),
`requireActiveMember` (+ active subscription), `requireTier` (+ tier), `requireOwner`,
`requireModerator` (owner or moderator), `requireGroupMember(groupId)` (+ membership).

## Baseline matrix

| Action | Visitor | Member (standard) | Member (premium) | Moderator | Host* | Owner |
|---|---|---|---|---|---|---|
| View public content / landing / pricing | Yes | Yes | Yes | Yes | Yes | Yes |
| View `/explore` public previews | Yes | Yes | Yes | Yes | Yes | Yes |
| Sign up / sign in | Yes | — | — | — | — | — |
| View `/dashboard` | No | Yes | Yes | Yes | Yes | Yes |
| View private content (spaces/feed/groups/rooms) | No | If permitted | If permitted | If permitted | If assigned | Yes |
| Create post / comment / react | No | Yes | Yes | Yes | Yes | Yes |
| Join live room | No | Yes | Yes | Yes | Yes | Yes |
| Create / manage live room | No | No | No | No | Assigned scope | Yes |
| Moderate live room | No | No | No | Yes | Assigned scope | Yes |
| Create course / event | No | No | No | No | Assigned scope | Yes |
| Manage members / roles | No | No | No | Limited | Limited | Yes |
| Ban / suspend | No | No | No | Authorized | No/limited | Yes |
| Manage billing / subscriptions | No | No | No | No | No | Yes |
| View admin analytics | No | No | No | No | No | Yes |
| Platform settings | No | No | No | No | No | Yes |

*Host maps onto the existing `owner`/`moderator` role set; scoped assignment is future work.

## Resource access (server routes)

| Resource | Guard |
|---|---|
| `/api/me` (profile PATCH) | `requireUser` + server-side validation |
| LiveKit token | `requireActiveMember` + room access + tier + space/group membership + rate limit |
| Course progress | `requireActiveMember({tier})` + purchase check |
| Post like/vote/bookmark/comment | `requireUser` + `canAccessPost` (author/owner/subscription + membership) |
| RSVP | `requireActiveMember` + purchase check + capacity transaction |
| Space join | `requireActiveMember` + invite/tier/purchase checks |
| Rooms / events / courses CRUD | `requireOwner` |
| Admin member actions | `requireOwner` (role changes) / `requireModerator` |
| Admin analytics `/api/admin/analytics` | `requireOwner` (server-side aggregates only; no client data reads) |
| Admin questions `/api/admin/questions` | `requireOwner` |
| Admin automations `/api/admin/automations` | `requireOwner` |
| Scheduled-questions cron `/api/cron/scheduled-questions` | `CRON_SECRET` bearer only |
| Live rooms `/api/rooms/live` | `requireUser` (active rooms only) |
| LiveKit token (scheduled room) | `requireActiveMember` + 423 until `opensAt` unless host (owner/moderator) |
| Recognitions `/api/recognitions` | `requireUser` + active sub + rate limit; no self-recognition; 15 pts to recipient |
| Reports | `requireUser` (create) / `requireModerator` (resolve) |
| Purchases | `requireActiveMember` + rate limit; fulfillment server-side (Shopify order sync when integrated) |
| Chat messages | `requireUser` + participant check + rate limit |

## Billing state machine (shared server + rules)

`ACTIVE_STATUSES = ["active", "trialing", "past_due"]`; `currentPeriodEnd` (fallback `trialEnd`)
must be in the future; suspension revokes access. Never trust client-supplied role/tier/subscription.
