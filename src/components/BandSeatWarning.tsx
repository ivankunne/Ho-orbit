import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { fetchMyBandSeats, type BandSeats } from '@services/bandSeatService';

/**
 * Waarschuwing in BandSpace zelf: je hebt meer bandleden dan je abonnement
 * dekt, en op die datum gaan de laatst toegevoegde leden op non-actief.
 *
 * Het ophalen is hier niet vrijblijvend — my_band_seats() voert een verstreken
 * afschaaldatum alsnog uit en haalt geschorste leden terug zodra er weer
 * ruimte is. Daarom hangt dit aan de BandSpace-overzichtspagina en niet aan
 * een scherm dat zelden bezocht wordt.
 */
export default function BandSeatWarning() {
  const [seats, setSeats] = useState<BandSeats | null>(null);

  useEffect(() => { fetchMyBandSeats().then(setSeats); }, []);

  if (!seats) return null;

  const over = Math.max(0, seats.used - seats.allowance);
  if (!seats.downgrade_at && !seats.suspended) return null;

  const date = seats.downgrade_at
    ? new Date(seats.downgrade_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
    : null;

  return (
    <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 flex gap-3">
      <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        {date ? (
          <p className="text-sm text-amber-100 leading-relaxed">
            Je band wordt binnenkort teruggezet: je hebt {over} {over === 1 ? 'lid' : 'leden'} meer dan je
            abonnement dekt. Op <strong>{date}</strong> {over === 1 ? 'wordt het laatst toegevoegde lid' : `worden de ${over} laatst toegevoegde leden`}{' '}
            op non-actief gezet.
          </p>
        ) : (
          <p className="text-sm text-amber-100 leading-relaxed">
            {seats.suspended} {seats.suspended === 1 ? 'bandlid staat' : 'bandleden staan'} op non-actief omdat
            je abonnement minder plekken dekt dan er leden zijn.
          </p>
        )}
        <p className="text-xs text-amber-200/80 mt-1">
          Er wordt niemand verwijderd — zodra er weer plek is, komen ze vanzelf terug.{' '}
          <Link to="/account" className="font-semibold underline underline-offset-2 hover:text-amber-100">
            Plekken bijkopen
          </Link>
        </p>
      </div>
    </div>
  );
}
