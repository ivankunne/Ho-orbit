/**
 * De publieke, indexeerbare kant van h-orbit.
 *
 * De app zelf zit volledig achter een login: een crawler die /muziek of
 * /artists opvraagt krijgt het inlogscherm te zien en heeft dus niets om te
 * indexeren. Deze pagina's worden bij het bouwen als echte, statische HTML
 * weggeschreven, zodat Google wél iets vindt — en zodat de zoekwoorden waar
 * beginnende Nederlandse artiesten daadwerkelijk op zoeken ergens landen.
 *
 * Elke pagina moet op zichzelf nuttig zijn. Dunne "doorway"-pagina's die
 * alleen naar de aanmeldknop wijzen, worden door Google afgestraft.
 */

/** @typedef {{ heading: string, body: string[], list?: string[] }} Section */

export const PAGES = [
  {
    slug: 'voor-artiesten',
    title: 'Muziekplatform voor beginnende artiesten in Nederland',
    description:
      'Je eerste nummer online, je eerste optreden, je eerste bandleden. Wat je als beginnende Nederlandse artiest nodig hebt om gehoord te worden — en hoe H-orbit daarbij helpt.',
    h1: 'Beginnen als artiest in Nederland',
    intro:
      'Je hebt muziek gemaakt. Nu moet iemand het horen. Dat tweede deel is voor beginnende artiesten vaak lastiger dan het eerste: de grote streamingdiensten zijn een oceaan, de lokale scene is een dorp waar je de weg nog niet kent, en niemand legt uit hoe je van het één in het ander komt. Deze pagina zet op een rij wat je eerste jaar als artiest in Nederland praktisch inhoudt.',
    sections: [
      {
        heading: 'Zorg dat je muziek ergens staat waar mensen hem tegenkomen',
        body: [
          'Een nummer dat alleen op je eigen telefoon staat, bestaat voor de buitenwereld niet. Zet je werk op een plek waar geluisterd wordt en waar je het zelf kunt beheren: titel, genre, artwork, een korte omschrijving. Op H-orbit upload je een los nummer of een heel album, koppel je er genres aan en krijg je een artiestenpagina die je overal naartoe kunt sturen.',
          'Let op de basis. Een herkenbare artiestennaam, artwork dat leesbaar blijft op een klein scherm, en een biografie van een paar zinnen die vertelt wie je bent en waar je vandaan komt. Dat laatste doet in Nederland meer dan je denkt — programmeurs van kleine podia zoeken bewust lokaal.',
        ],
      },
      {
        heading: 'Zoek je scene op, niet je publiek',
        body: [
          'Beginnende artiesten proberen vaak meteen een publiek op te bouwen. In de praktijk komt dat publiek via andere muzikanten: je speelt in het voorprogramma van iemand die je kent, je staat op een line-up omdat een bevriende band je noemde, je belandt op een release omdat je een keer hebt meegespeeld.',
          'Begin dus bij de mensen die hetzelfde doen als jij. Zoek muzikanten in je stad en je genre, ga naar optredens van bands die net iets verder zijn, en laat je zien. Op H-orbit vind je Nederlandse artiesten per genre, en kun je via Netwerken gericht zoeken naar mensen die een samenwerking of een bandlid zoeken.',
        ],
      },
      {
        heading: 'Speel live, ook als het klein is',
        body: [
          'Een half gevulde zaal in een buurthuis levert meer op dan duizend passieve streams. Je leert je set kennen, je ontmoet de mensen die de zalen programmeren, en je krijgt beeld- en geluidsmateriaal dat je weer kunt gebruiken.',
          'Nederland heeft honderden podia, dorpshuizen, cultuurcentra en broedplaatsen die ruimte geven aan beginnend werk — vaak buiten de grote steden. Bekijk het overzicht per provincie om te zien wat er bij jou in de buurt zit.',
        ],
      },
      {
        heading: 'Houd je band georganiseerd',
        body: [
          'Zodra je met meer mensen bent, gaat er tijd verloren aan afstemming: wie neemt wat mee, welke versie van het nummer repeteren we, wat staat er in de rider, wanneer is de volgende repetitie. BandSpace is de werkruimte in H-orbit waar je repetities, opnames, setlists en je technische rider op één plek zet, zodat je bandleden niet door drie chatgroepen hoeven te scrollen.',
        ],
      },
    ],
    faq: [
      {
        question: 'Kost H-orbit geld voor beginnende artiesten?',
        answer:
          'Een account aanmaken en je muziek uploaden is gratis. Er is daarnaast een Pro-abonnement met extra functies; je hebt dat niet nodig om te beginnen.',
      },
      {
        question: 'Moet ik al bij Buma/Stemra of een distributeur zitten?',
        answer:
          'Nee. Je kunt je muziek uploaden en delen zonder distributeur. Wil je dat je nummers ook op de grote streamingdiensten staan, dan regel je dat los via een distributeur — dat staat H-orbit niet in de weg.',
      },
      {
        question: 'Ik zit niet in de Randstad. Heeft dat zin?',
        answer:
          'Ja. Juist buiten de grote steden is er ruimte op podia en in dorpshuizen voor beginnend werk, en is er minder concurrentie om een plek op de line-up. Het locatie-overzicht is per provincie ingedeeld.',
      },
    ],
    related: ['muziek-uploaden', 'bandleden-vinden', 'optredens-vinden', 'muziek-promoten'],
  },

  {
    slug: 'muziek-uploaden',
    title: 'Je muziek online zetten als beginnende artiest',
    description:
      'Waar zet je je eerste nummer neer, wat heb je nodig voordat je uploadt en wat gebeurt er daarna? Een praktische uitleg voor Nederlandse artiesten die net beginnen.',
    h1: 'Je muziek online zetten',
    intro:
      'Uploaden is het makkelijke deel. Wat ervoor en erna komt bepaalt of iemand je nummer ook echt hoort. Hieronder staat wat je klaar wilt hebben voordat je op uploaden drukt, en wat je daarna met een release doet.',
    sections: [
      {
        heading: 'Wat je nodig hebt voordat je uploadt',
        body: [
          'Houd het simpel, maar sla geen stappen over. De vier dingen hieronder kosten samen een avond en schelen maanden.',
        ],
        list: [
          'Een audiobestand in fatsoenlijke kwaliteit — een gemasterde WAV of een MP3 van hoge bitrate, niet de export uit je telefoon.',
          'Artwork dat vierkant is en leesbaar blijft als het duimnagelgroot wordt getoond.',
          'Een definitieve titel en spelling van je artiestennaam. Wissel je die later, dan begin je qua vindbaarheid opnieuw.',
          'Eén of twee genres die echt kloppen. Te breed kiezen ("pop") maakt je onvindbaar; te smal kiezen ook.',
        ],
      },
      {
        heading: 'Losse nummers of een album?',
        body: [
          'Voor beginnende artiesten werkt een reeks losse singles bijna altijd beter dan één album ineens. Je houdt langer momentum, je leert per nummer wat aanslaat, en je hebt vaker een aanleiding om iets te delen. Een album heeft zin als de nummers samen iets vertellen dat los niet werkt.',
          'Op H-orbit kun je allebei: een los nummer uploaden of meerdere nummers als album bundelen, met eigen artwork en volgorde.',
        ],
      },
      {
        heading: 'Wat je doet nadat het online staat',
        body: [
          'Een release is een aanleiding, geen eindpunt. Stuur de link persoonlijk naar de mensen die hem echt gaan luisteren in plaats van hem één keer breed te posten. Vraag bevriende artiesten of ze hem in een afspeellijst zetten. Leg hem voor aan de programmeur van het podium waar je wilt spelen — een link naar een artiestenpagina met echte muziek erop is een sterker visitekaartje dan een mail zonder.',
        ],
      },
    ],
    faq: [
      {
        question: 'Welk bestandsformaat kan ik het beste uploaden?',
        answer:
          'Een gemasterde WAV of een MP3 met hoge bitrate. Upload geen bestand dat al een paar keer opnieuw is gecomprimeerd — dat hoor je.',
      },
      {
        question: 'Blijf ik eigenaar van mijn muziek?',
        answer:
          'Ja. Je uploadt je eigen werk en blijft rechthebbende; de voorwaarden beschrijven precies wat je H-orbit toestaat om ermee te doen om het te kunnen afspelen en tonen.',
      },
      {
        question: 'Kan ik een nummer later weer weghalen?',
        answer: 'Ja, je beheert je eigen uploads en kunt ze aanpassen of verwijderen.',
      },
    ],
    related: ['voor-artiesten', 'muziek-promoten', 'bandleden-vinden'],
  },

  {
    slug: 'bandleden-vinden',
    title: 'Bandleden en muzikanten vinden in Nederland',
    description:
      'Een drummer, een bassist of iemand om een track mee af te maken. Waar je in Nederland andere muzikanten vindt en hoe je een oproep schrijft waar iemand op reageert.',
    h1: 'Bandleden en muzikanten vinden',
    intro:
      'De meeste bands vallen niet uit elkaar om de muziek, maar omdat ze nooit de juiste mensen hebben gevonden. Zoeken op goed geluk in een grote chatgroep levert zelden iemand op die past. Dit helpt beter.',
    sections: [
      {
        heading: 'Wees concreet in je oproep',
        body: [
          'Een oproep als "drummer gezocht" krijgt weinig reactie omdat niemand weet of hij bedoeld wordt. Noem je genre, je stad, hoe vaak je repeteert, wat je al hebt liggen en wat je wilt bereiken. Hoe specifieker je bent, hoe minder maar hoe betere reacties je krijgt.',
        ],
        list: [
          'Genre en een paar referenties waar mensen iets bij voelen.',
          'Waar je repeteert en hoe vaak — dat filtert meteen op haalbaarheid.',
          'Wat er al is: demo\'s, opnames, optredens, een bestaande bezetting.',
          'Wat je zoekt: een vast bandlid, een sessiemuzikant of een eenmalige samenwerking.',
        ],
      },
      {
        heading: 'Zoek op wat iemand speelt, niet alleen op wie je kent',
        body: [
          'Via Netwerken op H-orbit plaats je een oproep onder Wanted, of reageer je op Jump on a Track wanneer iemand een instrument of stem zoekt voor een bestaand nummer. Dat laatste is een lage drempel om samen te werken zonder je meteen aan een band te binden — en het is de manier waarop veel vaste bezettingen alsnog ontstaan.',
          'Daarnaast kun je via de artiestenpagina\'s horen wat iemand daadwerkelijk maakt voordat je contact opneemt. Dat scheelt een hoop kennismakingsrepetities die nergens toe leiden.',
        ],
      },
      {
        heading: 'Spreek verwachtingen uit voordat je begint',
        body: [
          'Repetitiefrequentie, of er geld in gaat, wie welke nummers schrijft en wat er gebeurt als iemand stopt: onhandige gesprekken die veel makkelijker zijn aan het begin dan na een jaar. Zet de afspraken ergens vast waar iedereen ze kan teruglezen. In BandSpace staan repetities, opnames, setlists en afspraken op één plek voor de hele band.',
        ],
      },
    ],
    faq: [
      {
        question: 'Kan ik iemand zoeken voor één nummer in plaats van een vaste band?',
        answer:
          'Ja. Jump on a Track is precies daarvoor: je vraagt een muzikant of zanger om op een bestaand nummer mee te spelen, zonder dat daar een bandverbintenis aan vastzit.',
      },
      {
        question: 'Hoe weet ik of iemand goed genoeg is?',
        answer:
          'Luister eerst naar wat diegene zelf heeft geüpload. Een artiestenpagina met een paar opnames zegt meer dan een berichtje.',
      },
    ],
    related: ['voor-artiesten', 'optredens-vinden', 'muziek-uploaden'],
  },

  {
    slug: 'optredens-vinden',
    title: 'Optredens vinden als beginnende band of artiest',
    description:
      'Hoe je je eerste optredens regelt in Nederland: welke podia openstaan voor beginnend werk, wat je meestuurt en wat programmeurs daadwerkelijk willen zien.',
    h1: 'Je eerste optredens regelen',
    intro:
      'Podia zitten niet te wachten op een mail met "wij zijn een band en we willen graag spelen". Ze zoeken iets anders: een act die bij hun programma past, op een avond die ze nog moeten vullen, met genoeg bewijs dat er publiek komt. Dat kun je leveren, ook als je net begint.',
    sections: [
      {
        heading: 'Begin bij de plekken die bedoeld zijn voor beginnend werk',
        body: [
          'Niet elk podium is een poppodium. Nederland zit vol dorpshuizen, cultuurcentra, broedplaatsen en buurtinitiatieven die regelmatig live muziek programmeren en veel toegankelijker zijn voor een eerste optreden. Vaak hebben ze een vaste avond, een kleine vergoeding en een publiek dat sowieso komt.',
          'Open podia zijn de snelste ingang: je speelt drie nummers, je ontmoet de organisator en je hebt meteen beeldmateriaal. Bekijk per provincie welke locaties er bij jou in de buurt zijn.',
        ],
      },
      {
        heading: 'Wat je meestuurt',
        body: [
          'Houd het kort en compleet. Een programmeur besluit in een minuut of hij doorklikt.',
        ],
        list: [
          'Eén link naar je muziek — geen vijf.',
          'Twee zinnen over wie je bent, waar je vandaan komt en wat voor muziek het is.',
          'Een live-opname of video, ook als die met een telefoon is gemaakt.',
          'Concrete data waarop je kunt, en met hoeveel mensen je komt.',
          'Je technische rider, als je die al hebt.',
        ],
      },
      {
        heading: 'Zorg dat je klaarstaat als het balletje rolt',
        body: [
          'Afzeggingen gebeuren voortdurend en worden op het laatste moment ingevuld door wie er als eerste bruikbaar reageert. Zorg dat je rider, je setlist en je promotiemateriaal klaarliggen, zodat je binnen een uur kunt antwoorden in plaats van binnen een week. In BandSpace staat dat materiaal bij elkaar, inclusief een rider die je als publieke link kunt delen.',
        ],
      },
    ],
    faq: [
      {
        question: 'Krijg ik betaald voor mijn eerste optredens?',
        answer:
          'Soms een kleine gage of een deel van de deur, vaak in het begin weinig tot niets. Maak vooraf duidelijke afspraken, ook als het bedrag laag is.',
      },
      {
        question: 'Wat is een rider en heb ik die nodig?',
        answer:
          'Een rider beschrijft wat je nodig hebt aan geluid, licht en podium: hoeveel kanalen, welke versterking, hoeveel monitors. Zodra je op een podium met techniek speelt, wordt er om gevraagd.',
      },
    ],
    related: ['podia', 'voor-artiesten', 'bandleden-vinden'],
  },

  {
    slug: 'muziek-promoten',
    title: 'Je muziek promoten in Nederland zonder budget',
    description:
      'Wat werkt er als beginnende Nederlandse artiest zonder marketingbudget: lokale media, afspeellijsten, samenwerkingen en de dingen die je wél in de hand hebt.',
    h1: 'Je muziek promoten zonder budget',
    intro:
      'Promotie voor beginnende artiesten gaat zelden over adverteren. Het gaat over een klein aantal mensen dat je werk echt oppikt en doorgeeft. Die mensen zijn te vinden, en ze zitten dichterbij dan je denkt.',
    sections: [
      {
        heading: 'Lokaal is makkelijker dan landelijk',
        body: [
          'Regionale omroepen, stadsbladen, lokale muziekblogs en gemeentelijke cultuurpagina\'s zoeken actief naar verhalen uit eigen stad en hebben veel minder aanbod dan de landelijke media. Een debuutsingle van een band uit dezelfde gemeente is voor hen nieuws; voor een landelijke redactie niet.',
          'Schrijf een bericht van vijf zinnen: wie, wat, waar vandaan, wanneer, en een link. Voeg één foto toe in hoge resolutie. Dat is genoeg.',
        ],
      },
      {
        heading: 'Laat andere artiesten je doorgeven',
        body: [
          'Een aanbeveling van een bevriende band bereikt precies de mensen die jouw genre al leuk vinden. Dat werkt beter dan elk algoritme waar je geen invloed op hebt. Zet elkaar in afspeellijsten, noem elkaar bij optredens, en speel samen.',
          'Samenwerken is de snelste vorm hiervan: een track met iemand anders komt bij twee publieken terecht in plaats van één.',
        ],
      },
      {
        heading: 'Herhaal jezelf vaker dan comfortabel voelt',
        body: [
          'Je nummer is één keer nieuw voor jou en tien keer nieuw voor je publiek, omdat bijna niemand je eerste bericht zag. Deel dezelfde release opnieuw met een andere invalshoek: een fragment, het verhaal achter de tekst, een live-versie, een foto uit de studio.',
        ],
      },
      {
        heading: 'Zorg dat je vindbaar bent als iemand je naam hoort',
        body: [
          'Iemand ziet je spelen, onthoudt half je naam en zoekt er later op. Als er dan niets te vinden is, houdt het op. Eén vindbare pagina met je muziek, je bio en je komende optredens vangt dat op — en die pagina kost je niets.',
        ],
      },
    ],
    faq: [
      {
        question: 'Heeft adverteren zin voor een beginnende artiest?',
        answer:
          'Zelden. Zonder publiek dat al reageert op je muziek koop je vooral vertoningen. Investeer je eerste euro\'s eerder in een fatsoenlijke opname of in reiskosten naar een optreden.',
      },
      {
        question: 'Hoe kom ik in afspeellijsten?',
        answer:
          'Begin bij afspeellijsten van mensen die je kent en bij lijsten binnen je eigen scene. Grote redactionele lijsten komen pas in beeld als er al beweging rond je muziek zit.',
      },
    ],
    related: ['muziek-uploaden', 'voor-artiesten', 'optredens-vinden'],
  },

  {
    slug: 'over-h-orbit',
    title: 'Over H-orbit — het Nederlandse muziekplatform',
    description:
      'Wat H-orbit is, voor wie het bedoeld is en wat je er kunt doen: muziek uploaden, artiesten ontdekken, bandleden en optredens vinden en je band organiseren.',
    h1: 'Over H-orbit',
    intro:
      'H-orbit is een Nederlands platform voor muziek en de mensen die haar maken. Het is gebouwd rond één gedachte: beginnende artiesten hebben geen extra streamingdienst nodig, maar een plek waar hun muziek, hun scene en hun praktische werk bij elkaar komen.',
    sections: [
      {
        heading: 'Wat je op H-orbit kunt doen',
        body: ['Het platform bestaat uit een aantal onderdelen die op elkaar aansluiten.'],
        list: [
          'Muziek uploaden en delen — losse nummers of complete albums, met je eigen artiestenpagina.',
          'Nederlandse artiesten ontdekken per genre, plus radiostations en podcasts uit de scene.',
          'Netwerken — oproepen plaatsen voor bandleden, samenwerkingen en open calls.',
          'BandSpace — de werkruimte van je band: repetities, opnames, setlists en je technische rider.',
          'De Nederlandse scene op de kaart: podia, oefenruimtes en broedplaatsen door het hele land.',
          'Forums, tutorials en magazine-artikelen over het vak.',
        ],
      },
      {
        heading: 'Voor wie het bedoeld is',
        body: [
          'Voor beginnende artiesten en bands in Nederland, en voor iedereen die daaromheen werkt: programmeurs, producers, sessiemuzikanten en mensen die een scene draaiende houden. Je hebt geen platencontract, distributeur of publiek nodig om te beginnen.',
        ],
      },
      {
        heading: 'Contact',
        body: [
          'Vragen, samenwerkingen of iets dat niet werkt: mail naar info@h-orbit.nl. Voor juridische informatie zie het privacybeleid, de algemene voorwaarden en het cookiebeleid.',
        ],
      },
    ],
    faq: [],
    related: ['voor-artiesten', 'podia', 'veelgestelde-vragen'],
  },

  {
    slug: 'veelgestelde-vragen',
    title: 'Veelgestelde vragen over H-orbit',
    description:
      'Antwoorden op de vragen die beginnende Nederlandse artiesten het vaakst stellen over uploaden, rechten, kosten, bandleden en optredens.',
    h1: 'Veelgestelde vragen',
    intro:
      'De vragen die het vaakst binnenkomen, met een kort antwoord. Staat je vraag er niet bij, mail dan naar info@h-orbit.nl.',
    sections: [],
    faq: [
      {
        question: 'Wat is H-orbit precies?',
        answer:
          'Een Nederlands muziekplatform waar artiesten hun muziek uploaden en delen, andere muzikanten en optredens vinden en hun band organiseren. Het combineert luisteren, netwerken en praktisch bandwerk op één plek.',
      },
      {
        question: 'Is een account gratis?',
        answer:
          'Ja, een account aanmaken en je muziek uploaden is gratis. Er is daarnaast een Pro-abonnement met extra functies.',
      },
      {
        question: 'Voor wie is H-orbit bedoeld?',
        answer:
          'Voor beginnende en gevestigde artiesten in Nederland, en voor iedereen die om de muziek heen werkt: producers, sessiemuzikanten, programmeurs en organisatoren.',
      },
      {
        question: 'Blijf ik eigenaar van de muziek die ik upload?',
        answer:
          'Ja. Je blijft rechthebbende van je eigen werk. In de algemene voorwaarden staat precies welke toestemming je geeft om je muziek te kunnen afspelen en tonen op het platform.',
      },
      {
        question: 'Heb ik een distributeur nodig voordat ik kan uploaden?',
        answer:
          'Nee. Je kunt je muziek direct uploaden. Wil je daarnaast op de grote streamingdiensten staan, dan regel je dat los via een distributeur.',
      },
      {
        question: 'Kan ik bandleden zoeken via H-orbit?',
        answer:
          'Ja. Via Netwerken plaats je een oproep voor een vast bandlid, een sessiemuzikant of een eenmalige samenwerking, en kun je reageren op oproepen van anderen.',
      },
      {
        question: 'Helpt H-orbit bij het vinden van optredens?',
        answer:
          'Het platform bevat een overzicht van podia, dorpshuizen, cultuurcentra en broedplaatsen door heel Nederland, plus een agenda met evenementen. Het boeken doe je zelf, rechtstreeks met de locatie.',
      },
      {
        question: 'Werkt H-orbit op mijn telefoon?',
        answer:
          'Ja. H-orbit is gebouwd voor mobiel gebruik en kan als app aan je beginscherm worden toegevoegd.',
      },
      {
        question: 'In welke taal is het platform?',
        answer: 'Nederlands.',
      },
    ],
    related: ['voor-artiesten', 'over-h-orbit', 'muziek-uploaden'],
  },
];

