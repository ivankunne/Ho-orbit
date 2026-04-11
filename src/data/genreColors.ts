const palette = {
  'Hip-Hop':      { bg: 'bg-purple-500/20', text: 'text-purple-400',  border: 'border-purple-500/30',  dot: 'bg-purple-500'  },
  'Rap':          { bg: 'bg-purple-500/20', text: 'text-purple-400',  border: 'border-purple-500/30',  dot: 'bg-purple-500'  },
  'Jazz':         { bg: 'bg-blue-500/20',   text: 'text-blue-400',    border: 'border-blue-500/30',    dot: 'bg-blue-500'    },
  'Nederpop':     { bg: 'bg-amber-500/20',  text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-500'   },
  'Pop':          { bg: 'bg-amber-500/20',  text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-500'   },
  'Elektronisch': { bg: 'bg-cyan-500/20',   text: 'text-cyan-400',    border: 'border-cyan-500/30',    dot: 'bg-cyan-500'    },
  'Electronic':   { bg: 'bg-cyan-500/20',   text: 'text-cyan-400',    border: 'border-cyan-500/30',    dot: 'bg-cyan-500'    },
  'R&B':          { bg: 'bg-pink-500/20',   text: 'text-pink-400',    border: 'border-pink-500/30',    dot: 'bg-pink-500'    },
  'Soul':         { bg: 'bg-yellow-500/20', text: 'text-yellow-400',  border: 'border-yellow-500/30',  dot: 'bg-yellow-500'  },
  'Rock':         { bg: 'bg-red-500/20',    text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-500'     },
  'Blues':        { bg: 'bg-red-500/20',    text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-500'     },
  'Indie':        { bg: 'bg-violet-500/20', text: 'text-violet-400',  border: 'border-violet-500/30',  dot: 'bg-violet-500'  },
  'Psych':        { bg: 'bg-violet-500/20', text: 'text-violet-400',  border: 'border-violet-500/30',  dot: 'bg-violet-500'  },
  'Folk':         { bg: 'bg-green-500/20',  text: 'text-green-400',   border: 'border-green-500/30',   dot: 'bg-green-500'   },
  'Akoestisch':   { bg: 'bg-green-500/20',  text: 'text-green-400',   border: 'border-green-500/30',   dot: 'bg-green-500'   },
  'Klassiek':     { bg: 'bg-amber-500/20',  text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-500'   },
  'Spoken':       { bg: 'bg-teal-500/20',   text: 'text-teal-400',    border: 'border-teal-500/30',    dot: 'bg-teal-500'    },
};

const fallback = { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500' };

export function getGenreColor(genre = '') {
  for (const [key, colors] of Object.entries(palette)) {
    if (genre.toLowerCase().includes(key.toLowerCase())) return colors;
  }
  return fallback;
}

export { palette as genreColorMap };
