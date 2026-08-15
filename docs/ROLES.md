# VidNetwork — Roles & Permissions

This document describes who can do what. Server-side authorization is the
security boundary; client checks and Firestore rules are UX backstops only.

## Roles

| Role | Meaning |
|---|---|
| **Visitor** | Not signed in. Can view the landing page, pricing and public `/explore` previews. |
| **Member** | Signed in with a verified email. Standard-tier access by default. |
| **Member (Premium)** | Member with an active Premium subscription. Accesses premium-gated content. |
| **Moderator** | Member trusted to moderate content and members. Applies community norms. |
| **Host / Owner** | The community operator. Full control: content, members, billing, settings. |

`Host` maps onto the `owner` role today; scoped (per-content-area) moderator
assignment is future work. The owner role is immutable and the owner cannot be
suspended.

## Summary matrix

| Capability | Visitor | Member | Premium | Moderator | Owner |
|---|---|---|---|---|---|
| View landing / pricing / explore | ✔ | ✔ | ✔ | ✔ | ✔ |
| Sign up / sign in | ✔ | — | — | — | — |
| Dashboard & member content | — | ✔* | ✔* | ✔* | ✔ |
| Create posts, comments, reactions | — | ✔ | ✔ | ✔ | ✔ |
| Join live rooms | — | ✔* | ✔* | ✔* | ✔ |
| Create / manage rooms, courses, events | — | — | — | — | ✔ |
| Moderate rooms / content | — | — | — | ✔ | ✔ |
| Manage members & roles | — | — | — | Limited | ✔ |
| Ban / suspend members | — | — | — | Authorized | ✔ |
| View admin analytics / income | — | — | — | — | ✔ |
| Billing, pricing, promo codes, automations | — | — | — | — | ✔ |
| Platform settings | — | — | — | — | ✔ |

\* *Subject to membership access checks: active subscription, tier, and
space/group membership (see below).*

## Access rules

### Active membership

A member is "active" when their subscription is in `active`, `trialing` or
`past_due` and the current period end (or trial end) is still in the future.
Access is revoked when the subscription lapses, is canceled, or the member is
suspended.

### Content gating

- **Feed / posts / comments / rooms** — author always passes; otherwise active
  subscription + (space membership if posted to a space) + (group membership if
  posted to a group).
- **Courses / lessons** — published course + active subscription + required
  tier; one-time purchased courses additionally require a purchase.
- **Events** — active subscription; RSVP additionally enforces capacity and,
  for paid events, purchase.
- **Spaces** — active subscription + tier + invite/access settings; joining
  enforces `invite-only` and purchase requirements.
- **Rooms (video)** — active subscription + tier + space/group membership;
  scheduled rooms are locked until `opensAt` unless the user is host
  (owner/moderator).
- **Recordings / transcripts** — owner/moderator, space or group member, else
  any active subscriber (per-room visibility).
- **Chat** — conversations are readable only by participants; message sends
  require group membership / a valid DM recipient.

## Role administration

- Roles live on `users/{uid}.role` (`member` | `moderator` | `owner`).
- New accounts are always created as `member`.
- Promoting a user to owner:
  ```bash
  node scripts/set-owner.mjs you@example.com
  ```
- Role changes are server-side only (Admin SDK); Firestore rules reject client
  role writes. Moderator assignment is owner-only.

## Guard reference

Server guards in `src/lib/server/authorize.js`:

| Guard | Requires |
|---|---|
| `requireUser` | Signed in, not suspended |
| `requireActiveMember` | Signed in + active subscription (+ tier) |
| `requireTier` | Active subscription at the required tier |
| `requireGroupMember(groupId)` | Membership of the group |
| `requireOwner` | `owner` role |
| `requireModerator` | `owner` or `moderator` role |

## Related docs

- [AUTHORIZATION-MATRIX.md](./AUTHORIZATION-MATRIX.md) — full role × action ×
  resource matrix.
- [SECURITY-MATRIX.md](./SECURITY-MATRIX.md) — how each control is enforced
  (rules + server).
- [SECURITY.md](./SECURITY.md) — reporting a security issue.
