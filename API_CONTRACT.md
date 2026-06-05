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
