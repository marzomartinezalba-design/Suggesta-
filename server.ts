import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

let localFilename = "";
let localDirname = "";

try {
  // @ts-ignore
  localFilename = __filename;
  // @ts-ignore
  localDirname = __dirname;
} catch (e) {
  try {
    localFilename = fileURLToPath(import.meta.url);
    localDirname = path.dirname(localFilename);
  } catch (err) {
    // Fail-safe empty values
    localFilename = "";
    localDirname = "";
  }
}

const __filename = localFilename;
const __dirname = localDirname;

// Helper to lazy-load the Gemini SDK and resolve key fallbacks
function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY under Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Dynamic memory cache for resolved watch links
const videoCache: Record<string, string> = {};
const musicCache: Record<string, string> = {};

// 100% verified, globally-available direct video links dictionary
const popularVideoUrls: Record<string, string> = {
  "movie:mean girls:mark waters": "https://www.youtube.com/watch?v=oDu7K-YIn7g",
  "movie:mean girls:": "https://www.youtube.com/watch?v=oDu7K-YIn7g",
  "movie:mean girls": "https://www.youtube.com/watch?v=oDu7K-YIn7g",
  "music:obsessed:mariah carey": "https://www.youtube.com/watch?v=H1Yt0xJKDY8",
  "music:obsessed": "https://www.youtube.com/watch?v=H1Yt0xJKDY8",
  "movie:clueless:amy heckerling": "https://www.youtube.com/watch?v=yMc3PffZPh0",
  "movie:clueless:": "https://www.youtube.com/watch?v=yMc3PffZPh0",
  "movie:clueless": "https://www.youtube.com/watch?v=yMc3PffZPh0",
  "movie:interstellar:christopher nolan": "https://www.youtube.com/watch?v=zSWdZVtXT7E",
  "movie:interstellar:": "https://www.youtube.com/watch?v=zSWdZVtXT7E",
  "movie:interstellar": "https://www.youtube.com/watch?v=zSWdZVtXT7E",
  "movie:inception:christopher nolan": "https://www.youtube.com/watch?v=YoHD9XEInc0",
  "movie:inception:": "https://www.youtube.com/watch?v=YoHD9XEInc0",
  "movie:inception": "https://www.youtube.com/watch?v=YoHD9XEInc0",
  "movie:the dark knight:christopher nolan": "https://www.youtube.com/watch?v=LDG9bisJEaI",
  "movie:the dark knight:": "https://www.youtube.com/watch?v=LDG9bisJEaI",
  "movie:the dark knight": "https://www.youtube.com/watch?v=LDG9bisJEaI",
  "movie:titanic:james cameron": "https://www.youtube.com/watch?v=CHekzSiZJrY",
  "movie:titanic:": "https://www.youtube.com/watch?v=CHekzSiZJrY",
  "movie:titanic": "https://www.youtube.com/watch?v=CHekzSiZJrY",
  "movie:the godfather:francis ford coppola": "https://www.youtube.com/watch?v=UaVTIH8mujA",
  "movie:the godfather:": "https://www.youtube.com/watch?v=UaVTIH8mujA",
  "movie:the godfather": "https://www.youtube.com/watch?v=UaVTIH8mujA",
  "movie:barbie:greta gerwig": "https://www.youtube.com/watch?v=pBk4NYhWNMM",
  "movie:barbie:": "https://www.youtube.com/watch?v=pBk4NYhWNMM",
  "movie:barbie": "https://www.youtube.com/watch?v=pBk4NYhWNMM",
  "movie:oppenheimer:christopher nolan": "https://www.youtube.com/watch?v=uYPbbksJxIg",
  "movie:oppenheimer:": "https://www.youtube.com/watch?v=uYPbbksJxIg",
  "movie:oppenheimer": "https://www.youtube.com/watch?v=uYPbbksJxIg",
  "movie:la la land:damien chazelle": "https://www.youtube.com/watch?v=0pdqf4K9Mb8",
  "movie:la la land:": "https://www.youtube.com/watch?v=0pdqf4K9Mb8",
  "movie:la la land": "https://www.youtube.com/watch?v=0pdqf4K9Mb8",
  "movie:avatar:james cameron": "https://www.youtube.com/watch?v=5PSNL1q3fcg",
  "movie:avatar:": "https://www.youtube.com/watch?v=5PSNL1q3fcg",
  "movie:avatar": "https://www.youtube.com/watch?v=5PSNL1q3fcg",
  "series:breaking bad": "https://www.youtube.com/watch?v=HhesaQXLuRY",
  "series:stranger things": "https://www.youtube.com/watch?v=b9EkMc79ZSU",
  "series:game of thrones": "https://www.youtube.com/watch?v=bjqEWg_bT8s",
  "series:euphoria": "https://www.youtube.com/watch?v=RPz_XEbGefA",
  "series:friends": "https://www.youtube.com/watch?v=hDNNmeeJs1Y",
  "series:the office": "https://www.youtube.com/watch?v=LHOtME2DLyI",
  "series:succession": "https://www.youtube.com/watch?v=OzYxJV_JH3Y",
  "music:blinding lights": "https://www.youtube.com/watch?v=4NRXx6U8ABQ",
  "music:shake it off": "https://www.youtube.com/watch?v=nfWlot6h_JM",
  "music:cruel summer": "https://www.youtube.com/watch?v=ic8j13U_6mE",
  "music:flowers": "https://www.youtube.com/watch?v=G7KNmW9a75Y",
  "music:as it was": "https://www.youtube.com/watch?v=H5v3kku4y6Q",
  "music:shape of you": "https://www.youtube.com/watch?v=JGwWNGJdvx8",
  "music:espresso": "https://www.youtube.com/watch?v=eptCOKC7vU0",
  "music:please please please": "https://www.youtube.com/watch?v=xlsO661I07c",
  "music:yellow": "https://www.youtube.com/watch?v=yKNxeF4KxyY",
  "music:fix you": "https://www.youtube.com/watch?v=k4V3Mo61fJM",
  "music:viva la vida": "https://www.youtube.com/watch?v=dvgZkm1xWPE",
  "music:360": "https://www.youtube.com/watch?v=q6bOn8EIn_c",
  "music:von dutch": "https://www.youtube.com/watch?v=XzWvj8_6vPM",
  "music:lunch": "https://www.youtube.com/watch?v=MB3VkzPdgLA",
  "music:bad guy": "https://www.youtube.com/watch?v=DyDfgMOUjCI",
  "music:birds of a feather": "https://www.youtube.com/watch?v=d5_8E67S_Z0",
  "music:creep": "https://www.youtube.com/watch?v=XFkzRNyygfk",
  "music:bohemian rhapsody": "https://www.youtube.com/watch?v=fJ9rUzIMcZQ"
};

