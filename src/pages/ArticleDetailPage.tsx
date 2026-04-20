import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Clock, User, Calendar, Share2, BookOpen, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CommentSection from '@components/CommentSection';
import { useToast } from '@components/Toast';
import { shareContent, buildShareUrl } from '@utils/share';

// Hardcoded article body paragraphs keyed by article id
const BODY = {
  1: [
    "Typhoon staat in de coulissen van de uitverkochte Ziggo Dome en kijkt naar de zee van gezichten. Het is de derde avond van zijn landelijke tour en het is elke keer opnieuw een overweldiging, zegt hij.",
    "\"Nederlandse muziek draait altijd om eerlijkheid,\" begint hij als we hem een uur voor het concert spreken in zijn kleedkamer. \"Als je in het Nederlands schrijft, kun je nergens achter verstopt blijven. Elke zin raak je direct, of niet.\"",
    "Het is iets wat hij al vroeg doorhad. Opgegroeid in Zeist, de zoon van een Marokkaanse vader en Nederlandse moeder, was taal altijd een instrument van identiteit. \"Ik voelde me soms geen volwaardig Nederlander, maar ook geen volwaardige Marokkaan. Muziek was de plek waar ik beide mocht zijn.\"",
    "Zijn album Alle Mensen uit 2022 brak alle records voor Nederlandstalige hiphop. Maar succes verandert niets aan het schrijfproces, zegt hij. \"Ik zit nog steeds met een notitieblok op de keukentafel. De omgeving is misschien groter geworden, maar de eerlijkheid moet hetzelfde blijven.\"",
    "Als we vragen naar de toekomst van Nederlandse hiphop, wordt hij even stil. \"De nieuwe generatie is moediger. Ze mixen Arabisch, Berbers, Surinaams door het Nederlands. Dat is de volgende stap — een taal die echt van iedereen is.\"",
  ],
  2: [
    "Rotterdam heeft altijd iets gehad wat Amsterdam mist: de bereidheid om lelijk te zijn. De stad werd na de oorlog heropgebouwd als een experiment, en die geest van nuchter pragmatisme sijpelt door in de muziekscene.",
    "We beginnen onze tour op vrijdagavond in Boomtown, een voormalig pakhuis aan de Maas. Het is pas tien uur, maar de zaal is al half gevuld. Op het podium staat een dj-trio dat gabber mengt met Arabische synthesizers.",
    "\"Rotterdam heeft nooit geprobeerd cool te zijn,\" zegt promotor Karim el Fassi na de set. \"En daardoor is het cool geworden. Als je hier iets nieuw doet, ben je niet bang voor oordelen — iedereen is hier een outsider.\"",
    "Zaterdagnacht brengen we door in Baroeg, legendaire metaltempel. Maar zaterdag staat er een elektronisch programma — een teken van de tijd. De grenzen tussen genres vervagen op een manier die nergens zo ver gaat als hier.",
    "Vijf locaties, één weekend, één conclusie: Rotterdam is het echte laboratorium van de Nederlandse muziek. Niet luidruchtig, maar onontkoombaar.",
  ],
  default: [
    "Dit is een uitgebreid artikel over een onderwerp dat diep verbonden is met de Nederlandse muziekscene. De auteur neemt je mee op een reis langs de mensen, plekken en klanken die ons muzikale landschap vormgeven.",
    "Van de clubcircuits in Amsterdam tot de underground scenes in Tilburg en Groningen — overal bruist het van creativiteit. Artiesten vinden elkaar buiten de traditionele kanalen, dankzij platforms als h-orbit.",
    "\"Het is een bijzonder moment voor Nederlandse muziek,\" zegt één van onze gesprekspartners. \"We exporteren niet alleen klanken, we exporteren een houding — eigenzinnig, direct, zonder toeters en bellen.\"",
    "De cijfers bevestigen het gevoel. Streamingdata laat zien dat Nederlandstalige muziek de afgelopen drie jaar met meer dan 40 procent is gegroeid buiten Nederland. Belgen en Zuid-Afrikanen zijn de grootste nieuwe afnemers.",
    "Het verhaal van de Nederlandse muziek is verre van af. Dit artikel is één hoofdstuk — en de volgende wordt al geschreven in de repetitieruimtes, thuisstudio's en podia van het land.",
  ],
};

