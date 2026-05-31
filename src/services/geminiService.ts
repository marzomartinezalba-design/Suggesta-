import { BaseItem, ItemType } from "../types";

const reviewsCache: Record<string, any[]> = {};
const recsCache: Record<string, any[]> = {};

// Backup database for client-side offline fallbacks and robust search mapping
const BACKUP_ITEMS: BaseItem[] = [
  {
    id: "interstellar",
    type: "movie",
    title: "Interstellar",
    creator: "Christopher Nolan",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    genres: ["Sci-Fi", "Drama", "Adventure"],
    year: "2014",
    imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/gEU2Qv6vKMvUvYRSyvbs6vP2S8r.jpg",
    externalUrl: "https://www.themoviedb.org/movie/157336-interstellar",
    trailerUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E"
  },
  {
    id: "blinding-lights",
    type: "music",
    title: "Blinding Lights",
    creator: "The Weeknd",
    description: "A global record-breaking retro-synthpop anthem by Canadian singer The Weeknd.",
    genres: ["Pop", "Synthpop", "R&B"],
    year: "2020",
    imageUrl: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54d5aeb36",
    externalUrl: "https://music.youtube.com/watch?v=4NRXx6U8ABQ",
    trailerUrl: "https://www.youtube.com/watch?v=4NRXx6U8ABQ"
  },
  {
    id: "breaking-bad",
    type: "series",
    title: "Breaking Bad",
    creator: "Vince Gilligan",
    description: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.",
    genres: ["Drama", "Crime", "Thriller"],
    year: "2008",
    imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/ztk0Vm6fv9g7Yv066vmsuP36v6F.jpg",
    externalUrl: "https://www.themoviedb.org/tv/1396-breaking-bad",
    trailerUrl: "https://www.youtube.com/watch?v=HhesaQXLuRY"
  },
  {
    id: "inception",
    type: "movie",
    title: "Inception",
    creator: "Christopher Nolan",
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.",
    genres: ["Sci-Fi", "Action", "Thriller"],
    year: "2010",
    imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/o066urT78Z999O9Y687t9g74Yg7.jpg",
    externalUrl: "https://www.themoviedb.org/movie/27205-inception",
    trailerUrl: "https://www.youtube.com/watch?v=YoHD9XEInc0"
  },
  {
    id: "starboy",
    type: "music",
    title: "Starboy",
    creator: "The Weeknd",
    description: "An atmospheric contemporary R&B and synth-pop masterpiece featuring electronic music duo Daft Punk.",
    genres: ["Pop", "R&B", "Electronic"],
    year: "2016",
    imageUrl: "https://i.scdn.co/image/ab67616d0000b273bbfd9bcef94f06871edfcfa5",
    externalUrl: "https://music.youtube.com/watch?v=34Na4j8AVgA",
    trailerUrl: "https://www.youtube.com/watch?v=34Na4j8AVgA"
  },
  {
    id: "stranger-things",
    type: "series",
    title: "Stranger Things",
    creator: "The Duffer Brothers",
    description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
    genres: ["Sci-Fi", "Drama", "Mystery"],
    year: "2016",
    imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/49Y6Brp67gE7SppF27qfR66g370.jpg",
    externalUrl: "https://www.themoviedb.org/tv/66732-stranger-things",
    trailerUrl: "https://www.youtube.com/watch?v=b9EkMc79ZSU"
  },
  {
    id: "pulp-fiction",
    type: "movie",
    title: "Pulp Fiction",
    creator: "Quentin Tarantino",
    description: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    genres: ["Thriller", "Crime"],
    year: "1994",
    imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/fIE3lAGuS0vSgfgasf19uX6XY65.jpg",
    externalUrl: "https://www.themoviedb.org/movie/680-pulp-fiction",
    trailerUrl: "https://www.youtube.com/watch?v=s7Eg04E_f8U"
  },
  {
    id: "bad-guy",
    type: "music",
    title: "Bad Guy",
    creator: "Billie Eilish",
    description: "An award-winning electropop and synth-pop song known for its minimalist, heavy-bass instrumentation.",
    genres: ["Pop", "Electropop"],
    year: "2019",
    imageUrl: "https://i.scdn.co/image/ab67616d0000b27350a5447e0ae2d550ea0c0568",
    externalUrl: "https://music.youtube.com/watch?v=DyDfgMOUjCI",
    trailerUrl: "https://www.youtube.com/watch?v=DyDfgMOUjCI"
  },
  {
    id: "the-dark-knight",
    type: "movie",
    title: "The Dark Knight",
    creator: "Christopher Nolan",
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    genres: ["Action", "Crime", "Drama"],
    year: "2008",
    imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/qJ2tWGB2XclmAEg367hq9tHG46C.jpg",
    externalUrl: "https://www.themoviedb.org/movie/155-the-dark-knight",
    trailerUrl: "https://www.youtube.com/watch?v=EXeTwQWrcwY"
  },
  {
    id: "shape-of-you",
    type: "music",
    title: "Shape of You",
    creator: "Ed Sheeran",
    description: "A chart-topping tropical house-infused dance-pop song by English singer-songwriter Ed Sheeran.",
    genres: ["Pop", "Dance-Pop"],
    year: "2017",
    imageUrl: "https://i.scdn.co/image/ab67616d0000b273ba55aeec1eeeaf999713028d",
    externalUrl: "https://music.youtube.com/watch?v=JGwWNGJdvx8",
    trailerUrl: "https://www.youtube.com/watch?v=JGwWNGJdvx8"
  },
  {
    id: 'mean-girls',
    type: 'movie',
    title: 'Mean Girls',
    creator: 'Mark Waters',
    description: 'Cady Heron is a hit with The Plastics, the A-list girl clique at her new school, until she makes the mistake of falling for Aaron Samuels.',
    imageUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/fXDsBSpR6v9KeLZQWo789vpkK9M.jpg',
    genres: ['Comedy', 'Teen'],
    year: '2004',
    externalUrl: 'https://www.themoviedb.org/movie/10625-mean-girls',
    trailerUrl: "https://www.youtube.com/watch?v=oDu7K-YIn7g"
  },
  {
    id: 'obsessed',
    type: 'music',
    title: 'Obsessed',
    creator: 'Mariah Carey',
    description: 'A sassy pop and R&B anthem by American singer and songwriter Mariah Carey.',
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b27341fe817f54c9c61bf9c10444',
    genres: ['Pop', 'R&B'],
    year: '2009',
    externalUrl: 'https://open.spotify.com/track/5enY774EwOllZ5I13L7j5u',
    trailerUrl: "https://www.youtube.com/watch?v=H1Yt0xJKDY8"
  },
  {
    id: 'clueless',
    type: 'movie',
    title: 'Clueless',
    creator: 'Amy Heckerling',
    description: 'Shallow, rich and socially successful Cher is at the top of her Beverly Hills high school\'s pecking order.',
    imageUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/899M7O9uivlT6pZ7tVbeT1H9d1H.jpg',
    genres: ['Comedy', 'Romance'],
    year: '1995',
    externalUrl: 'https://www.themoviedb.org/movie/9603-clueless',
    trailerUrl: "https://www.youtube.com/watch?v=yMc3PffZPh0"
  }
];

