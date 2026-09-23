import { useEffect, useState } from 'react';
import { Users, Loader, Minus, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@components/ui/button';
import { useToast } from '@components/Toast';
import { fetchMyBandSeats, setExtraSeats, type BandSeats } from '@services/bandSeatService';

const SEAT_PRICE_LABEL = '€ 2,50 per maand';

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Stoelenbeheer op de abonnementspagina. Vijf plekken zitten in Pro; wie meer
 * bandleden wil, koopt ze hier bij.
 *
 * De knoppen praten met Stripe (stripe-seats), niet rechtstreeks met de
 * database — profiles.extra_seats wordt alleen door de webhook geschreven, en
 * dat moet zo blijven: anders kan het aantal stoelen uit de pas lopen met wat
 * er daadwerkelijk gefactureerd wordt.
 */
export default function BandSeatsCard() {
  const addToast = useToast();
  const [seats, setSeats] = useState<BandSeats | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchMyBandSeats().then(setSeats); }, []);

  if (!seats) {
    return (
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 flex items-center gap-2 text-sm text-slate-500">
        <Loader size={14} className="animate-spin" /> Plekken laden…
      </div>
    );
  }

  const target = pending ?? seats.extra;
  const dirty = target !== seats.extra;
  // Je kunt niet minder stoelen overhouden dan er mensen in je bands zitten
  // zónder dat er iemand uit moet; dat mag, maar dan wel met open vizier.
  const wouldSuspend = Math.max(0, seats.used - (seats.included + target));
  const downgradeDate = formatDate(seats.downgrade_at);

  async function save() {
    setSaving(true);
    try {
      setSeats(await setExtraSeats(target));
      setPending(null);
      addToast('Plekken bijgewerkt', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Bijwerken mislukt', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
          <Users size={16} className="text-violet-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-white font-semibold text-sm">BandSpace-plekken</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {seats.included} plekken zitten in Pro. Elke plek daarboven kost {SEAT_PRICE_LABEL}.
          </p>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-bold text-white">{seats.used}</span>
        <span className="text-sm text-slate-500">van {seats.allowance} plekken in gebruik</span>
      </div>

      {downgradeDate && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 flex gap-2">
          <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200 leading-relaxed">
            Je hebt meer bandleden dan je abonnement dekt. Op <strong>{downgradeDate}</strong> worden de{' '}
            {Math.max(0, seats.used - seats.allowance)} laatst toegevoegde leden op non-actief gezet. Koop
            plekken bij of verwijder zelf leden om dat te voorkomen — niemand wordt verwijderd, en zodra er
            weer ruimte is komen ze vanzelf terug.
          </p>
        </div>
      )}

      {seats.suspended > 0 && (
        <p className="mb-4 text-xs text-slate-500">
          {seats.suspended} {seats.suspended === 1 ? 'lid staat' : 'leden staan'} op non-actief. Koop een plek bij
          om {seats.suspended === 1 ? 'dit lid' : 'ze'} terug te halen.
        </p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-black/20 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setPending(Math.max(0, target - 1))}
            disabled={saving || target <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Eén plek minder"
          >
            <Minus size={14} />
          </button>
          <span className="w-10 text-center text-sm font-semibold text-white tabular-nums">+{target}</span>
          <button
            type="button"
            onClick={() => setPending(target + 1)}
            disabled={saving || target >= 50}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Eén plek meer"
          >
            <Plus size={14} />
          </button>
        </div>

        {dirty && (
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? <Loader size={14} className="animate-spin" /> : null}
            Opslaan
          </Button>
        )}
      </div>

      {dirty && wouldSuspend > 0 && (
        <p className="mt-3 text-xs text-amber-300">
          Met {target} extra {target === 1 ? 'plek' : 'plekken'} passen er {wouldSuspend}{' '}
          {wouldSuspend === 1 ? 'lid' : 'leden'} niet meer bij. Je krijgt eerst een waarschuwing met een datum;
          er wordt niemand direct verwijderd.
        </p>
      )}
      {dirty && wouldSuspend === 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Wijzigingen worden verrekend op je eerstvolgende factuur.
        </p>
      )}
    </div>
  );
}
