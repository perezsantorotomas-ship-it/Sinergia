# Security Specification for Sinergia B2B

## Data Invariants
1. **User Profiles**: Only the owner can modify their own profile. Anyone authenticated can read user profiles (for exploration).
2. **Chats**: Only participants can read or write to a chat. Chat IDs are derived from participant UIDs.
3. **Messages**: Only chat participants can read messages. Only the sender can create a message. Messages are immutable once created.
4. **Reviews**: Anyone can read reviews. Only Premium users can create reviews. Reviews are immutable.

## The "Dirty Dozen" Payloads (Unauthorized Attempts)
1. Edit another user's `companyName`.
2. Escalate own account to `isPremium: true` without payment.
3. Read messages from a chat the user is not part of.
4. Send a message to a chat the user is not part of.
5. Create a review as a non-premium user.
6. Create a message as another user.
7. Mutate a message after creation.
8. Inject a massive string (1MB+) into `description`.
9. Delete a chat that belongs to others.
10. Spoof `authorId` in a review.
11. List all users' `openRouterKey`. (Note: OpenRouterKey should be private).
12. Create a user with a spoofed UID.

## Test Runner (Conceptual)
All tests must verify `PERMISSION_DENIED` for the above payloads.