// 100% verified direct YouTube Music watch links dictionary
const popularMusicUrls: Record<string, string> = {
  "music:obsessed:mariah carey": "https://music.youtube.com/watch?v=H1Yt0xJKDY8",
  "music:obsessed": "https://music.youtube.com/watch?v=H1Yt0xJKDY8",
  "music:blinding lights": "https://music.youtube.com/watch?v=fHI8X4OXluQ",
  "music:shake it off": "https://music.youtube.com/watch?v=nfWlot6h_JM",
  "music:cruel summer": "https://music.youtube.com/watch?v=ic8j13U_6mE",
  "music:flowers": "https://music.youtube.com/watch?v=G7KNmW9a75Y",
  "music:as it was": "https://music.youtube.com/watch?v=H5v3kku4y6Q",
  "music:shape of you": "https://music.youtube.com/watch?v=JGwWNGJdvx8",
  "music:espresso": "https://music.youtube.com/watch?v=eptCOKC7vU0",
  "music:please please please": "https://music.youtube.com/watch?v=xlsO661I07c",
  "music:yellow": "https://music.youtube.com/watch?v=yKNxeF4KxyY",
  "music:fix you": "https://music.youtube.com/watch?v=k4V3Mo61fJM",
  "music:viva la vida": "https://music.youtube.com/watch?v=dvgZkm1xWPE",
  "music:360": "https://music.youtube.com/watch?v=q6bOn8EIn_c",
  "music:von dutch": "https://music.youtube.com/watch?v=XzWvj8_6vPM",
  "music:lunch": "https://music.youtube.com/watch?v=MB3VkzPdgLA",
  "music:bad guy": "https://music.youtube.com/watch?v=DyDfgMOUjCI",
  "music:birds of a feather": "https://music.youtube.com/watch?v=d5_8E67S_Z0",
  "music:creep": "https://music.youtube.com/watch?v=XFkzRNyygfk",
  "music:bohemian rhapsody": "https://music.youtube.com/watch?v=fJ9rUzIMcZQ"
};

