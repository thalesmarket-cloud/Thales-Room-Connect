# Security Specification - Thalès Room Connect

## Data Invariants
1. A reservation MUST have a valid `roomId` that exists in the `rooms` collection.
2. A reservation `startTime` MUST be before its `endTime`.
3. A user can only create a reservation if they are authenticated and verified (corporate email).
4. Only the `organizerId` can update or delete their own reservations.
5. New reservations MUST NOT overlap with existing ones for the same room (Note: Firestore rules have limited cross-document querying, so we'll enforce what we can and use client-side checks for overlaps, though rules can check specific overlaps if IDs are predictable, but here we use random IDs).

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a reservation with someone else's `organizerId`.
2. **Time Warp**: Creating a reservation where `endTime` < `startTime`.
3. **Ghost Room**: Reserving a room that doesn't exist.
4. **Admin Escalation**: Attempting to set an `isAdmin` flag on a user profile (if we had one).
5. **PII Leak**: Unauthorized user attempting to read private organizer details (if restricted).
6. **Double Booking Bypass**: (Hard to block fully in rules without `getDocs`, but we check individual doc states).
7. **Negative Time**: `startTime` or `endTime` in the past (if forbidden).
8. **Shadow Fields**: Adding `isApproved: true` to a reservation to bypass workflow.
9. **Spam IDs**: Document IDs with 1MB of junk characters.
10. **Modification Hijack**: User B updating User A's reservation.
11. **Timestamp Forgery**: Providing a client-side `createdAt` that isn't `request.time`.
12. **Unverified Auth**: Authenticated user but with an unverified email.

## Firestore Rules Pattern

We will use the "Master Gate" and "Action-Based" patterns.
