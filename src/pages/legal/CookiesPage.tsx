export default function CookiesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Cookiebeleid</h1>
      <p className="text-sm text-slate-500 mb-10">Laatst bijgewerkt: mei 2025</p>

      <div className="prose-legal">

        <Section title="1. Wat zijn cookies?">
          <p>
            Cookies zijn kleine tekstbestanden die door een website op uw apparaat worden geplaatst wanneer u die website bezoekt. Ze worden gebruikt om het platform goed te laten functioneren en uw voorkeuren te onthouden.
          </p>
        </Section>

        <Section title="2. Welke cookies gebruikt H-orbit?">
          <p>H-orbit maakt uitsluitend gebruik van <strong>functionele en voorkeurscookies</strong>. Wij plaatsen geen tracking-, marketing- of advertentiecookies.</p>

          <div className="mt-4 rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Cookie</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Doel</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Bewaartermijn</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="px-4 py-3 text-slate-300 font-mono">sb-*-auth-token</td>
                  <td className="px-4 py-3 text-slate-400">Inlogsessie bijhouden (Supabase authenticatie)</td>
                  <td className="px-4 py-3 text-slate-400">Tot uitloggen of 7 dagen</td>
                  <td className="px-4 py-3"><span className="bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full text-[10px] font-semibold">Functioneel</span></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-300 font-mono">h-orbit-theme</td>
                  <td className="px-4 py-3 text-slate-400">Themavoorkeur onthouden (donker/licht)</td>
                  <td className="px-4 py-3 text-slate-400">1 jaar</td>
                  <td className="px-4 py-3"><span className="bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded-full text-[10px] font-semibold">Voorkeur</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="3. Geen tracking of advertenties">
          <p>
            H-orbit maakt <strong>geen</strong> gebruik van cookies of vergelijkbare technologieën voor het volgen van uw online gedrag over meerdere websites, het opstellen van profielen voor advertentiedoeleinden, of sociale media-tracking.
          </p>
        </Section>

        <Section title="4. Wettelijke basis">
          <p>
            Op grond van de <strong>Telecommunicatiewet</strong> (art. 11.7a, de Nederlandse implementatie van de ePrivacy-richtlijn) en de AVG geldt het volgende:
          </p>
          <ul>
            <li>Voor <strong>strikt noodzakelijke cookies</strong> (zoals de authenticatiecookie) is geen voorafgaande toestemming vereist. Deze cookies zijn onmisbaar voor de werking van het platform.</li>
            <li>Voor <strong>voorkeurscookies</strong> (zoals de thema-instelling) geldt uw impliciete toestemming door gebruik te maken van het platform.</li>
          </ul>
        </Section>

        <Section title="5. Cookies beheren of weigeren">
          <p>
            U kunt cookies beheren via de instellingen van uw browser. De meeste browsers bieden de mogelijkheid om cookies te blokkeren of te verwijderen. Hieronder vindt u links naar de cookiebeheer-instructies van veelgebruikte browsers:
          </p>
          <ul>
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/nl/kb/cookies-verwijderen-gegevens-wissen-websites-opgeslagen" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/nl-nl/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">Apple Safari</a></li>
            <li><a href="https://support.microsoft.com/nl-nl/windows/cookies-verwijderen-en-beheren-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">Microsoft Edge</a></li>
          </ul>
          <p className="mt-2">
            Let op: het blokkeren van functionele cookies kan ervoor zorgen dat u niet kunt inloggen of dat het platform niet correct functioneert.
          </p>
        </Section>

        <Section title="6. Meer informatie">
          <p>
            Voor meer informatie over hoe wij omgaan met uw gegevens verwijzen wij u naar ons{' '}
            <a href="/privacy" className="text-violet-400 hover:underline">Privacybeleid</a>.
            Voor vragen over cookies kunt u contact opnemen via{' '}
            <a href="mailto:info@h-orbit.nl" className="text-violet-400 hover:underline">info@h-orbit.nl</a>.
          </p>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/8">{title}</h2>
      <div className="space-y-3 text-sm text-slate-400 leading-relaxed">{children}</div>
    </section>
  );
}
