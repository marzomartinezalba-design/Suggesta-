# Firebase Security Specification - Suggesta

## Data Invariants
1. **Items**: Only admins can create/update items (or they are system-generated). Actually, for this app, items might be added by users too? No, usually they are searched via Gemini. Let's assume users can suggest items if they don't exist.
2. **Reviews**: A user can only create/update/delete their own reviews. `userId` must match `request.auth.uid`.
3. **Recommendations**: A user can only create/update/delete their own recommendations. `userId` must match `request.auth.uid`.
4. **Profiles**: A user can only read/write their own profile.

## The Dirty Dozen (Attacks)
1. **Identity Theft**: User A tries to create a review using User B's `userId`.
2. **Review Bombing**: User A tries to update User B's review.
3. **Ghost Review**: Create a review for a non-existent item.
4. **Shadow Field**: Adding `isAdmin: true` to a profile update.
5. **PII Leak**: User A tries to read User B's private profile.
6. **ID Poisoning**: Using a 1MB string as a document ID.
7. **Type Mismatch**: Sending a string for a rating.
8. **Blanket Read**: Trying to query all reviews without a filter.
9. **Outcome Tampering**: Changing the `createdAt` timestamp to the future.
10. **Resource Poisoning**: Sending a huge description string.
11. **Relational Breach**: Adding a recommendation where `sourceItemId` doesn't exist.
12. **Improper Authorization**: Unauthenticated user trying to post a review.

## Test Runner (Planned)
I will implement `firestore.rules.test.ts` to verify these.
