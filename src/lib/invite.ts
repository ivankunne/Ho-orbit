// A pending band invite is stashed here so the join survives an
// email-confirmation round-trip (register → confirm → return to the app).
// Shared by JoinBandPage (writes/redeems in-page) and InviteResumer
// (redeems app-wide once the user is authenticated).
export const PENDING_INVITE_KEY = 'ho_pending_invite';
