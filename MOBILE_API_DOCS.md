# TIPA Mobile App — API Documentation

> For KMP (Kotlin Multiplatform) developers building the TIPA mobile client.

---

## 1. Project Overview

**TIPA** (Toronto Pilots Association) is a membership management platform for a non-profit aviation association. The mobile app will provide members access to:

- Account & membership status
- Discussion board (threads, comments, reactions)
- Events & RSVP
- Resources/announcements
- Notifications
- Profile management
- Payments & subscription status

**Base URL:** `https://lounge.tipa.ca/api`

All requests/responses use JSON. Timestamps are ISO 8601. All IDs are UUIDs.

---

## 2. Architecture for Mobile

### Important: Cookie-Based vs. Token-Based

The Next.js API routes use **cookie-based sessions** (managed by `@supabase/ssr`). A native mobile app cannot use cookies the same way a browser does, so the recommended architecture is a **split approach**:

| Layer | Use |
|-------|-----|
| **Supabase Kotlin SDK (direct)** | Auth, real-time data, direct table queries |
| **Next.js API routes (`/api/...`)** | Stripe/payments, admin operations, file uploads, Google Calendar |

For Next.js API calls from mobile, send the Supabase **access token** as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <supabase_access_token>
```

> **Note for backend:** The API routes currently read sessions from cookies. They will need to be updated to also accept `Authorization: Bearer <token>` for mobile compatibility. Raise this with the backend developer before building.

### Supabase Credentials (request from backend team)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key for client SDK

### Supabase Kotlin SDK Setup

```kotlin
// build.gradle.kts
implementation("io.github.jan-tennert.supabase:gotrue-kt:VERSION")
implementation("io.github.jan-tennert.supabase:postgrest-kt:VERSION")
implementation("io.github.jan-tennert.supabase:storage-kt:VERSION")
implementation("io.ktor:ktor-client-cio:VERSION") // or okhttp for Android

val supabase = createSupabaseClient(
    supabaseUrl = "https://[project].supabase.co",
    supabaseKey = "your-anon-key"
) {
    install(GoTrue)
    install(Postgrest)
    install(Storage)
}
```

---

## 3. Authentication

### Email/Password Login (via Supabase SDK — recommended)

```kotlin
// Sign in
supabase.gotrue.loginWith(Email) {
    email = "user@example.com"
    password = "password123"
}

// Get access token for API calls
val accessToken = supabase.gotrue.currentSessionOrNull()?.accessToken
```

### Login via Next.js API (alternative)

If using the Next.js login route directly, be aware it sets a cookie-based session. The response body contains:

```json
{
  "user": { ...AuthUser },
  "requiresPasswordChange": false
}
```

Use this only if you are managing cookies manually. Prefer the Supabase SDK.

### Sign Up (via Next.js API — required)

Signup **must** go through the Next.js API route because it creates the `user_profiles` record and sends the welcome email.

`POST https://lounge.tipa.ca/api/auth/signup`

```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "416-555-0100",
  "street": "123 Main St",
  "city": "Toronto",
  "provinceState": "ON",
  "postalZipCode": "M5V 1A1",
  "country": "Canada",
  "membershipClass": "Full",
  "statementOfInterest": "...",
  "interests": ["flying", "aviation"],
  "pilotLicenseType": "PPL",
  "aircraftType": "Cessna 172",
  "callSign": "C-GABC",
  "isStudentPilot": false,
  "isCopaMember": "yes",
  "copaMembershipNumber": "12345"
}
```

### Logout

```kotlin
supabase.gotrue.logout()
```

### Token Refresh

The Supabase SDK handles token refresh automatically. The access token expires periodically — always read the current token before making API calls:

```kotlin
val token = supabase.gotrue.currentSessionOrNull()?.accessToken
```

### Google OAuth

The backend initiates Google OAuth via: `GET /api/auth/oauth?provider=google`

This returns `{ "url": "https://accounts.google.com/..." }`. Open that URL in a **Custom Tab (Android) / ASWebAuthenticationSession (iOS)**. After the user authenticates, Google redirects to `https://lounge.tipa.ca/auth/callback` which handles token exchange and profile setup server-side.

Note: Google OAuth also requests `calendar.events` scope for Google Calendar integration.

### Password Reset

`POST /api/auth/forgot-password`
```json
{ "email": "user@example.com" }
```

The user receives an email with a reset link pointing to `https://lounge.tipa.ca/reset-password`. This is a **web URL** — for deep linking into the app, coordinate with the backend to configure a custom redirect URL (e.g., `tipa://reset-password?token=...`).

### Change Password (for invited users — first login)

`POST /api/auth/change-password`
```json
{ "oldPassword": "temp-password", "newPassword": "new-password" }
```

