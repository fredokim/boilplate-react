# API Contract

All API responses should use this envelope:

```json
{
  "success": true,
  "data": {}
}
```

Errors should use:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required."
  }
}
```

Frontend behavior:

- `requestDto(config, Dto)` validates the envelope and the data DTO before returning.
- DTO validation failures are classified as `origin: frontend`.
- HTTP/backend failures are classified as `origin: backend` or `origin: network`.
- Analytics timing is emitted from Axios interceptors through the no-op analytics adapter.

## Error codes

HTTP status describes the transport outcome; `error.code` describes the domain
outcome. Several codes can share a status, and a code keeps its meaning even if
the status changes.

| Code | Status | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Request body failed validation. `details.fields` maps a field path to its messages. |
| `AUTH_REQUIRED` | 401 | No access token, or one that is expired or invalid. **The frontend api client branches on this exact string.** |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email or wrong password — reported identically for both. |
| `AUTH_SESSION_REVOKED` | 401 | A refresh token was replayed; the session family has been revoked. |
| `AUTH_ACCOUNT_DISABLED` | 403 | Credentials were correct, but the account is switched off. |
| `AUTH_FORBIDDEN` | 403 | The permission guard denied an authenticated user. `details.missingPermissions` lists what was required. |
| `NOT_FOUND` | 404 | No such route or resource. |
| `DASHBOARD_NOT_FOUND` | 404 | No such dashboard or preset — **or one the caller may not see.** The two are the same answer on purpose. |
| `DASHBOARD_FORBIDDEN` | 403 | The caller can see the dashboard but does not own it. |
| `DASHBOARD_VERSION_CONFLICT` | 409 | Someone wrote first. `details.currentVersion` says what to re-read. |
| `DASHBOARD_INVALID_SCHEMA` | 422 | The payload failed dashboard schema validation. |
| `DASHBOARD_UNAVAILABLE` | 503 | Widget data could not be produced. Matches the existing MSW scenario. |
| `TOO_MANY_REQUESTS` | 429 | Sign-in attempt budget exhausted. |
| `GRAPH_NOT_FOUND` | 404 | No such graph — **or one the caller may not see.** |
| `GRAPH_FORBIDDEN` | 403 | The caller can see the graph but does not own it. |
| `GRAPH_VERSION_CONFLICT` | 409 | The structure changed. `details.currentVersion` says what to re-read. |
| `GRAPH_INVALID_EDGE` | 422 | Dangling endpoint, self-loop, or duplicate edge. `details` names it. |
| `TOPOLOGY_RESYNC_REQUIRED` | 409 | The gap is older than the retained event window. Take a fresh snapshot. |
| `BROADCAST_NOT_FOUND` | 404 | No such broadcast. |
| `BROADCAST_INVALID_TRANSITION` | 409 | A lifecycle move that is not allowed. `ended` is terminal. |
| `BROADCAST_NOT_PLAYABLE` | 409 | Playback requested for a broadcast that is not live. |
| `CHAT_USER_MUTED` | 403 | `details.until` when the mute is temporary. |
| `CHAT_RATE_LIMITED` | 429 | Sending faster than the per-broadcast budget. |
| `CHAT_CLOSED` | 409 | The broadcast ended. History stays readable. |
| `SERVICE_UNAVAILABLE` | 503 | A dependency is down. `details.checks` names it. |
| `INTERNAL_ERROR` | 500 | Unexpected failure. Carries no detail in production. |

`details` is present only when an error has structured context. The frontend's
`ApiErrorDto` declares only `code` and `message` and validates with
`whitelist: true`, so it strips `details` rather than rejecting it.

## Auth endpoints

| Endpoint | Auth | Notes |
| --- | --- | --- |
| `POST /api/auth/login` | public | `{ email, password }` → `{ accessToken, user }`. Sets the refresh cookie. |
| `POST /api/auth/refresh` | refresh cookie | Rotates the cookie, returns a new access token. |
| `POST /api/auth/logout` | public | Idempotent. Clears the cookie. |
| `GET /api/auth/session` | bearer | Re-reads the user from the database. |

The refresh token is never in a response body and never in browser storage: it
lives only in an `HttpOnly`, `SameSite=Lax` cookie scoped to `/api/auth`.

## Dashboard endpoints

Two surfaces. `/dashboard/*` keeps the shapes the frontend already calls;
`/dashboards/:id/*` is the domain contract.

| Endpoint | Permission |
| --- | --- |
| `GET /api/dashboard/summary` · `kpi` · `chart` · `table` | `dashboard:read` |
| `GET /api/dashboards/:dashboardId` | `dashboard:read` |
| `PUT /api/dashboards/:dashboardId` | `dashboard:write` |
| `GET /api/dashboards/:dashboardId/personalization` | `dashboard:read` |
| `PUT /api/dashboards/:dashboardId/personalization` | `dashboard:write` |
| `POST /api/dashboards/:dashboardId/presets` | `dashboard:write` |
| `PATCH /api/dashboards/:dashboardId/presets/:presetId` | `dashboard:write` |
| `POST /api/dashboards/:dashboardId/presets/:presetId/select` | `dashboard:write` |
| `DELETE /api/dashboards/:dashboardId/presets/:presetId` | `dashboard:write` |

Every write takes `expectedVersion` — the version last read. A mismatch answers
409 with the current version in `details`, which is what the client needs to
re-read rather than blindly refetch.

`dashboard:write` did not exist before this step. The frontend's fixture roles
granted only `dashboard:read`.

## Graph and topology

| Endpoint | Permission |
| --- | --- |
| `GET /api/graphs` · `POST /api/graphs` | `graph:read` / `graph:write` |
| `GET /api/graphs/:graphId` · `DELETE` | `graph:read` / `graph:write` |
| `PUT /api/graphs/:graphId/content` | `graph:write` |
| `GET /api/graphs/:graphId/topology/snapshot` | `graph:read` |
| `GET /api/graphs/:graphId/topology/resync?lastSequence=` | `graph:read` |
| `POST /api/graphs/:graphId/topology/events` | `graph:write` |

### WebSocket

`ws://host/api/topology?token=<access token>` — the token is a query parameter
because a browser cannot set headers on an upgrade, which is why it is the
short-lived access token and never the refresh token.

Client sends `{ event: 'subscribe', data: { graphId, lastSequence? } }`.
The server answers one of:

| Message | Meaning |
| --- | --- |
| `subscribed` | Attached. `replayed` says how many missed events were sent first. |
| `resync-required` | The gap is unrecoverable. Take a fresh snapshot; do not assume continuity. |
| `event` | One `TopologyRealtimeEvent`, matching the frontend type exactly. |
| `heartbeat` / `pong` | Liveness only. |
| `error` | `code` is one of the domain codes above. |

Close codes: 4401 unauthenticated, 4403 forbidden, 4408 slow consumer, 4429 rate
limited, 4400 protocol.

**Delivery is at-least-once.** The server may resend; the client dedupes on
`eventId` and orders on `sequence`. `Graph.version` (structure) and
`Graph.sequence` (runtime stream) are different counters and never interchangeable.

## Live and chat

| Endpoint | Permission |
| --- | --- |
| `GET /api/live/broadcasts` · `GET /api/live/broadcasts/:broadcastId` | `live:read` |
| `POST /api/live/broadcasts/:broadcastId/playback-session` | `live:read` |
| `POST /api/live/broadcasts/:broadcastId/status` | `live:manage` |
| `GET /api/live/broadcasts/:broadcastId/chat/messages` | `live:read` |
| `POST /api/live/broadcasts/:broadcastId/chat/messages` | `chat:write` |
| `DELETE /api/live/broadcasts/:broadcastId/chat/messages/:messageId` | `chat:moderate` |
| `POST /api/live/broadcasts/:broadcastId/chat/mutes` · `DELETE .../:targetId` | `chat:moderate` |

The **manifest URL is never returned with broadcast metadata** and never logged.
It is issued only through a playback session, which carries an expiry.

`isLive` comes from the stored status, never from the clock.

Sending is **idempotent on `clientMessageId`** — a retry returns the stored
message rather than posting twice. Sequence and timestamp are assigned by the
server; a client timestamp is neither sent nor trusted. History pages by sequence
cursor, and `nextCursor` is null once a page reaches the end.

A deleted message keeps its row for audit, is served with an empty body and
`deleted: true`, and is announced to live clients as a tombstone.

### Chat WebSocket

`ws://host/api/live/chat?token=<access token>` — read-only. Sending goes over
HTTP, where the idempotency key, the rate limit, and the mute check live.

Client sends `{ event: 'join', data: { broadcastId, afterSequence? } }` and
receives `message`, `deleted`, `joined`, `heartbeat`, or `error`.