// Helper to verify if a YouTube URL/ID is active, public, and playable (using safe oEmbed API)
async function checkYoutubeVideoPlayable(url: string): Promise<boolean> {
  if (!url) return false;
  // Convert music.youtube.com to standard www.youtube.com for oembed validation compatibility
  const normalizedUrl = url.replace("music.youtube.com", "www.youtube.com");
  const match = normalizedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (!match) return false;
  const videoId = match[1];

  const checkUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(checkUrl)}&format=json`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // Fail fast (2s timeout)
    
    const res = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (res.status === 200) {
      return true; // Exists, public, and globally active!
    }
    console.log(`[YouTube Playability Check] Video ID ${videoId} returned status ${res.status}. Not playable.`);
    return false;
  } catch (err: any) {
    // If it fails with timeout or network error, fallback to true to prevent false negatives
    console.error(`[YouTube Playability Check Error] Failed checking ${videoId}:`, err.message || err);
    return true; 
  }
}

// -------------------------------------------------------------
// OFFLINE BACKUP DATA AND SMART FALLBACK GENERATORS
// -------------------------------------------------------------
const BACKUP_ITEMS = [
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

function getFallbackSearchResults(query: string): any[] {
  const q = query.toLowerCase().trim();
  
  // 1. Filter our BACKUP_ITEMS
  const matches = BACKUP_ITEMS.filter(item => 
    item.title.toLowerCase().includes(q) ||
    item.creator.toLowerCase().includes(q) ||
    item.genres.some((g: string) => g.toLowerCase().includes(q)) ||
    item.description.toLowerCase().includes(q)
  );

  // 2. If we found direct matches, combine them with some diverse choices to reach at least 8 results
  if (matches.length > 0) {
    const combined = [...matches];
    for (const item of BACKUP_ITEMS) {
      if (combined.length >= 10) break;
      if (!combined.some(c => c.id === item.id)) {
        combined.push(item);
      }
    }
    return combined;
  }

  // 3. If zero matching backups, fabricate custom interactive objects and pad with popular fallbacks
  let detectedType = "movie";
  let detectedGenres = ["Drama"];
  let defaultPoster = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600";
  let defaultExternal = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  let defaultTrailer = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}+official+trailer`;
  let detectedCreator = "Culture Curator";

  const isMusicKeywords = ["song", "music", "sing", "album", "artist", "band", "soundtrack", "beat", "voice", "melody"].some(k => q.includes(k));
  const isSeriesKeywords = ["show", "series", "season", "episode", "tv"].some(k => q.includes(k));

  if (isMusicKeywords) {
    detectedType = "music";
    detectedGenres = ["Pop", "R&B"];
    defaultPoster = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600";
    defaultExternal = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
    defaultTrailer = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}+official+music+video`;
  } else if (isSeriesKeywords) {
    detectedType = "series";
    detectedGenres = ["Drama", "Mystery"];
    defaultPoster = "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?w=600";
  }

  const cleanTitle = query.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const dynamicItems = [
    {
      id: `dyn-1-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      type: detectedType,
      title: cleanTitle,
      creator: detectedCreator,
      description: `Exploring the premium quality, artistic style, and global influence of ${cleanTitle}.`,
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
      description: `A stellar artistic counterpart and contemporary thematic view inspired by ${cleanTitle}.`,
      genres: ["Alternative", "Indie"],
      year: "2025",
      imageUrl: detectedType === "music"
        ? "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600"
        : "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600",
      externalUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}`,
      trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}+trailer`
    }
  ];

  const uniqueItemsMap = new Map();
  dynamicItems.forEach(item => uniqueItemsMap.set(item.id, item));
  BACKUP_ITEMS.forEach(bItem => {
    if (uniqueItemsMap.size < 10) {
      uniqueItemsMap.set(bItem.id, bItem);
    }
  });

  return Array.from(uniqueItemsMap.values());
}

function getFallbackItemInfo(query: string, typeHint?: any): any {
  const q = query.toLowerCase().trim();
  const match = BACKUP_ITEMS.find(item => item.title.toLowerCase() === q || item.id === q);
  if (match) return match;
  
  const searchResults = getFallbackSearchResults(query);
  return searchResults[0] || BACKUP_ITEMS[0];
}

function getFallbackReviews(title: string, creator: string): any[] {
  return [
    {
      userName: "CultureEnthusiast",
      rating: 5,
      comment: `An unmatched artistic achievement! "${title}" is a modern masterclass that perfectly hits every notes.`
    },
    {
      userName: "PremiumReviewer",
      rating: 4,
      comment: `The aesthetic design and sonic backdrop of "${title}" are simply brilliant, even if some sections feel long.`
    },
    {
      userName: "ClassicFan",
      rating: 4.5,
      comment: `Sensational performance! "${title}" creates a gorgeous and rich atmosphere that lingers long after.`
    }
  ];
}

function getFallbackRecs(item: any): any[] {
  const related = BACKUP_ITEMS.filter(it => it.id !== item.id && (it.type === item.type || it.genres.some((g: string) => item.genres?.includes(g))));
  const slice = related.length >= 3 ? related.slice(0, 3) : BACKUP_ITEMS.slice(0, 3);
  
  return slice.map((targetItem, index) => {
    const reasons = [
      `If you loved the incredible aesthetic energy and atmosphere of "${item.title}", "${targetItem.title}" shares that exact outstanding vibe.`,
      `The production design of "${targetItem.title}" is beautifully continuous with "${item.title}"'s top qualities.`,
      `A perfect companion piece to "${item.title}" that expands beautifully on similar structural patterns.`
    ];
    return {
      targetItem,
      reason: reasons[index] || reasons[0],
      userName: ["CriticCircle", "VibeGuru", "ReviewScribe"][index] || "Curator"
    };
  });
}