Required when `loginResponse.requiresPasswordChange === true`.

### Other Auth Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/auth/session` | Get current session info |
| `GET /api/auth/check-invited?email=x` | Check if email was admin-invited |

---

## 4. User Profile

All profile endpoints require authentication. Send the Supabase access token:
```
Authorization: Bearer <access_token>
```

#### `GET /profile`
Returns full profile for the current authenticated user (works for pending and approved users).

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "416-555-0100",
  "street": "123 Main St",
  "city": "Toronto",
  "province_state": "ON",
  "postal_zip_code": "M5V 1A1",
  "country": "Canada",
  "role": "member",
  "membership_level": "Full",
  "status": "approved",
  "membership_expires_at": "2025-12-31T23:59:59Z",
  "member_number": "100042",
  "stripe_subscription_id": "sub_xxx",
  "stripe_customer_id": "cus_xxx",
  "paypal_subscription_id": null,
  "subscription_cancel_at_period_end": false,
  "pilot_license_type": "PPL",
  "aircraft_type": "Cessna 172",
  "call_sign": "C-GABC",
  "is_student_pilot": false,
  "flight_school": null,
  "instructor_name": null,
  "how_often_fly_from_ytz": "weekly",
  "is_copa_member": "yes",
  "join_copa_flight_32": "yes",
  "copa_membership_number": "12345",
  "profile_picture_url": "https://...",
  "interests": "[\"flying\",\"navigation\"]",
  "statement_of_interest": "...",
  "how_did_you_hear": "friend",
  "notify_replies": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-06-01T00:00:00Z"
}
```

#### `PATCH /profile`
Update own profile. All fields optional.
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "416-555-0100",
  "street": "123 Main St",
  "city": "Toronto",
  "province_state": "ON",
  "postal_zip_code": "M5V 1A1",
  "country": "Canada",
  "pilot_license_type": "PPL",
  "aircraft_type": "Cessna 172",
  "call_sign": "C-GABC",
  "how_often_fly_from_ytz": "weekly",
  "is_student_pilot": false,
  "flight_school": null,
  "instructor_name": null,
  "is_copa_member": "yes",
  "join_copa_flight_32": "yes",
  "copa_membership_number": "12345",
  "statement_of_interest": "...",
  "interests": ["flying", "navigation"],
  "how_did_you_hear": "friend",
  "notify_replies": true
}
```

#### `POST /profile/picture`
Upload profile picture. Send as `multipart/form-data` with field `file`.

Allowed types: JPEG, PNG, WebP, GIF — max 5MB.

---

## 5. Membership & Status

### Status Flow
```
pending → approved → expired
         ↓
       rejected
```

### Membership Levels
| Level | Annual Fee (CAD) |
|-------|----------------|
| Full | $45 |
| Student | $25 |
| Associate | $25 |
| Corporate | $125 |
| Honorary | Free |

### Trial Periods (Admin-Configurable)
- **Full / Associate:** Free until September 1st
- **Student:** 12 months from signup
- **Corporate / Honorary:** No trial

### Profile Completion Checks (implement in app)
A user may need to complete their profile before accessing features:
- `status === 'pending'` and missing name/address/interests → show profile completion screen
- `status === 'pending'` or `status === 'approved'` with no subscription (and not Honorary) → show payment screen

---

## 6. Events

#### `GET /events`
Returns all events, sorted by start time. Includes RSVP status for current user.

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Monthly Fly-In",
    "description": "...",
    "location": "Billy Bishop Airport",
    "image_url": "https://...",
    "start_time": "2024-07-15T10:00:00Z",
    "end_time": "2024-07-15T14:00:00Z",
    "created_by": "uuid",
    "created_at": "...",
    "updated_at": "...",
    "rsvp_count": 12,
    "user_rsvped": false
  }
]
```

#### `GET /events/[id]`
Get single event details.

#### `POST /events/[id]/rsvp`
RSVP to an event. No body required.

#### `DELETE /events/[id]/rsvp`
Remove your RSVP.

#### `GET /events/[id]/rsvps`
Get list of attendees.

#### `GET /events/[id]/ical`
Download event as `.ics` (iCalendar) file for native calendar integration.

---

## 7. Resources / Announcements

#### `GET /resources`
Returns all resources/announcements.

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Summer Newsletter",
    "description": "<p>HTML preview...</p>",
    "content": "<p>Full HTML content...</p>",
    "url": "https://external-link.com",
    "resource_type": "link",
    "category": "tipa_newsletters",
    "image_url": "https://signed-url...",
    "file_url": "https://signed-url...",
    "file_name": "newsletter.pdf",
    "created_at": "...",
    "updated_at": "..."
  }
]
```

**Resource Types:** `link` | `document` | `video` | `other`

