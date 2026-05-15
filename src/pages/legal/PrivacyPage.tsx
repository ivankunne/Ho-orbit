export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Privacybeleid</h1>
      <p className="text-sm text-slate-500 mb-10">Laatst bijgewerkt: mei 2025</p>

      <div className="prose-legal">

        <Section title="1. Wie zijn wij?">
          <p>
            H-orbit is een Nederlands muziekplatform voor de ontdekking en deling van muziek, evenementen en community-activiteiten. Voor vragen over uw persoonsgegevens kunt u contact opnemen via{' '}
            <a href="mailto:privacy@h-orbit.nl" className="text-violet-400 hover:underline">privacy@h-orbit.nl</a>.
          </p>
        </Section>

        <Section title="2. Welke persoonsgegevens verwerken wij?">
          <SubTitle>2.1 Accountgegevens</SubTitle>
          <ul>
            <li>E-mailadres</li>
            <li>Gebruikersnaam en weergavenaam</li>
            <li>Profielfoto (indien geüpload)</li>
            <li>Biografie, genre en locatie (indien ingevuld)</li>
          </ul>
          <SubTitle>2.2 Door u gedeelde inhoud</SubTitle>
          <ul>
            <li>Muziekopnamen en bijbehorende metadata (titel, genre, omschrijving)</li>
            <li>Berichten in forumthreads, bandruimtes en privégesprekken</li>
            <li>Posts op het Netwerken-platform (Wanted, Open Calls, e.d.)</li>
            <li>Reacties op evenementen en RSVP-gegevens</li>
          </ul>
          <SubTitle>2.3 Technische gegevens</SubTitle>
          <ul>
            <li>IP-adres (voor beveiliging en fraudepreventie)</li>
            <li>Browsertype en apparaatinformatie</li>
            <li>Loggegevens (tijdstip van inloggen, paginabezoeken)</li>
          </ul>
        </Section>

        <Section title="3. Doeleinden en grondslagen">
          <p>Wij verwerken uw persoonsgegevens uitsluitend voor de volgende doeleinden en op basis van de volgende grondslagen (art. 6 AVG):</p>
          <table>
            <thead>
              <tr><th>Doeleinde</th><th>Grondslag</th></tr>
            </thead>
            <tbody>
              <tr><td>Aanmaken en beheren van uw account</td><td>Uitvoering van overeenkomst</td></tr>
              <tr><td>Weergave van uw muziek en inhoud</td><td>Uitvoering van overeenkomst</td></tr>
              <tr><td>Communicatie over uw account</td><td>Uitvoering van overeenkomst</td></tr>
              <tr><td>Beveiliging en fraudepreventie</td><td>Gerechtvaardigd belang</td></tr>
              <tr><td>Verbetering van het platform</td><td>Gerechtvaardigd belang</td></tr>
              <tr><td>Functionele cookies (sessie)</td><td>Gerechtvaardigd belang / noodzakelijkheid</td></tr>
            </tbody>
          </table>
        </Section>

        <Section title="4. Bewaartermijnen">
          <p>Wij bewaren uw persoonsgegevens niet langer dan noodzakelijk voor het doel waarvoor ze zijn verzameld:</p>
          <ul>
            <li><strong>Accountgegevens:</strong> zolang uw account actief is, plus maximaal 30 dagen na verwijdering van uw account.</li>
            <li><strong>Berichten en geplaatste inhoud:</strong> zolang uw account actief is. Na verwijdering worden uw gegevens geanonimiseerd of verwijderd.</li>
            <li><strong>Technische loggegevens:</strong> maximaal 90 dagen.</li>
          </ul>
        </Section>

        <Section title="5. Delen met derden">
          <SubTitle>5.1 Verwerkers</SubTitle>
          <p>
            Wij maken gebruik van <strong>Supabase</strong> voor database-opslag en authenticatie. Supabase treedt op als verwerker in de zin van art. 28 AVG. Met Supabase is een verwerkersovereenkomst gesloten. Gegevens kunnen worden opgeslagen op servers binnen of buiten de Europese Economische Ruimte (EER); in het laatste geval zijn aanvullende waarborgen van toepassing (zoals Standaard Contractuele Bepalingen).
          </p>
          <SubTitle>5.2 Geen verkoop van gegevens</SubTitle>
          <p>Wij verkopen uw persoonsgegevens nooit aan derden en delen ze niet met partijen voor reclamedoeleinden.</p>
          <SubTitle>5.3 Wettelijke verplichtingen</SubTitle>
          <p>Wij kunnen persoonsgegevens verstrekken aan bevoegde autoriteiten indien wij daartoe wettelijk verplicht zijn.</p>
        </Section>

        <Section title="6. Uw rechten">
          <p>Op grond van de Algemene Verordening Gegevensbescherming (AVG) heeft u de volgende rechten:</p>
          <ul>
            <li><strong>Recht op inzage</strong> (art. 15 AVG) — U kunt opvragen welke persoonsgegevens wij van u verwerken.</li>
            <li><strong>Recht op rectificatie</strong> (art. 16 AVG) — U kunt onjuiste gegevens laten corrigeren.</li>
            <li><strong>Recht op gegevenswissing</strong> (art. 17 AVG) — U kunt verzoeken uw gegevens te verwijderen.</li>
            <li><strong>Recht op beperking</strong> (art. 18 AVG) — U kunt de verwerking van uw gegevens laten beperken.</li>
            <li><strong>Recht op dataportabiliteit</strong> (art. 20 AVG) — U kunt uw gegevens in een machine-leesbaar formaat opvragen.</li>
            <li><strong>Recht van bezwaar</strong> (art. 21 AVG) — U kunt bezwaar maken tegen verwerking op basis van gerechtvaardigd belang.</li>
          </ul>
          <p>
            Dien uw verzoek in via <a href="mailto:privacy@h-orbit.nl" className="text-violet-400 hover:underline">privacy@h-orbit.nl</a>. Wij reageren binnen <strong>30 dagen</strong>. Wij kunnen u vragen uw identiteit te bevestigen voordat wij uw verzoek verwerken.
          </p>
        </Section>

        <Section title="7. Beveiliging">
          <p>
            Wij nemen passende technische en organisatorische maatregelen om uw persoonsgegevens te beschermen tegen verlies, ongeautoriseerde toegang of openbaarmaking. Dit omvat versleutelde verbindingen (TLS/HTTPS), wachtwoordhashing en strikte toegangscontrole op databaseniveau (Row Level Security).
          </p>
        </Section>

        <Section title="8. Klacht indienen">
          <p>
            Als u van mening bent dat wij uw persoonsgegevens onrechtmatig verwerken, heeft u het recht een klacht in te dienen bij de{' '}
            <a href="https://www.autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
              Autoriteit Persoonsgegevens
            </a>{' '}
            (AP), de Nederlandse toezichthoudende autoriteit voor gegevensbescherming.
          </p>
        </Section>

        <Section title="9. Wijzigingen">
          <p>
            Wij behouden het recht dit privacybeleid te wijzigen. De meest actuele versie is altijd beschikbaar op deze pagina. Bij ingrijpende wijzigingen informeren wij u via e-mail of een melding op het platform.
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

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-300 mt-5 mb-2">{children}</h3>;
}