function clientFallbackSearch(query: string): BaseItem[] {
  const q = query.toLowerCase().trim();
  
  // Find any matches in backup items
  const matches = BACKUP_ITEMS.filter(item => 
    item.title.toLowerCase().includes(q) ||
    item.creator.toLowerCase().includes(q) ||
    item.genres.some((g: string) => g.toLowerCase().includes(q)) ||
    (item.description && item.description.toLowerCase().includes(q))
  );

  // Combine with dynamic items to feel personalized
  const isMusicKeywords = ["song", "music", "sing", "album", "artist", "band", "soundtrack", "beat", "voice", "melody"].some(k => q.includes(k));
  const isSeriesKeywords = ["show", "series", "season", "episode", "tv"].some(k => q.includes(k));

  let detectedType: ItemType = "movie";
  let detectedGenres = ["Drama"];
  let defaultPoster = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600";
  let defaultExternal = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  let defaultTrailer = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}+official+trailer`;
  let detectedCreator = "Culture Curator";

  if (isMusicKeywords) {
    detectedType = "music";
    detectedGenres = ["Pop", "R&B"];
    defaultPoster = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600";
    defaultExternal = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
    defaultTrailer = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}+official+music+video`;
    detectedCreator = "Musical Visionary";
  } else if (isSeriesKeywords) {
    detectedType = "series";
    detectedGenres = ["Drama", "Mystery"];
    defaultPoster = "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?w=600";
    defaultTrailer = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}+official+trailer`;
    detectedCreator = "Show Runner";
  }

  const cleanTitle = query.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const dynamicItems: BaseItem[] = [
    {
      id: `dyn-1-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      type: detectedType,
      title: cleanTitle,
      creator: detectedCreator,
      description: `A stellar exploration showcasing the cultural quality, premium style, and artistic influence of ${cleanTitle}.`,
      genres: detectedGenres,
      year: "2024",
      imageUrl: defaultPoster,
      externalUrl: defaultExternal,
      trailerUrl: defaultTrailer
    },
    {
      id: `dyn-2-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      type: detectedType === "music" ? "movie" : "music",
      title: detectedType === "music" ? `${cleanTitle} (Official Soundtrack)` : `${cleanTitle} - The Main Theme`,
      creator: "Creative Studio",
      description: `A stunning artistic and thematic counterpart inspired by the premium atmosphere of ${cleanTitle}.`,
      genres: ["Alternative", "Indie"],
      year: "2025",
      imageUrl: detectedType === "music"
        ? "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600"
        : "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600",
      externalUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}`,
      trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}+trailer`
    }
  ];

  const uniqueItemsMap = new Map<string, BaseItem>();
  
  // Put matches first
  matches.forEach(item => uniqueItemsMap.set(item.id, item));
  // Add dynamic results
  dynamicItems.forEach(item => uniqueItemsMap.set(item.id, item));
  // Pad with premium backup catalog items
  BACKUP_ITEMS.forEach(bItem => {
    if (uniqueItemsMap.size < 12) {
      uniqueItemsMap.set(bItem.id, bItem);
    }
  });

  return Array.from(uniqueItemsMap.values());
}

// Detect and route requests to the Cloud Run backend when running on external domains (e.g. Vercel)
export const getBackendUrl = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
    if (envUrl) return envUrl;

    const isDevelopmentOrPreview = 
      hostname.includes("europe-west2.run.app") || 
      hostname.includes("us-central1.run.app") || 
      (hostname === "localhost" && window.location.port === "3000");

    if (!isDevelopmentOrPreview) {
      // Point to the active running development container backend containing your API secrets so your Vercel deployment connects live!
      return "https://ais-dev-5wmbrdd4c544s76bmd574a-822615077587.europe-west2.run.app";
    }
  }
  return "";
};

// Helper to make POST requests to server-side Gemini Proxy routes
async function apiPost(endpoint: string, body: object): Promise<any> {
  const url = `${getBackendUrl()}${endpoint}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export async function generateItemInfo(query: string, typeHint?: ItemType): Promise<BaseItem | null> {
  try {
    return await apiPost("/api/gemini/item-info", { query, typeHint });
  } catch (error) {
    console.error("generateItemInfo Error calling server:", error);
    const mockSearch = clientFallbackSearch(query);
    return mockSearch[0] || BACKUP_ITEMS[0];
  }
}