**Categories:** `tipa_newsletters` | `airport_updates` | `reminder` | `other`

> Note: `image_url` and `file_url` are signed URLs that expire after **1 hour**. Do not cache these URLs; re-fetch the resource list to get fresh ones.

---

## 8. Discussion Board (Threads & Comments)

### Thread Categories
| Value | Label |
|-------|-------|
| `introduce_yourself` | Introduce Yourself |
| `aircraft_shares` | Aircraft Shares |
| `instructor_availability` | Instructor Availability |
| `gear_for_sale` | Gear for Sale |
| `flying_at_ytz` | Flying at YTZ |
| `general_aviation` | General Aviation |
| `training_safety_proficiency` | Training, Safety & Proficiency |
| `wanted` | Wanted |
| `building_a_better_tipa` | Building a Better TIPA |
| `other` | Other |

### Threads

#### `GET /threads`
Returns all threads with comment/reaction counts and author info.

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Looking for an instructor",
    "content": "<p>HTML content...</p>",
    "category": "instructor_availability",
    "image_urls": ["https://..."],
    "created_by": "uuid",
    "author_email": "user@example.com",
    "created_at": "...",
    "updated_at": "...",
    "comment_count": 5,
    "reaction_count": 3,
    "author": {
      "id": "uuid",
      "full_name": "John Doe",
      "profile_picture_url": "https://..."
    }
  }
]
```

#### `GET /threads/[id]`
Get single thread with all its comments.

#### `POST /threads`
Create a new thread.
```json
{
  "title": "Looking for an instructor",
  "content": "<p>HTML content</p>",
  "category": "instructor_availability",
  "image_urls": ["https://..."]
}
```

#### `PATCH /threads/[id]`
Edit own thread (owner only).
```json
{
  "title": "Updated title",
  "content": "<p>Updated content</p>",
  "image_urls": []
}
```

#### `DELETE /threads/[id]`
Delete own thread (owner or admin only).

#### `POST /threads/upload-image`
Upload image for a thread. Send as `multipart/form-data` with field `file`.

Allowed: JPEG, PNG, WebP, GIF — max 10MB. Max 5 images per post.

Returns: `{ "url": "https://..." }`

### Comments

#### `POST /threads/[id]/comments`
Add a comment to a thread.
```json
{
  "content": "<p>HTML comment</p>",
  "image_urls": ["https://..."]
}
```

#### `GET /comments?thread_id=[id]&limit=30&offset=0`
Get paginated comments for a thread.

#### `PATCH /comments/[id]`
Edit own comment.
```json
{
  "content": "<p>Updated comment</p>",
  "image_urls": []
}
```

#### `DELETE /comments/[id]`
Delete own comment (owner or admin only).

### Mentions
To mention a user in content, use the format: `@[Display Name](userId)`

Mentioned users will receive a "mention" notification.

---

## 9. Reactions

#### `POST /reactions`
Like/unlike a thread or comment (toggle).
```json
{
  "thread_id": "uuid",      // one of these is required
  "comment_id": null,
  "reaction_type": "like"
}
```

Posting the same reaction again **removes** it (toggle).

#### `DELETE /reactions/[id]`
Remove a reaction by its ID.

---

## 10. Notifications

#### `GET /notifications?limit=30&offset=0&unread_only=false`
Get the current user's notifications.

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "reply",
      "thread_id": "uuid",
      "comment_id": "uuid",
      "actor_id": "uuid",
      "read_at": null,
      "created_at": "...",
      "thread_title": "Looking for an instructor",
      "actor": {
        "id": "uuid",
        "full_name": "Jane Smith",
        "profile_picture_url": "https://..."
      }
    }
  ],
  "unreadCount": 3
}
```

**Notification types:** `reply` | `mention`

#### `PATCH /notifications`
Mark notifications as read.
```json
// Option 1: Mark specific notifications
{ "ids": ["uuid1", "uuid2"] }

// Option 2: Mark all notifications for a thread
{ "thread_id": "uuid" }
```

---

## 11. Members (Search / Directory)

#### `GET /members/search?q=john`
Search approved members by name or email.

Returns max 8 results. Useful for @mention autocomplete.

**Response:**
```json
[
  {
    "id": "uuid",
    "full_name": "John Doe",
    "email": "john@example.com",
    "profile_picture_url": "https://..."
  }
]
```

#### `GET /members`
Get all approved members (for member directory).

---

## 12. Payments & Subscriptions

