const palette = {
  'Hip-Hop':      { bg: 'bg-purple-500/20', text: 'text-purple-400',  border: 'border-purple-500/30',  dot: 'bg-purple-500'  },
  'Jazz':         { bg: 'bg-blue-500/20',   text: 'text-blue-400',    border: 'border-blue-500/30',    dot: 'bg-blue-500'    },
  'Pop':          { bg: 'bg-amber-500/20',  text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-500'   },
  'R&B':          { bg: 'bg-pink-500/20',   text: 'text-pink-400',    border: 'border-pink-500/30',    dot: 'bg-pink-500'    },
  'Soul':         { bg: 'bg-yellow-500/20', text: 'text-yellow-400',  border: 'border-yellow-500/30',  dot: 'bg-yellow-500'  },
  'Rock':         { bg: 'bg-red-500/20',    text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-500'     },
  'Blues':        { bg: 'bg-red-500/20',    text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-500'     },
  'Indie':        { bg: 'bg-violet-500/20', text: 'text-violet-400',  border: 'border-violet-500/30',  dot: 'bg-violet-500'  },
  'Funk':         { bg: 'bg-yellow-500/20', text: 'text-yellow-400',  border: 'border-yellow-500/30',  dot: 'bg-yellow-500'  },
  'Gospel':       { bg: 'bg-yellow-500/20', text: 'text-yellow-400',  border: 'border-yellow-500/30',  dot: 'bg-yellow-500'  },
  'Metal':        { bg: 'bg-red-500/20',    text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-500'     },
  'Punk':         { bg: 'bg-red-500/20',    text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-500'     },
  'Grunge':       { bg: 'bg-red-500/20',    text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-500'     },
  'Ska':          { bg: 'bg-lime-500/20',   text: 'text-lime-400',    border: 'border-lime-500/30',    dot: 'bg-lime-500'    },
  'House':        { bg: 'bg-cyan-500/20',   text: 'text-cyan-400',    border: 'border-cyan-500/30',    dot: 'bg-cyan-500'    },
  'Techno':       { bg: 'bg-cyan-500/20',   text: 'text-cyan-400',    border: 'border-cyan-500/30',    dot: 'bg-cyan-500'    },
  'Trance':       { bg: 'bg-sky-500/20',    text: 'text-sky-400',     border: 'border-sky-500/30',     dot: 'bg-sky-500'     },
  'Drum & Bass':  { bg: 'bg-indigo-500/20', text: 'text-indigo-400',  border: 'border-indigo-500/30',  dot: 'bg-indigo-500'  },
  'Dubstep':      { bg: 'bg-indigo-500/20', text: 'text-indigo-400',  border: 'border-indigo-500/30',  dot: 'bg-indigo-500'  },
  'Hardcore':     { bg: 'bg-rose-500/20',   text: 'text-rose-400',    border: 'border-rose-500/30',    dot: 'bg-rose-500'    },
  'Eurodance':    { bg: 'bg-fuchsia-500/20',text: 'text-fuchsia-400', border: 'border-fuchsia-500/30', dot: 'bg-fuchsia-500' },
  'Afrobeats':    { bg: 'bg-orange-500/20', text: 'text-orange-400',  border: 'border-orange-500/30',  dot: 'bg-orange-500'  },
  'Amapiano':     { bg: 'bg-orange-500/20', text: 'text-orange-400',  border: 'border-orange-500/30',  dot: 'bg-orange-500'  },
  'Grime':        { bg: 'bg-purple-500/20', text: 'text-purple-400',  border: 'border-purple-500/30',  dot: 'bg-purple-500'  },
  'Reggae':       { bg: 'bg-green-500/20',  text: 'text-green-400',   border: 'border-green-500/30',   dot: 'bg-green-500'   },
  'Dancehall':    { bg: 'bg-green-500/20',  text: 'text-green-400',   border: 'border-green-500/30',   dot: 'bg-green-500'   },
};

const fallback = { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500' };

export function getGenreColor(genre = '') {
  for (const [key, colors] of Object.entries(palette)) {
    if (genre.toLowerCase().includes(key.toLowerCase())) return colors;
  }
  return fallback;
}

export { palette as genreColorMap };
