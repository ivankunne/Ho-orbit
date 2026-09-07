// Re-exported from PaywallContext — this used to be a standalone hook that
// each consumer subscribed independently, which crashed once more than one
// was mounted at once (two realtime channels sharing one name). Now backed
// by a single provider-level subscription; every existing import site keeps
// working unchanged.
export { usePaywallSettings } from '@context/PaywallContext';
