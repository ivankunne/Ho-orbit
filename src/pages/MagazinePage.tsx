import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, User, ChevronRight } from 'lucide-react';
import { articles } from '@data/mockData';
import BlurImage from '@components/BlurImage';

const categories = ['Alles', 'Recensies', 'Interviews', 'Scènerapporten', 'Genre Spotlights'];

function ArticleCard({ article, featured = false }) {
  if (featured) {
    return (
      <Link to={`/magazine/${article.id}`} className="group relative rounded-2xl overflow-hidden cursor-pointer block">
        <BlurImage
          src={article.cover}
          alt={article.title}
          className="w-full h-72 lg:h-96"
          imgClassName="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1528] via-[#1a1528]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <span className="inline-block bg-violet-600/90 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
            {article.category}
          </span>
          <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight mb-3 line-clamp-2">
            {article.title}
          </h2>
          <p className="text-slate-300 text-sm line-clamp-2 mb-4 max-w-2xl">{article.excerpt}</p>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><User size={13} /> {article.author}</span>
            <span>{new Date(article.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="flex items-center gap-1"><Clock size={13} /> {article.readTime} leestijd</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/magazine/${article.id}`} className="group bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 block">
      <div className="relative aspect-video overflow-hidden">
        <BlurImage
          src={article.cover}
          alt={article.title}
          className="w-full h-full"
          imgClassName="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3">
          <span className="bg-[#1a1528]/80 text-violet-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-violet-500/30">
            {article.category}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white leading-tight mb-2 line-clamp-2 group-hover:text-violet-300 transition-colors">
          {article.title}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{article.excerpt}</p>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><User size={10} /> {article.author}</span>
            <span className="flex items-center gap-1"><Clock size={10} /> {article.readTime}</span>
          </div>
          <span>{new Date(article.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>
    </Link>
  );
}

const PAGE_SIZE = 6;

export default function MagazinePage() {
  const [searchParams] = useSearchParams();
  const catParam = searchParams.get('cat');
  const [activeCategory, setActiveCategory] = useState(catParam || 'Alles');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => setVisibleCount(PAGE_SIZE), [activeCategory]);
  useEffect(() => { if (catParam) setActiveCategory(catParam); }, [catParam]);

  const filtered = activeCategory === 'Alles'
    ? articles
    : articles.filter(a => a.category === activeCategory);

  const featuredArticle = articles.find(a => a.featured) || articles[0];
  const allRegular = filtered.filter(a => a.id !== featuredArticle.id);
  const regularArticles = allRegular.slice(0, visibleCount);
  const hasMore = visibleCount < allRegular.length;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Magazine</h1>
        <p className="text-slate-400">Verhalen uit de Nederlandse muziekscene</p>
      </div>

      {/* Uitgelicht artikel */}
      {activeCategory === 'Alles' && (
        <div className="mb-8">
          <ArticleCard article={featuredArticle} featured />
        </div>
      )}

      {/* Categorietabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Artikelraster */}
      {/* TODO: Vervang met API-aanroep naar /api/artikelen */}
      {regularArticles.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p>Nog geen artikelen in deze categorie.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {regularArticles.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Meer laden */}
      {hasMore && (
        <div className="flex justify-center mt-10">
          <button
            onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            Meer laden <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
