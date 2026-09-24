# Security Specification & Threat Model

## Data Invariants
1. Orders must have valid, constrained identifiers, customer emails, and valid price values.
2. Orders can only be read by the authenticated buyer whose UID matches `userId` or whose verified email matches `customerEmail`.
3. Orders cannot be deleted by clients.
4. User security settings can only be accessed or modified by the authenticated user themselves (`request.auth.uid == userId`).
5. Product catalog items are publicly readable by signed-in users, but can only be modified by admins or backend processes.

## The Dirty Dozen Payloads (Rejection Matrix)
1. Ghost field injection on Order (`isSuperAdmin: true`) -> REJECTED
2. Client attempting to read another customer's order -> REJECTED
3. Unauthenticated read of order data -> REJECTED
4. Tampering with `userId` to claim someone else's order -> REJECTED
5. Malformed string ID (>128 chars or special injection characters) -> REJECTED
6. Client attempting to overwrite `orderId` on update -> REJECTED
7. Negative or non-numeric purchase amount -> REJECTED
8. Non-owner trying to toggle 2FA on another user's profile -> REJECTED
9. Blanket list query attempt without matching buyer UID or email -> REJECTED
10. Setting invalid enum for `assetType` (e.g., `exe_virus`) -> REJECTED
11. Spoofed email address without matching verified token -> REJECTED
12. Attempt to delete existing order records -> REJECTED
