export interface ProfitCostInputs {
  gage: number | null;
  travel_cost: number | null;
  other_costs: number | null;
}

export interface ProfitCalculation {
  totalProfit: number;
  perMemberEqual: number;
}

// Pure — no Supabase dependency, so the UI can recompute this on every
// keystroke without a round trip. Equal splits are never persisted; only
// manual per-member amounts are (band_event_profit_splits).
export function calculateEventProfit(event: ProfitCostInputs, activeMemberCount: number): ProfitCalculation {
  const totalProfit = (event.gage ?? 0) - (event.travel_cost ?? 0) - (event.other_costs ?? 0);
  const perMemberEqual = activeMemberCount > 0 ? totalProfit / activeMemberCount : 0;
  return { totalProfit, perMemberEqual };
}

export function formatEuro(amount: number): string {
  return amount.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });
}
