export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Algemene Voorwaarden</h1>
      <p className="text-sm text-slate-500 mb-10">Laatst bijgewerkt: mei 2025</p>

      <div className="prose-legal">

        <Section title="1. Definities">
          <ul>
            <li><strong>H-orbit:</strong> het online muziekplatform bereikbaar via h-orbit.nl.</li>
            <li><strong>Gebruiker:</strong> iedere natuurlijke of rechtspersoon die gebruik maakt van H-orbit, al dan niet na registratie.</li>
            <li><strong>Inhoud:</strong> muziekopnamen, teksten, afbeeldingen, berichten en andere bestanden die gebruikers plaatsen of uploaden.</li>
            <li><strong>Account:</strong> de persoonlijke omgeving die een gebruiker aanmaakt door te registreren.</li>
          </ul>
        </Section>

        <Section title="2. Toepasselijkheid">
          <p>
            Deze algemene voorwaarden zijn van toepassing op elk gebruik van H-orbit, inclusief het bezoeken van de website, het aanmaken van een account, het uploaden van inhoud en deelname aan community-functies. Door gebruik te maken van H-orbit gaat u akkoord met deze voorwaarden.
          </p>
        </Section>

        <Section title="3. Account">
          <ul>
            <li>U dient minimaal <strong>16 jaar</strong> oud te zijn om een account aan te maken. Bent u jonger dan 16 jaar, dan is toestemming van een ouder of wettelijk vertegenwoordiger vereist.</li>
            <li>U bent verantwoordelijk voor de vertrouwelijkheid van uw inloggegevens en voor alle activiteiten die onder uw account plaatsvinden.</li>
            <li>Elk account is persoonlijk en mag niet worden overgedragen aan een derde.</li>
            <li>U dient bij registratie correcte gegevens op te geven.</li>
          </ul>
        </Section>

        <Section title="4. Gebruik van het platform">
          <p>Het is niet toegestaan om via H-orbit:</p>
          <ul>
            <li>Inhoud te plaatsen die inbreuk maakt op auteursrechten, naburige rechten of andere intellectuele-eigendomsrechten van derden.</li>
            <li>Inhoud te plaatsen die diffamerend, beledigend, discriminerend, haatdragend, bedreigend of anderszins onrechtmatig is.</li>
            <li>Spam, malware, virussen of andere schadelijke software te verspreiden.</li>
            <li>Automatische tools (bots, scrapers) in te zetten zonder voorafgaande schriftelijke toestemming.</li>
            <li>De werking van het platform te verstoren of de beveiliging te omzeilen.</li>
            <li>Persoonsgegevens van andere gebruikers te verzamelen of te misbruiken.</li>
          </ul>
        </Section>

        <Section title="5. Intellectueel eigendom">
          <p>
            <strong>Uw inhoud:</strong> U behoudt alle intellectuele-eigendomsrechten op de inhoud die u uploadt. Door inhoud te plaatsen op H-orbit verleent u H-orbit een kosteloze, niet-exclusieve, wereldwijde licentie om die inhoud te hosten, weer te geven en beschikbaar te stellen op het platform, uitsluitend ten behoeve van de werking van H-orbit.
          </p>
          <p>
            <strong>Platform:</strong> Alle overige inhoud op H-orbit — waaronder ontwerp, teksten, logo's en software — is eigendom van H-orbit of haar licentiegevers en is beschermd door intellectuele-eigendomsrechten. Het is niet toegestaan deze inhoud te kopiëren of te gebruiken zonder voorafgaande schriftelijke toestemming.
          </p>
        </Section>

        <Section title="6. Auteursrecht en DMCA/Notice & Takedown">
          <p>
            H-orbit respecteert intellectuele-eigendomsrechten. Als u van mening bent dat via H-orbit inbreuk wordt gemaakt op uw auteursrechten, kunt u een melding sturen naar{' '}
            <a href="mailto:info@h-orbit.nl" className="text-violet-400 hover:underline">info@h-orbit.nl</a>{' '}
            met daarin: uw contactgegevens, een beschrijving van het beschermde werk, de locatie van de inbreuk, en een verklaring dat de melding te goeder trouw wordt gedaan. Wij handelen meldingen af conform de geldende wetgeving.
          </p>
        </Section>

        <Section title="7. Aansprakelijkheid">
          <p>H-orbit is niet aansprakelijk voor:</p>
          <ul>
            <li>Inhoud die door gebruikers wordt geplaatst. De gebruiker is hiervoor zelf verantwoordelijk.</li>
            <li>Tijdelijke onbeschikbaarheid of technische storingen van het platform.</li>
            <li>Schade als gevolg van ongeautoriseerde toegang tot uw account, tenzij dit aan H-orbit te wijten is.</li>
            <li>Indirecte schade, gevolgschade of gederfde winst.</li>
          </ul>
          <p>
            De aansprakelijkheid van H-orbit is in alle gevallen beperkt tot het bedrag dat u de afgelopen twaalf maanden aan H-orbit heeft betaald, of — als u geen betalende gebruiker bent — tot € 100.
          </p>
        </Section>

        <Section title="8. Verwijdering van inhoud en accountopschorting">
          <p>
            H-orbit behoudt het recht inhoud te verwijderen of accounts te blokkeren of te verwijderen indien:
          </p>
          <ul>
            <li>De inhoud of het gedrag in strijd is met deze voorwaarden of met de wet.</li>
            <li>Een gerechtelijke autoriteit of toezichthouder dit vereist.</li>
            <li>De veiligheid of integriteit van het platform of andere gebruikers in gevaar komt.</li>
          </ul>
          <p>Wij streven ernaar u hiervan vooraf op de hoogte te stellen, tenzij dit niet mogelijk is.</p>
        </Section>

        <Section title="9. Beëindiging">
          <p>
            U kunt uw account op elk moment verwijderen via de accountinstellingen. Na verwijdering worden uw persoonsgegevens verwerkt conform ons <a href="/privacy" className="text-violet-400 hover:underline">Privacybeleid</a>.
          </p>
        </Section>

        <Section title="10. Toepasselijk recht en bevoegde rechter">
          <p>
            Op deze algemene voorwaarden is <strong>Nederlands recht</strong> van toepassing. Geschillen die voortvloeien uit of verband houden met deze voorwaarden worden voorgelegd aan de bevoegde rechter te Amsterdam, tenzij dwingende wetgeving een andere rechter voorschrijft.
          </p>
        </Section>

        <Section title="11. Wijzigingen">
          <p>
            H-orbit behoudt het recht deze voorwaarden te wijzigen. Geregistreerde gebruikers worden minimaal 30 dagen van tevoren per e-mail geïnformeerd over ingrijpende wijzigingen. Voortgezet gebruik van het platform na de ingangsdatum geldt als aanvaarding van de gewijzigde voorwaarden.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Voor vragen over deze voorwaarden kunt u contact opnemen via{' '}
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
