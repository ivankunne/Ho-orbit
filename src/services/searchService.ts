import { artists, tracks, events, tutorials, articles } from '@data/mockData.js';

// TODO: replace with → api.get('/search?q=query')
export async function search(query) {
  if (!query || query.trim().length < 2) {
    return { artists: [], tracks: [], events: [], tutorials: [], articles: [] };
  }

  const q = query.toLowerCase();

  return {
    artists: artists.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.genre.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q)
    ).slice(0, 5),

    tracks: tracks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.genre?.toLowerCase().includes(q)
    ).slice(0, 5),

    events: events.filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.title?.toLowerCase().includes(q) ||
      e.city?.toLowerCase().includes(q) ||
      e.genre?.toLowerCase().includes(q)
    ).slice(0, 4),

    tutorials: tutorials.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.instructor?.toLowerCase().includes(q) ||
      t.tags?.some(tag => tag.toLowerCase().includes(q))
    ).slice(0, 4),

    articles: articles.filter(a =>
      a.title?.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q) ||
      a.author?.toLowerCase().includes(q)
    ).slice(0, 3),
  };
}
