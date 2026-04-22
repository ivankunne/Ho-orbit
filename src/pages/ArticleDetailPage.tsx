import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Clock, User, Calendar, Share2, BookOpen, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CommentSection from '@components/CommentSection';
import { useToast } from '@components/Toast';
import { shareContent, buildShareUrl } from '@utils/share';

function getBody(article: { body?: string; excerpt?: string }): string[] {
  if (article.body && article.body.trim()) {
    return article.body.split('\n\n').map(p => p.trim()).filter(Boolean);
  }
  if (article.excerpt) return [article.excerpt];
  return ['De volledige tekst van dit artikel is nog niet beschikbaar.'];
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

  const body = getBody(article);

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