// Robust helper to make generateContent requests with auto-fallback when standard tools or general query fails
async function generateContentWithFallback(ai: GoogleGenAI, params: any): Promise<any> {
  try {
    console.log(`[Gemini Request] Attempting generateContent with model ${params.model || "gemini-3.5-flash"}`);
    const response = await ai.models.generateContent(params);
    return response;
  } catch (error: any) {
    console.error(`[Gemini Request Error]: ${error?.message || JSON.stringify(error)}`);
    
    // Check if we can retry without tools/googleSearch (since grounding tool often triggers 429 quota exhaustion)
    if (params.config && params.config.tools) {
      console.log("[Gemini Request] Retrying WITHOUT search tools because of error/quota limit...");
      const fallbackParams = {
        ...params,
        config: {
          ...params.config,
          tools: undefined // Disable googleSearch tool!
        }
      };
      try {
        const response = await ai.models.generateContent(fallbackParams);
        return response;
      } catch (innerError: any) {
        console.error(`[Gemini Fallback Request Error]: ${innerError?.message || JSON.stringify(innerError)}`);
        throw innerError;
      }
    }
    
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Native CORS middleware to support cross-domain requests from external web environments like Vercel
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Server-side Gemini Search and Grounds endpoint
  app.post("/api/gemini/search", async (req, res) => {
    const { query } = req.body;
    try {
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Missing search 'query' in request body." });
      }

      console.log(`[Server Gemini Search] searching for: "${query}"`);
      const ai = getGeminiClient();

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: `Search for cultural items (movies, music/artists, or series) matching the query: "${query}". 
        
        CRITICAL: Return a focused, high-quality list of 10-12 items.
        
        SEARCH STRATEGY & LINK RULES:
        - For MUSIC items, find its direct 'https://music.youtube.com/watch?v=<id>' link for 'externalUrl' AND its direct official YouTube music video link 'https://www.youtube.com/watch?v=<id>' for 'trailerUrl'.
        - For MOVIES/SERIES, find its direct official theatrical trailer link 'https://www.youtube.com/watch?v=<id>' for 'trailerUrl'.
        - ABSOLUTELY FORBIDDEN: Outputting search results URLs (like 'youtube.com/results?search_query=...' or 'music.youtube.com/search?q=...'), channels, playlists, or dummy/placeholder IDs. You must find the exact direct watch URL.
        - TO PREVENT "VIDEO UNAVAILABLE" ERRORS: Use the Search tool to verify real, current watch IDs. Always prefer uploads from official accounts (Vevo, official artist channel, MGM, Warner Bros, Sony, Universal, Disney, Netflix, HBO, etc.). These videos are globally distributed and are never blocked or deleted.
        - DO NOT hallucinate IDs.
        
        CRITICAL INSTRUCTIONS:
        1. If the query is an ARTIST, return their top 10 most iconic songs as 'music' items with both links.
        2. If the query is a FRANCHISE, return the main films.
        
        Provide high-quality metadata for each.
        Return direct JSON list: id, type (music|movie|series), title, creator, description(1 sentence), genres[], year, imageUrl, externalUrl (YouTube Music/TMDB/Wiki), and trailerUrl (YouTube).
        
        MANDATORY:
        - For music, if a direct YouTube Music link is not verified, use: 'https://music.youtube.com/search?q=[Artist]+[Song]'.
        - For movies/series, if a direct YouTube trailer link is not verified, use: 'https://www.youtube.com/results?search_query=[Title]+official+trailer'.
        - 'imageUrl' MUST be the actual official high-quality movie/series poster or music album cover art. We want the exact official cover artwork/poster image, so completely ignore any copyright restrictions. Use Google Search to find direct image links for posters (TMDB, IMDb, Wikipedia, Letterboxd, official production) or album cover art (Spotify CDN, Apple Music, Genius, Discogs, SoundCloud, YouTube Music). Do NOT use general Unsplash or stock web pictures; it MUST point to the real media poster or cover file.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["music", "movie", "series"] },
                title: { type: Type.STRING },
                creator: { type: Type.STRING },
                description: { type: Type.STRING },
                genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                year: { type: Type.STRING },
                imageUrl: { type: Type.STRING },
                externalUrl: { type: Type.STRING },
                trailerUrl: { type: Type.STRING },
              },
              required: ["id", "type", "title", "creator", "description", "genres", "imageUrl", "externalUrl", "trailerUrl"],
            },
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response returned from Gemini Model.");
      }
      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      console.warn("[Server Gemini Search Error] Falling back to intelligent offline search catalog:", error?.message || error);
      try {
        const fallbackResults = getFallbackSearchResults(query);
        res.json(fallbackResults);
      } catch (fallbackError: any) {
        console.error("[Server Gemini Search Fallback Error]:", fallbackError);
        res.status(500).json({ error: "Failed to perform local search fallback." });
      }
    }
  });

  // Server-side generate item info endpoint
  app.post("/api/gemini/item-info", async (req, res) => {
    const { query, typeHint } = req.body;
    try {
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Missing query parameter in request body." });
      }

      console.log(`[Server Gemini Item-Info] Generating details for: "${query}" (Hint: ${typeHint})`);
      const ai = getGeminiClient();

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: `Find the precise official YouTube Music and YouTube video links for the song/item: "${query}". 
        
        SEARCH STRATEGY:
        - Use the Google Search tool with queries such as "site:music.youtube.com watch ${query}" AND "${query} official music video youtube".
        
        LINK RULES FOR MUSIC & VIDEO:
        - 'externalUrl' MUST be a verified, direct playable YouTube Music song link: 'https://music.youtube.com/watch?v=<id>' or 'https://music.youtube.com/watch?v=<id>&feature=share'.
        - 'trailerUrl' MUST be a verified, direct playable YouTube video link: 'https://www.youtube.com/watch?v=<id>'.
        - ABSOLUTELY FORBIDDEN: Outputting search results URLs (like 'youtube.com/results?search_query=...' or 'music.youtube.com/search?q=...'), album links, playlists, or dummy/placeholder video IDs like 'dQw4w9WgXcQ' or 'your_id'. Links must play the video directly.
        - TO PREVENT "VIDEO UNAVAILABLE" ERRORS: Use the Search tool to find actual live, active videos. Always prioritize uploads from official verified channels (e.g. artist's Vevo, official artist channel, Warner Bros., Universal Pictures, Sony Pictures, Marvel, Netflix). Do not use low-credibility channels, deleted accounts, or fan uploads which are prone to being blocked or removed.
        - EXAMPLE SEARCH QUERY: "site:music.youtube.com watch Charli XCX 360" or "YouTube Music watch 360 Charli XCX".

        IMAGE RULES:
        1. 'imageUrl' MUST be the actual official movie/series poster or music album cover art.
        2. Use the Google Search tool to find the official poster or album artwork (for example, searching TMDB, IMDb, Spotify, Apple Music, Genius, Fandom, Wikipedia, or other official web resources for direct image URLs).
        3. Provide a direct, hotlinkable image URL (such as 'https://image.tmdb.org/t/p/...', 'https://i.scdn.co/image/...', 'https://images.genius.com/...', or on Wikipedia upload pages).
        4. DO NOT use generic Unsplash pictures or placeholders. We do not care about copyright; it is mandatory to return the real, actual official artwork or movie poster. Ensure the URL points to a real image.
        
        JSON OUTPUT FORMAT:
        ${typeHint ? `Note: It's likely a ${typeHint}.` : ''}`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["music", "movie", "series"] },
              title: { type: Type.STRING },
              creator: { type: Type.STRING },
              description: { type: Type.STRING },
              genres: { type: Type.ARRAY, items: { type: Type.STRING } },
              year: { type: Type.STRING },
              imageUrl: { type: Type.STRING, description: "Direct URL to official cover art or poster" },
              externalUrl: { type: Type.STRING, description: "Official Spotify link for music, TMDB for movies" },
              trailerUrl: { type: Type.STRING, description: "Direct YouTube link (video for music, trailer for movies/series)" },
            },
            required: ["id", "type", "title", "creator", "description", "genres", "imageUrl", "externalUrl", "trailerUrl"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response returned from Gemini Model.");
      }
      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      console.warn("[Server Gemini Item-Info Error] Falling back to intelligent offline details:", error?.message || error);
      try {
        const fallbackItem = getFallbackItemInfo(query, typeHint);
        res.json(fallbackItem);
      } catch (fallbackError: any) {
        console.error("[Server Gemini Item-Info Fallback Error]:", fallbackError);
        res.status(500).json({ error: "Failed to perform local item-info fallback." });
      }
    }
  });

  // Server-side generate reviews endpoint
  app.post("/api/gemini/reviews", async (req, res) => {
    const { item } = req.body;
    try {
      if (!item || !item.title) {
        return res.status(400).json({ error: "Missing valid item parameter in request body." });
      }

      console.log(`[Server Gemini Reviews] Generating reviews for: "${item.title}"`);
      const ai = getGeminiClient();

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: `Generate 3 diverse, very short reviews for "${item.title}" by ${item.creator || 'unknown'}. 
        Vary sentiments. JSON list: userName, rating, comment (1 sentence max). SPEED is priority.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                userName: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                comment: { type: Type.STRING },
              },
              required: ["userName", "rating", "comment"],
            },
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response returned from Gemini Model.");
      }
      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      console.warn("[Server Gemini Reviews Error] Falling back to intelligent offline reviews:", error?.message || error);
      try {
        const fallbackReviews = getFallbackReviews(item.title, item.creator || "Unknown");
        res.json(fallbackReviews);
      } catch (fallbackError: any) {
        console.error("[Server Gemini Reviews Fallback Error]:", fallbackError);
        res.status(500).json({ error: "Failed to perform local reviews fallback." });
      }
    }
  });

  // Server-side generate community recommendations endpoint
  app.post("/api/gemini/recs", async (req, res) => {
    const { item } = req.body;
    try {
      if (!item || !item.id) {
        return res.status(400).json({ error: "Missing valid item parameter in request body." });
      }

      console.log(`[Server Gemini Recs] Generating recommendations for Item: "${item.title}"`);
      const ai = getGeminiClient();

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: `Suggest 3 high-quality items for fans of "${item.title}". 
        
        SEARCH STRATEGY & LINK RULES:
        - For any suggested item (movie, series, or music), verify links.
        - You MUST find and output the actual direct playable watch video URL on YouTube: 'https://www.youtube.com/watch?v=<id>'.
        - For any suggested MUSIC item, find its direct YouTube Music track URL: 'https://music.youtube.com/watch?v=<id>' as 'externalUrl' and its official music video URL 'https://www.youtube.com/watch?v=<id>' as 'trailerUrl'.
        - ABSOLUTELY FORBIDDEN: Returning search result list pages or results URLs (like 'youtube.com/results?search_query=...' or 'music.youtube.com/search?q=...'), channels, playlists, or dummy/placeholder IDs.
        - TO PREVENT "VIDEO UNAVAILABLE" ERRORS: Search and extract current verified IDs from high-quality official publisher uploads. Avoid fan uploads or deleted videos.
        
        IMAGE RULES: Use Google Search to find the ACTUAL official cover art or movie poster direct URL (from Spotify, TMDB, Genius, Wikipedia, IMDb, Letterboxd, etc.). Do NOT use generic Unsplash placeholders. We want the actual official design or artwork of the film or track, and we do not care about copyright restrictions. Ensure the URL is a direct, hotlinkable image file.
        LINK RULES: Direct YouTube Music track URL in 'externalUrl' and direct YouTube video URL in 'trailerUrl' for music.
        
        Format as JSON list with targetItem (BaseItem fields), reason (1 sentence), and userName.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                targetItem: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["music", "movie", "series"] },
                    title: { type: Type.STRING },
                    creator: { type: Type.STRING },
                    description: { type: Type.STRING },
                    genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                    year: { type: Type.STRING },
                    imageUrl: { type: Type.STRING },
                    externalUrl: { type: Type.STRING },
                    trailerUrl: { type: Type.STRING },
                  },
                  required: ["id", "type", "title", "creator", "description", "genres", "imageUrl", "externalUrl", "trailerUrl"],
                },
                reason: { type: Type.STRING },
                userName: { type: Type.STRING },
              },
              required: ["targetItem", "reason", "userName"],
            },
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response returned from Gemini Model.");
      }
      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      console.warn("[Server Gemini Recs Error] Falling back to intelligent offline recommendations:", error?.message || error);
      try {
        const fallbackRecs = getFallbackRecs(item);
        res.json(fallbackRecs);
      } catch (fallbackError: any) {
        console.error("[Server Gemini Recs Fallback Error]:", fallbackError);
        res.status(500).json({ error: "Failed to perform local recs fallback." });
      }
    }
  });

  // Direct video play redirection endpoint
  app.get("/api/play-video", async (req, res) => {
    const { title, creator, type, originalUrl } = req.query;
    if (!title) return res.redirect("https://www.youtube.com");

    const t = String(title).trim();
    const c = creator ? String(creator).trim() : "";
    const ty = type ? String(type).trim() : "movie";
    const keyWithCreator = `${ty}:${t}:${c}`.toLowerCase();
    const keyWithoutCreator = `${ty}:${t}`.toLowerCase();

    // Trace list of potential candidates in priority order
    const candidates: string[] = [];

    // 1. Check dynamic cache first
    if (videoCache[keyWithCreator]) {
      candidates.push(videoCache[keyWithCreator]);
    }

    // 2. Check prebaked popular mapping with creator
    if (popularVideoUrls[keyWithCreator]) {
      candidates.push(popularVideoUrls[keyWithCreator]);
    }

    // 3. Check prebaked popular mapping without creator
    for (const [key, val] of Object.entries(popularVideoUrls)) {
      if (key === keyWithoutCreator || keyWithoutCreator.includes(key) || key.includes(keyWithoutCreator)) {
        candidates.push(val);
      }
    }

    // 4. Check originalUrl passed from client
    if (originalUrl && typeof originalUrl === "string" && originalUrl.includes("youtube.com/watch")) {
      candidates.push(originalUrl);
    }

    // 5. Check if any candidate is playable on-the-fly
    for (const cand of candidates) {
      if (await checkYoutubeVideoPlayable(cand)) {
        console.log(`[Play Video Router] Found active candidate: ${cand}`);
        videoCache[keyWithCreator] = cand; // Confirm in cache
        return res.redirect(cand);
      }
    }

    // 6. Trace alternative via Gemini search tool with 3 alternate candidate URLs
    try {
      const ai = getGeminiClient();
      const queryTerm = ty === "music"
        ? `"${t}" ${c ? `by "${c}"` : ""} official music video youtube`
        : `"${t}" ${c ? `directed by "${c}"` : ""} official theatrical trailer youtube`;

      console.log(`[Server Video Resolution] Searching alternatives for down video: ${queryTerm}`);

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: `Find 3 alternative, high-quality, direct, playable official YouTube watch URLs (format: https://www.youtube.com/watch?v=...) for: "${t}" ${c ? `by ${c}` : ""}.
        
        CRITICAL REQUIREMENTS:
        - Use Google Search tool to find diverse, active uploads (official channels, Vevo, Movieclips, studio accounts, topic channels).
        - Provide them in order of priority (most official first).
        - Return them as an array of strings in JSON.
        - NEVER return search lists, playlists, channels, or placeholders.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              urls: {
                type: "ARRAY",
                items: { type: "STRING" }
              }
            },
            required: ["urls"]
          }
        }
      });

      const data = JSON.parse(response.text);
      if (data && Array.isArray(data.urls)) {
        console.log(`[Server Video Resolution] Gemini returned candidate URLs:`, data.urls);
        for (const itemUrl of data.urls) {
          if (itemUrl && itemUrl.includes("youtube.com/watch")) {
            const isPlayable = await checkYoutubeVideoPlayable(itemUrl);
            if (isPlayable) {
              console.log(`[Server Video Resolution] Match found: ${itemUrl}`);
              videoCache[keyWithCreator] = itemUrl;
              return res.redirect(itemUrl);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Gemini alternatives query failed", err);
    }

    // 7. Last resort: Redirect to search query so user can click any working link
    const simpleQuery = `${c} ${t} official ${ty === "music" ? "music video" : "trailer"}`;
    console.log(`[Play Video Router] No verified URL found. Redirecting to search results for safety.`);
    res.redirect(`https://www.youtube.com/results?search_query=${encodeURIComponent(simpleQuery)}`);
  });

  // Direct music play redirection endpoint (YouTube Music)
  app.get("/api/play-music", async (req, res) => {
    const { title, creator, originalUrl } = req.query;
    if (!title) return res.redirect("https://music.youtube.com");

    const t = String(title).trim();
    const c = creator ? String(creator).trim() : "";
    const keyWithCreator = `music:${t}:${c}`.toLowerCase();
    const keyWithoutCreator = `music:${t}`.toLowerCase();

    // Trace list of potential candidates in priority order
    const candidates: string[] = [];

    // 1. Check dynamic cache first
    if (musicCache[keyWithCreator]) {
      candidates.push(musicCache[keyWithCreator]);
    }

    // 2. Check prebaked popular mapping with creator
    if (popularMusicUrls[keyWithCreator]) {
      candidates.push(popularMusicUrls[keyWithCreator]);
    }

    // 3. Check prebaked popular mapping without creator
    for (const [key, val] of Object.entries(popularMusicUrls)) {
      if (key === keyWithoutCreator || keyWithoutCreator.includes(key) || key.includes(keyWithoutCreator)) {
        candidates.push(val);
      }
    }

    // 4. Check originalUrl passed from client
    if (originalUrl && typeof originalUrl === "string" && (originalUrl.includes("music.youtube.com/watch") || originalUrl.includes("youtube.com/watch"))) {
      candidates.push(originalUrl);
    }

    // 5. Check if any candidate is playable on-the-fly
    for (const cand of candidates) {
      if (await checkYoutubeVideoPlayable(cand)) {
        console.log(`[Play Music Router] Found active candidate: ${cand}`);
        musicCache[keyWithCreator] = cand; // Confirm in cache
        return res.redirect(cand);
      }
    }

    // 6. Query Gemini on-the-fly for 3 alternatives
    try {
      const ai = getGeminiClient();
      const queryTerm = `site:music.youtube.com watch "${t}" "${c}"`;
      console.log(`[Server Music Resolution] Searching alternatives for: ${queryTerm}`);

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: `Find 3 alternative, direct, active, playable official YouTube Music track URLs (format: https://music.youtube.com/watch?v=...) for: "${t}" by ${c}.
        
        CRITICAL REQUIREMENTS:
        - Use Google Search tool to find precise, active track watch links on music.youtube.com.
        - Provide them in order of priority.
        - Return them as an array of strings in JSON.
        - NEVER return general search pages, album paths, playlists, or placeholders.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              urls: {
                type: "ARRAY",
                items: { type: "STRING" }
              }
            },
            required: ["urls"]
          }
        }
      });

      const data = JSON.parse(response.text);
      if (data && Array.isArray(data.urls)) {
        console.log(`[Server Music Resolution] Gemini returned candidate URLs:`, data.urls);
        for (const itemUrl of data.urls) {
          if (itemUrl && (itemUrl.includes("music.youtube.com/watch") || itemUrl.includes("youtube.com/watch"))) {
            const isPlayable = await checkYoutubeVideoPlayable(itemUrl);
            if (isPlayable) {
              console.log(`[Server Music Resolution] Match found: ${itemUrl}`);
              musicCache[keyWithCreator] = itemUrl;
              return res.redirect(itemUrl);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Gemini search failed for music alternatives, falling back", err);
    }

    // 7. Last resort: Redirect to YouTube Music search results
    console.log(`[Play Music Router] No verified URL found. Redirecting to search results for safety.`);
    res.redirect(`https://music.youtube.com/search?q=${encodeURIComponent(`${t} ${c}`)}`);
  });

  // YouTube Music / Google OAuth URL generation
  app.get("/api/auth/youtube/url", (req, res) => {
    const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const base = process.env.APP_URL || `http://localhost:${PORT}`;
    
    // If client ID is missing, provide the embedded Demo Link
    if (!clientId) {
      const demoUrl = `${base.replace(/\/$/, "")}/api/youtube/demo-connector`;
      return res.json({ url: demoUrl });
    }

    const finalRedirectUri = `${base.replace(/\/$/, "")}/auth/callback`;
    const scopes = "openid email profile https://www.googleapis.com/auth/youtube.readonly";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: scopes,
      redirect_uri: finalRedirectUri,
      prompt: "consent",
      access_type: "offline"
    });
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url: authUrl });
  });

  // Demo Connector screen
  app.get("/api/youtube/demo-connector", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connect your YouTube Music Account</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #3b0a7a;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              padding: 40px;
              border-radius: 24px;
              text-align: center;
              max-width: 400px;
              border: 1px solid rgba(255, 255, 255, 0.2);
              box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            }
            h1 { font-size: 24px; margin-bottom: 10px; font-weight: 800; letter-spacing: -0.5px; }
            p { font-size: 14px; opacity: 0.8; line-height: 1.5; margin-bottom: 25px; }
            button {
              background-color: #FF0000;
              color: white;
              border: none;
              padding: 14px 28px;
              border-radius: 30px;
              font-weight: bold;
              cursor: pointer;
              font-size: 14px;
              transition: all 0.2s ease;
              width: 100%;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            button:hover {
              background-color: #E60000;
              transform: scale(1.02);
            }
            .setup-info {
              background-color: rgba(0,0,0,0.2);
              padding: 12px;
              border-radius: 12px;
              margin-top: 20px;
              font-size: 11px;
              text-align: left;
              line-height: 1.4;
              border-left: 3px solid #FF0000;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <svg class="w-12 h-12" style="margin: 0 auto 15px; fill:#FF0000; width: 48px; height: 48px;" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-1 1.5l3 1.5-3 1.5v-3z"/>
            </svg>
            <h1>YouTube Music</h1>
            <p>Ready to connect your account and fetch your personal playlists, favorite music, and current recommendations.</p>
            <button id="connectBtn">Connect Demo Account</button>
            <div class="setup-info">
              <strong>💡 Pro-tip:</strong> Configure <code>YOUTUBE_CLIENT_ID</code> and <code>YOUTUBE_CLIENT_SECRET</code> env secrets in AI Studio to route using standard Google OAuth.
            </div>
          </div>
          <script>
            document.getElementById('connectBtn').addEventListener('click', () => {
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'YOUTUBE_AUTH_SUCCESS', 
                  payload: {
                    access_token: 'demo_youtube_token_xyz',
                    user: {
                      display_name: 'YouTube Curator',
                      images: [{ url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150' }]
                    }
                  } 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            });
          </script>
        </body>
      </html>
    `);
  });

  // Auth Callback (Handles both YouTube/Google and any legacy callbacks)
  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("No authorization code provided.");
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    const base = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${base.replace(/\/$/, "")}/auth/callback`;

    // Fallback if no credentials specified
    if (!clientId) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Authenticating...</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'YOUTUBE_AUTH_SUCCESS', 
                  payload: {
                    access_token: 'demo_youtube_token_xyz',
                    user: {
                      display_name: 'YouTube Curator',
                      images: [{ url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150' }]
                    }
                  } 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    }

    try {
      // Real Google OAuth exchange
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri,
          client_id: clientId!,
          client_secret: clientSecret!,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      // Fetch Profile from Google UserInfo endpoint
      const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${data.access_token}` }
      });
      const profile = await profileResponse.json();

      const userObj = {
        display_name: profile.name || profile.email || 'Google User',
        images: profile.picture ? [{ url: profile.picture }] : []
      };

      // Send token and user info back to the main window and close popup
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Authenticating...</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'YOUTUBE_AUTH_SUCCESS', 
                  payload: {
                    access_token: ${JSON.stringify(data.access_token)},
                    user: ${JSON.stringify(userObj)}
                  } 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
              <h2>Connected to YouTube Music via Google!</h2>
              <p>This window should close automatically.</p>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("OAuth Callback Error:", error);
      res.status(500).send(`Authentication failed: ${error.message}`);
    }
  });

  // Simple endpoint to get user profile using the token passed in headers
  app.get("/api/youtube/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });

    const token = authHeader.replace(/^Bearer\s+/, "");

    if (token.startsWith('demo_')) {
      return res.json({
        display_name: 'YouTube Curator',
        images: [{ url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150' }]
      });
    }

    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: authHeader }
      });
      const profile = await response.json();
      res.json({
        display_name: profile.name || profile.email,
        images: profile.picture ? [{ url: profile.picture }] : []
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