/** Losse pagina's die hun inhoud uit de database halen, staan in de generator. */
export const PODIA_SLUG = 'podia';

export const PODIA_HUB = {
  slug: PODIA_SLUG,
  title: 'Podia, oefenruimtes en broedplaatsen in Nederland',
  description:
    'Een overzicht van poppodia, dorpshuizen, cultuurcentra en broedplaatsen in heel Nederland, per provincie — plekken waar beginnende artiesten kunnen spelen en repeteren.',
  h1: 'Podia en oefenruimtes in Nederland',
  intro:
    'Live spelen begint bij weten waar je terechtkunt. Dit overzicht bundelt poppodia, dorpshuizen, cultuurcentra, erfgoedlocaties en broedplaatsen door heel Nederland — inclusief de kleinere plekken buiten de grote steden, waar voor beginnend werk vaak juist meer ruimte is. Kies je provincie om te zien wat er bij jou in de buurt zit.',
};

export const PROVINCE_COPY = {
  intro: (province, count, cities) =>
    `In ${province} staan ${count} locaties in dit overzicht, verspreid over ${cities} ${
      cities === 1 ? 'plaats' : 'plaatsen'
    }. Van poppodia tot dorpshuizen en broedplaatsen — plekken waar live muziek geprogrammeerd wordt of waar ruimte is om te repeteren.`,
};
