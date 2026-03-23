# Athlete Performance API — Reference

**Base URL:** `http://localhost:3000/api/v1`  
**Content-Type:** `application/json`

---

## Table of Contents

- [Health Check](#health-check)
- [Athlete Profiles](#athlete-profiles)
  - [List Athletes](#get-athletes)
  - [Create Athlete](#post-athletes)
  - [Get Athlete](#get-athletesid)
  - [Update Athlete](#patch-athletesid)
  - [Delete Athlete](#delete-athletesid)
  - [Performance Summary](#get-athletesidsummary)
- [Performance Data](#performance-data)
  - [List Sessions](#get-performance)
  - [Log Session](#post-performance)
  - [Sessions by Athlete](#get-performanceathleteathleted)
  - [Get Session](#get-performanceid)
  - [Update Session](#patch-performanceid)
  - [Delete Session](#delete-performanceid)
- [Field Enumerations](#field-enumerations)
- [Error Format](#error-format)

---

## Health Check

### `GET /health`

Returns API status.

**Response `200`**
```json
{
  "success": true,
  "message": "Athlete Performance API is running",
  "timestamp": "2024-07-10T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

## Athlete Profiles

### `GET /athletes`

Retrieve a paginated, filtered list of athlete profiles.

**Query Parameters**

| Parameter | Type   | Description                              |
|-----------|--------|------------------------------------------|
| `sport`   | string | Filter by sport (see enums below)        |
| `team`    | string | Filter by team name                      |
| `status`  | string | `active` \| `injured` \| `retired` \| `suspended` |
| `search`  | string | Full-text search on name or email        |
| `page`    | number | Page number (default: `1`)               |
| `limit`   | number | Results per page, max `100` (default: `20`) |

**Response `200`**
```json
{
  "success": true,
  "message": "3 athlete(s) found",
  "pagination": { "total": 3, "page": 1, "limit": 20, "totalPages": 1 },
  "data": [
    {
      "id": "athlete-001",
      "firstName": "Jordan",
      "lastName": "Reeves",
      "email": "jordan.reeves@teamalpha.com",
      "dateOfBirth": "1998-04-12",
      "sport": "Track & Field",
      "position": "Sprinter",
      "team": "Team Alpha",
      "nationality": "USA",
      "height_cm": 182,
      "weight_kg": 78,
      "status": "active",
      "createdAt": "2024-01-15T09:00:00.000Z",
      "updatedAt": "2024-01-15T09:00:00.000Z"
    }
  ]
}
```

---

### `POST /athletes`

Create a new athlete profile.

**Request Body**

| Field         | Type   | Required | Description                     |
|---------------|--------|----------|---------------------------------|
| `firstName`   | string | ✅        | 1–50 characters                 |
| `lastName`    | string | ✅        | 1–50 characters                 |
| `email`       | string | ✅        | Valid email, must be unique     |
| `dateOfBirth` | string | ✅        | ISO date `YYYY-MM-DD`           |
| `sport`       | string | ✅        | See [sport enum](#field-enumerations) |
| `position`    | string | ❌        | e.g. "Sprinter", "Goalkeeper"   |
| `team`        | string | ❌        | Team name                       |
| `nationality` | string | ❌        | Country                         |
| `height_cm`   | number | ❌        | Integer 100–250                 |
| `weight_kg`   | number | ❌        | 30–250                          |
| `status`      | string | ❌        | Default: `"active"`             |

**Response `201`**
```json
{
  "success": true,
  "message": "Athlete profile created successfully",
  "data": { "id": "athlete-abc123", "..." }
}
```

**Errors:** `400` (validation), `409` (duplicate email)

---

### `GET /athletes/:id`

Retrieve a single athlete by ID.

**Response `200`**
```json
{
  "success": true,
  "data": { "id": "athlete-001", "firstName": "Jordan", "..." }
}
```

**Errors:** `404` (not found)

---

### `PATCH /athletes/:id`

Partially update an athlete profile. All fields are optional; at least one must be provided.

**Request Body** — any subset of the [POST /athletes](#post-athletes) fields.

**Response `200`**
```json
{
  "success": true,
  "message": "Athlete profile updated successfully",
  "data": { "id": "athlete-001", "weight_kg": 80, "updatedAt": "2024-07-10T..." }
}
```

**Errors:** `400`, `404`, `409`

---

### `DELETE /athletes/:id`

Delete an athlete and **cascade-delete** all their performance records.

**Response `200`**
```json
{
  "success": true,
  "message": "Athlete 'Jordan Reeves' and 4 associated performance record(s) deleted.",
  "data": {
    "deletedAthleteId": "athlete-001",
    "deletedPerformanceRecords": 4
  }
}
```

**Errors:** `404`

---

### `GET /athletes/:id/summary`

Returns the athlete profile alongside an aggregated performance summary.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "athlete": { "id": "athlete-001", "..." },
    "performanceSummary": {
      "totalSessions": 12,
      "totalDistance_km": 18.4,
      "totalDuration_min": 480,
      "avgRpe": 7.3,
      "sessionsByType": { "training": 9, "race": 3 },
      "recentSessions": [ "..." ]
    }
  }
}
```

---

## Performance Data

### `GET /performance`

List and filter performance sessions across all athletes.

**Query Parameters**

| Parameter     | Type   | Description                         |
|---------------|--------|-------------------------------------|
| `athleteId`   | string | Filter by athlete ID                |
| `sessionType` | string | See [session type enum](#field-enumerations) |
| `event`       | string | Partial match on event name         |
| `startDate`   | string | ISO date — must pair with `endDate` |
| `endDate`     | string | ISO date — must pair with `startDate` |
| `page`        | number | Default: `1`                        |
| `limit`       | number | Default: `20`, max: `100`           |

**Response `200`**
```json
{
  "success": true,
  "message": "5 performance record(s) found",
  "pagination": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 },
  "data": [ { "id": "perf-001", "athleteId": "athlete-001", "..." } ]
}
```

---

### `POST /performance`

Log a new performance session.

**Request Body**

| Field          | Type   | Required | Description                             |
|----------------|--------|----------|-----------------------------------------|
| `athleteId`    | string | ✅        | Must reference an existing active athlete |
| `sessionDate`  | string | ✅        | ISO date `YYYY-MM-DD`                  |
| `sessionType`  | string | ✅        | See [enum](#field-enumerations)         |
| `event`        | string | ✅        | e.g. `"100m Sprint"`, `"400m Freestyle"` |
| `duration_min` | number | ❌        | Session length in minutes               |
| `distance_km`  | number | ❌        | Distance covered in km                  |
| `metrics`      | object | ❌        | Flexible key-value pairs for sport-specific stats |
| `rpe`          | number | ❌        | Rate of Perceived Exertion 1–10         |
| `notes`        | string | ❌        | Free-text notes, max 1000 chars         |

**Example `metrics` for Track & Field**
```json
{
  "time_sec": 10.42,
  "reactionTime_sec": 0.148,
  "topSpeed_kmh": 37.8,
  "avgHeartRate_bpm": 192,
  "peakHeartRate_bpm": 201
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Performance record created successfully",
  "data": { "id": "perf-xyz", "athleteId": "athlete-001", "..." }
}
```

**Errors:** `400`, `404` (athlete not found)

---

### `GET /performance/athlete/:athleteId`

Retrieve all performance sessions for a specific athlete.

**Response `200`**
```json
{
  "success": true,
  "message": "4 performance record(s) found for Jordan Reeves",
  "data": [ { "id": "perf-001", "..." } ]
}
```

**Errors:** `404`

---

### `GET /performance/:id`

Fetch a single performance record, enriched with lightweight athlete info.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "perf-001",
    "sessionDate": "2024-06-01",
    "event": "100m Sprint",
    "metrics": { "time_sec": 10.42 },
    "athlete": {
      "id": "athlete-001",
      "firstName": "Jordan",
      "lastName": "Reeves",
      "sport": "Track & Field"
    }
  }
}
```

**Errors:** `404`

---

### `PATCH /performance/:id`

Partially update a performance record. `athleteId` is **immutable** and will be ignored.

**Request Body** — any subset of POST fields except `athleteId`.

**Response `200`**
```json
{
  "success": true,
  "message": "Performance record updated successfully",
  "data": { "id": "perf-001", "rpe": 9, "updatedAt": "..." }
}
```

**Errors:** `400`, `404`

---

### `DELETE /performance/:id`

Delete a single performance record.

**Response `200`**
```json
{
  "success": true,
  "message": "Performance record deleted successfully",
  "data": { "deletedId": "perf-001" }
}
```

**Errors:** `404`

---

## Field Enumerations

### Sports
`Track & Field` · `Swimming` · `Cycling` · `Football` · `Basketball` · `Tennis` · `Rugby` · `Gymnastics` · `Rowing` · `Soccer` · `Volleyball` · `Weightlifting` · `Wrestling` · `Boxing` · `Triathlon` · `Other`

### Athlete Status
`active` · `injured` · `retired` · `suspended`

### Session Types
`training` · `race` · `time_trial` · `recovery` · `scrimmage` · `assessment`

---

## Error Format

All error responses share a consistent shape:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [
    { "field": "email", "message": "email must be a valid email" }
  ]
}
```

| Status | Meaning                              |
|--------|--------------------------------------|
| `400`  | Bad Request — validation failure     |
| `404`  | Not Found                            |
| `409`  | Conflict — duplicate resource        |
| `429`  | Too Many Requests — rate limited     |
| `500`  | Internal Server Error                |