function getBody(id) {
  return BODY[id] || BODY.default;
}

export default function ArticleDetailPage() {
  const { id } = useParams();
  const addToast = useToast();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    supabase.from('articles').select('*').eq('id', Number(id)).single()
      .then(({ data }) => setArticle(data));
  }, [id]);

  useEffect(() => {
    if (!article) return;
    supabase.from('articles').select('*').neq('id', article.id).limit(3)
      .then(({ data }) => setRelated(data ?? []));
  }, [article?.id]);

  if (!article) {
    return null;
  }

  const body = getBody(article.id);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
      {/* Back */}
      <Link
        to="/magazine"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-8 transition-colors"
      >
        <ChevronLeft size={16} /> Magazine
      </Link>

      <div className="grid lg:grid-cols-[1fr_320px] gap-10">
        {/* Main article */}
        <article>
          {/* Category + meta */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold bg-violet-600 text-white px-3 py-1 rounded-full">
              {article.category}
            </span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-black text-white leading-tight mb-5">
            {article.title}
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-6 border-l-4 border-violet-500/50 pl-5 italic">
            {article.excerpt}
          </p>

          {/* Author row */}
          <div className="flex items-center gap-4 py-4 border-y border-white/8 mb-8">
            <img
              src={`https://picsum.photos/seed/${article.author.replace(/\s/g, '')}/80/80`}
              alt={article.author}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{article.author}</p>
              <p className="text-xs text-slate-500">Redacteur</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} />
                {new Date(article.published_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={12} /> {article.read_time} leestijd
              </span>
            </div>
            <button
              onClick={async () => {
                const result = await shareContent({
                  title: article.title,
                  text: article.excerpt,
                  url: buildShareUrl(`/magazine/${article.id}`),
                });
                if (result === 'copied') addToast('Link gekopieerd naar klembord!', 'success');
                else if (result === 'shared') addToast('Gedeeld!', 'success');
              }}
              className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
            >
              <Share2 size={15} />
            </button>
          </div>

          {/* Cover image */}
          <div className="rounded-2xl overflow-hidden mb-8 aspect-video">
            <img src={article.cover_url} alt={article.title} className="w-full h-full object-cover" />
          </div>

          {/* Body */}
          <div className="prose prose-invert max-w-none space-y-5">
            {body.map((para, i) => (
              <p key={i} className="text-slate-300 leading-relaxed text-base">
                {para}
              </p>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-white/8">
            {['Nederlandse muziek', article.category, '2026'].map(tag => (
              <span key={tag} className="text-xs bg-white/6 text-slate-400 px-3 py-1.5 rounded-full border border-white/10">
                {tag}
              </span>
            ))}
          </div>

          <CommentSection resourceType="article" resourceId={article.id} resourceTitle={article.title} />
        </article>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* About the author */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Over de auteur</p>
            <div className="flex items-center gap-3 mb-3">
              <img
                src={`https://picsum.photos/seed/${article.author.replace(/\s/g, '')}/80/80`}
                alt={article.author}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold text-white text-sm">{article.author}</p>
                <p className="text-xs text-violet-400">Muziekredacteur</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Schrijft over de Nederlandse muziekscene voor h-orbit Magazine. Gespecialiseerd in {article.category.toLowerCase()} en live-verslaggeving.
            </p>
          </div>

          {/* Reading time */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-600/15 rounded-xl flex items-center justify-center">
                <BookOpen size={18} className="text-violet-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{article.read_time} leestijd</p>
                <p className="text-xs text-slate-500">{body.length} alinea's</p>
              </div>
            </div>
          </div>

          {/* More articles */}
          {related.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Meer artikelen</p>
              <div className="space-y-3">
                {related.map(a => (
                  <Link
                    key={a.id}
                    to={`/magazine/${a.id}`}
                    className="flex gap-3 group"
                  >
                    <img src={a.cover_url} alt={a.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-violet-400 mb-0.5">{a.category}</p>
                      <p className="text-sm text-white font-medium leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
                        {a.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Clock size={10} /> {a.read_time}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                to="/magazine"
                className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 mt-4 transition-colors"
              >
                Alle artikelen <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
