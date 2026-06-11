# Debug Log

For each bug you find, fill in an entry below. Be specific about what was broken and how you found it.

For bugs discovered using browser DevTools, include a screenshot.

---

## Bug 1

**File:** `backend/controllers/authController.js`

**What was wrong:**  
JWT tokens were being generated using `process.env.ROTTO_JWT_SECRET` while the authentication middleware was verifying tokens using `process.env.JWT_SECRET`. This caused all authenticated routes to fail after login.

**How you found it:**  
Users could log in successfully and receive a token, but every protected endpoint returned `401 Unauthorized`.

**What you changed:**  
Standardized token generation and verification to use:

```js
process.env.JWT_SECRET
```

across the entire application.

---

## Bug 2

**File:** `backend/controllers/bookingController.js`

**What was wrong:**  
Pagination skip calculation was incorrect.

```js
const skip = page * limit;
```

caused the first page of bookings to skip records.

**How you found it:**  
Bookings were successfully created but did not appear on the first page.

**What you changed:**  

```js
const skip = (page - 1) * limit;
```

so pagination starts correctly from page one.

---

## Bug 3

**File:** `backend/models/Booking.js`

**What was wrong:**  
`userId` was stored as a string rather than a MongoDB ObjectId reference.

```js
userId: {
  type: String
}
```

**How you found it:**  
Population and filtering operations behaved inconsistently and relationships between users and bookings were not functioning properly.

**What you changed:**  

```js
userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
}
```

to properly establish MongoDB references.

---

## Bug 4

**File:** `frontend/lib/api.ts`

**What was wrong:**  
Authorization header was being sent incorrectly.

```js
headers['Authorization'] = token;
```

instead of the expected Bearer token format.

**How you found it:**  
Protected API endpoints consistently returned unauthorized responses despite valid login sessions.

**What you changed:**  

```js
headers['Authorization'] = `Bearer ${token}`;
```

and improved API response handling.

---

## Bug 5

**File:** `frontend/hooks/useAuth.ts`

**What was wrong:**  
The authentication hook was reading from:

```js
localStorage.getItem('auth_token')
```

while login stored the token under:

```js
TOKEN_KEY = 'rotto_token'
```

This caused users to be logged out after page refresh.

**How you found it:**  
Authentication worked immediately after login but failed after refreshing the browser.

**What you changed:**  
Replaced:

```js
localStorage.getItem('auth_token')
```

with:

```js
localStorage.getItem(TOKEN_KEY)
```

and ensured logout removes the correct key.

**Screenshot:**  
Browser Application → Local Storage showing token stored under `rotto_token`.

---

## Bug 6

**File:** `backend/controllers/carController.js`

**What was wrong:**  
All CRUD operations for cars were left unimplemented as TODOs.

**How you found it:**  
The Add Car form submitted successfully but no records were created or returned.

**What you changed:**  
Implemented:

- `createCar()`
- `getMyCars()`
- `getCarById()`
- `updateCar()`
- `deleteCar()`

including ownership checks, duplicate registration validation, and booking dependency checks before deletion.

**Screenshot:**  
Network tab showing successful `POST /api/cars` returning `201 Created`.

---

## Bug 7

**File:** `frontend/app/cars/page.tsx`

**What was wrong:**  
Core frontend functionality was incomplete.

The following methods were still TODOs:

```tsx
fetchCars()
handleAddCar()
handleDeleteCar()
```

**How you found it:**  
Cars page loaded but displayed no data and form actions had no effect.

**What you changed:**  

Implemented:

- Fetching cars from API
- Creating cars
- Deleting cars
- Updating local state after mutations
- Error handling and loading states

**Screenshot:**  
Cars page displaying newly created vehicles without requiring a refresh.

---

## Bug 8

**File:** `frontend/app/bookings/page.tsx`

**What was wrong:**  
Booking functionality was incomplete.

The following methods were TODOs:

```tsx
fetchBookings()
fetchCars()
handleCreateBooking()
```

The booking form dropdown displayed no available vehicles.

**How you found it:**  
Cars existed in the database but the booking modal showed an empty dropdown.

**What you changed:**  

Implemented:

- Booking retrieval
- Car retrieval
- Booking creation
- Pagination support
- State refresh after booking creation

Also ensured the car dropdown loads user vehicles correctly.

**Screenshot:**  
Booking modal displaying user vehicles and successfully creating bookings.

---

## Hard Feature

**Option chosen:**  
Service Booking Management

**Approach:**  

Implemented the booking workflow that was left incomplete in the starter code.

The work included:

- Creating service bookings
- Displaying user bookings
- Loading user cars for booking selection
- Dashboard statistics (cars, bookings, pending bookings)
- Connecting bookings with cars using MongoDB relationships

The goal was to make the booking flow functional from end to end, allowing users to add cars, create bookings, view their booking history, and track booking status.