export async function searchItemsAI(query: string): Promise<BaseItem[]> {
  try {
    return await apiPost("/api/gemini/search", { query });
  } catch (error) {
    console.error("searchItemsAI Error calling server, falling back to local simulation:", error);
    return clientFallbackSearch(query);
  }
}

export async function generateInitialRecommendations(item: BaseItem): Promise<{ title: string; type: ItemType; reason: string }[]> {
  return [];
}

export async function generateCommunityReviews(item: BaseItem): Promise<{ userName: string; rating: number; comment: string }[]> {
  if (reviewsCache[item.id]) return reviewsCache[item.id];
  
  try {
    const reviews = await apiPost("/api/gemini/reviews", { item });
    reviewsCache[item.id] = reviews;
    return reviews;
  } catch (error) {
    console.error("generateCommunityReviews Error calling server, using local fallback reviews:", error);
    const mockReviews = [
      {
        userName: "CultureEnthusiast",
        rating: 5,
        comment: `An unmatched artistic achievement! "${item.title}" is a modern masterclass that perfectly hits every note.`
      },
      {
        userName: "PremiumReviewer",
        rating: 4,
        comment: `The aesthetic design and sonic backdrop of "${item.title}" are simply brilliant.`
      },
      {
        userName: "ClassicFan",
        rating: 4.5,
        comment: `Sensational performance! "${item.title}" creates a gorgeous and rich atmosphere that lingers long after.`
      }
    ];
    reviewsCache[item.id] = mockReviews;
    return mockReviews;
  }
}

export async function generateCommunityRecommendations(item: BaseItem): Promise<any[]> {
  if (recsCache[item.id]) return recsCache[item.id];

  try {
    const data = await apiPost("/api/gemini/recs", { item });
    const recs = data.map((d: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      sourceItemId: item.id,
      targetItem: d.targetItem,
      reason: d.reason,
      userName: d.userName,
      createdAt: Date.now() - Math.floor(Math.random() * 100000000)
    }));
    recsCache[item.id] = recs;
    return recs;
  } catch (error) {
    console.error("generateCommunityRecommendations Error calling server, using local fallback recommendations:", error);
    const related = BACKUP_ITEMS.filter(it => it.id !== item.id && (it.type === item.type || it.genres.some((g: string) => item.genres?.includes(g))));
    const slice = related.length >= 3 ? related.slice(0, 3) : BACKUP_ITEMS.slice(0, 3);
    
    const mockRecs = slice.map((targetItem, index) => {
      const reasons = [
        `If you loved the incredible aesthetic energy and atmosphere of "${item.title}", "${targetItem.title}" shares that exact outstanding vibe.`,
        `The production design of "${targetItem.title}" is beautifully continuous with "${item.title}"'s top qualities.`,
        `A perfect companion piece to "${item.title}" that expands beautifully on similar structural patterns.`
      ];
      return {
        id: Math.random().toString(36).substr(2, 9),
        sourceItemId: item.id,
        targetItem,
        reason: reasons[index] || reasons[0],
        userName: ["CriticCircle", "VibeGuru", "ReviewScribe"][index] || "Curator",
        createdAt: Date.now() - Math.floor(Math.random() * 100000000)
      };
    });
    recsCache[item.id] = mockRecs;
    return mockRecs;
  }
}