#### `GET /payments`
Get own payment history.

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "payment_method": "stripe",
    "amount": "45.00",
    "currency": "CAD",
    "payment_date": "...",
    "membership_expires_at": "2025-12-31T23:59:59Z",
    "stripe_subscription_id": "sub_xxx",
    "status": "completed",
    "notes": null,
    "created_at": "..."
  }
]
```

**Payment methods:** `stripe` | `paypal` | `cash` | `wire`

**Payment statuses:** `pending` | `completed` | `failed` | `refunded`

#### `GET /stripe/status`
Get current subscription payment status for the user.

#### `POST /stripe/create-checkout-session`
Create a Stripe checkout session. Opens in a browser WebView.
```json
{ "priceId": "price_xxx" }  // optional override
```

#### `GET /stripe/confirm-checkout-session?session_id=[id]`
Confirm result of a Stripe checkout.

#### `GET /stripe/get-subscription`
Get current Stripe subscription details.

#### `POST /stripe/cancel-subscription`
Request cancellation (takes effect at end of billing period).

#### `POST /stripe/undo-cancel-subscription`
Reactivate a pending cancellation.

#### `GET /stripe/customer-portal`
Get URL to Stripe customer portal (redirect in WebView).

#### `GET /stripe/demo`
Check if demo mode is enabled.

---

## 13. Membership Fee Settings

#### `GET /settings/membership-fees/public`
Public endpoint — returns fee configuration per level.

```json
{
  "Full": 45,
  "Student": 25,
  "Associate": 25,
  "Corporate": 125,
  "Honorary": 0
}
```

---

## 14. Error Handling

All errors return JSON:
```json
{ "error": "Description of what went wrong", "details": "Optional context" }
```

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Forbidden (no permission) |
| 404 | Not found |
| 500 | Server error |

---

## 15. Common App Flows

### Login Flow
```
1. supabase.gotrue.loginWith(Email) { email, password }
2. Read access token from session
3. GET /api/profile (Authorization: Bearer <token>) → check status and subscription
4. If status === 'pending' and missing fields → show profile completion
5. If no subscription (and not Honorary) → show payment screen
6. Otherwise → show dashboard
```

### View & Interact with Discussions
```
1. GET /threads → list all threads
2. GET /threads/[id] → view thread + comments
3. POST /reactions { thread_id, reaction_type: 'like' } → toggle like
4. POST /threads/[id]/comments { content } → post comment
5. GET /notifications?unread_only=true → poll for new notifications
6. PATCH /notifications { thread_id } → mark thread notifications read
```

### Event RSVP
```
1. GET /events → list events with rsvp_count, user_rsvped
2. POST /events/[id]/rsvp → RSVP
3. DELETE /events/[id]/rsvp → cancel RSVP
4. GET /events/[id]/ical → download .ics for native calendar
```

### Upload Image in Thread/Comment
```
1. POST /threads/upload-image (multipart: file) → { url }
2. Include url in image_urls[] when creating thread or comment
```

---

## 16. Data Types Reference

### `MembershipLevel`
`"Full" | "Student" | "Associate" | "Corporate" | "Honorary"`

### `MemberStatus`
`"pending" | "approved" | "rejected" | "expired"`

### `UserRole`
`"member" | "admin"`

### `ResourceType`
`"link" | "document" | "video" | "other"`

### `ResourceCategory`
`"tipa_newsletters" | "airport_updates" | "reminder" | "other"`

### `DiscussionCategory`
`"introduce_yourself" | "aircraft_shares" | "instructor_availability" | "gear_for_sale" | "flying_at_ytz" | "general_aviation" | "training_safety_proficiency" | "wanted" | "building_a_better_tipa" | "other"`

### `ReactionType`
`"like"` (only type currently supported)

### `PaymentMethod`
`"stripe" | "paypal" | "cash" | "wire"`

### `PaymentStatus`
`"pending" | "completed" | "failed" | "refunded"`

### `NotificationType`
`"reply" | "mention"`

---

## 17. Notes for KMP Implementation

- **Content fields** (`content`, `description` in threads/comments/resources) are **HTML strings**. Use a WebView or an HTML-to-Kotlin rendering library.
- **`interests`** on the user profile is stored as a **JSON-encoded string** (e.g., `"[\"flying\",\"navigation\"]"`). Parse it client-side.
- **Signed URLs** for images/files expire after **1 hour**. Do not persist these; refetch as needed.
- **Polling for notifications**: There is no WebSocket — poll `GET /notifications?unread_only=true` on an interval (e.g., every 60 seconds) while the app is in the foreground.
- **Stripe checkout** should be handled via a WebView or an in-app browser (Custom Tabs on Android / SFSafariViewController on iOS).
- **iCal export** returns raw `.ics` file content — use the platform's calendar API to import it natively.
- **Image uploads** use `multipart/form-data` with a field named `file`.
- **Admin role** (`role === 'admin'`) has access to additional admin-only endpoints not listed here. Mobile app is intended for regular members only.
