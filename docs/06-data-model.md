# 06 — Modelo de datos

## Entidades principales

## User

```ts
type User = {
  id: string;
  email?: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
};
```

## RoutePlace

```ts
type RoutePlace = {
  id?: string;
  name?: string;
  formattedAddress?: string;
  lat: number;
  lng: number;
  source: "google_url" | "google_geocoding" | "places" | "manual";
};
```

## RoutePreferences

```ts
type RoutePreferences = {
  avoidHighways: boolean;
  avoidTolls: boolean;
  avoidFerries: boolean;
  routeProfile:
    | "fastest"
    | "motorcycle_balanced"
    | "scenic"
    | "curvy"
    | "easy";
};
```

## RouteStop

```ts
type RouteStop = {
  id: string;
  place: RoutePlace;
  durationMinutes: number;
  order: number;
};
```

## RiderProfile

```ts
type RiderProfile = {
  bikeType:
    | "naked"
    | "trail"
    | "touring"
    | "sport"
    | "scooter"
    | "custom"
    | "small_125";
  experience: "beginner" | "normal" | "experienced";
  rainTolerance: "low" | "medium" | "high";
  coldTolerance: "low" | "medium" | "high";
  ridesWithPassenger?: boolean;
};
```

## SavedRoute

```ts
type SavedRoute = {
  id: string;
  userId?: string;
  title?: string;
  originalUrl: string;
  expandedUrl?: string;
  origin: RoutePlace;
  destination: RoutePlace;
  waypoints: RoutePlace[];
  preferences: RoutePreferences;
  stops: RouteStop[];
  selectedAlternativeId?: string;
  polyline?: string;
  summary?: RouteSummary;
  lastWeatherSnapshotId?: string;
  createdAt: string;
  updatedAt: string;
};
```

## WeatherSnapshot

```ts
type WeatherSnapshot = {
  id: string;
  routeId: string;
  departureTime: string;
  generatedAt: string;
  provider: "google_weather";
  segments: WeatherSegment[];
  rideScore: RideScore;
  alerts: RouteAlert[];
};
```

## WeatherSegment

```ts
type WeatherSegment = {
  index: number;
  fromKm: number;
  toKm: number;
  lat: number;
  lng: number;
  eta: string;
  bearingDegrees?: number;
  weather: {
    temperatureC?: number;
    apparentTemperatureC?: number;
    precipitationProbability?: number;
    precipitationMm?: number;
    windKmh?: number;
    windGustKmh?: number;
    windDirectionDegrees?: number;
    condition?: string;
    visibilityMeters?: number;
  };
  risk: SegmentRisk;
};
```

## SegmentRisk

```ts
type SegmentRisk = {
  score: number;
  level: "excellent" | "good" | "caution" | "bad" | "avoid";
  reasons: string[];
};
```

## RouteAlert

```ts
type RouteAlert = {
  id: string;
  type:
    | "rain"
    | "heavy_rain"
    | "storm"
    | "crosswind"
    | "gusts"
    | "cold"
    | "heat"
    | "fog"
    | "night"
    | "low_confidence";
  severity: "info" | "warning" | "danger";
  fromKm: number;
  toKm: number;
  startEta: string;
  endEta: string;
  title: string;
  description: string;
};
```

## SharedRoute

```ts
type SharedRoute = {
  id: string;
  routeId: string;
  shareId: string;
  createdByUserId?: string;
  visibility: "public_link" | "public_listed" | "private_group";
  revokedAt?: string;
  createdAt: string;
};
```

## CommunityReport

```ts
type CommunityReport = {
  id: string;
  userId?: string;
  type:
    | "rain_now"
    | "wet_road"
    | "fog"
    | "gravel"
    | "roadworks"
    | "accident"
    | "closed_road"
    | "bad_asphalt"
    | "animals"
    | "nice_viewpoint"
    | "good_stop";
  lat: number;
  lng: number;
  routeId?: string;
  description?: string;
  expiresAt: string;
  confirmations: number;
  createdAt: string;
};
```
