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
  },
  {
    id: "rosalia-despecha",
    type: "music",
    title: "DESPECHÁ",
    creator: "Rosalía",
    description: "An infectious, chart-topping summer anthem blending mambo, electropop, and Latin pop by the Spanish singer-songwriter Rosalía.",
    genres: ["Pop", "Latin", "Electronic"],
    year: "2022",
    imageUrl: "https://i.scdn.co/image/ab67616d0000b273b54dcedd6d1b7ee2e27ed603",
    externalUrl: "https://music.youtube.com/watch?v=yYSTpT_S0-Y",
    trailerUrl: "https://www.youtube.com/watch?v=yYSTpT_S0-Y"
  },
  {
    id: "rosalia-malamente",
    type: "music",
    title: "Malamente",
    creator: "Rosalía",
    description: "The breakthrough flamenco-pop masterpiece with alternative R&B elements that launched Rosalía to international global acclaim.",
    genres: ["Pop", "Nuevo Flamenco", "Alternative"],
    year: "2018",
    imageUrl: "https://i.scdn.co/image/ab67616d0000b27393437de91d29d91f2400e960",
    externalUrl: "https://music.youtube.com/watch?v=Rht7rBHuN7g",
    trailerUrl: "https://www.youtube.com/watch?v=Rht7rBHuN7g"
  },
  {
    id: "rosalia-bizcochito",
    type: "music",
    title: "BIZCOCHITO",
    creator: "Rosalía",
    description: "A playful, hyperpop-influenced Latin track from her Grammy-winning and critically acclaimed album MOTOMAMI.",
    genres: ["Pop", "Latin Avant-garde", "Synthpop"],
    year: "2022",
    imageUrl: "https://i.scdn.co/image/ab67616d0000b273b54dcedd6d1b7ee2e27ed603",
    externalUrl: "https://music.youtube.com/watch?v=a5Z96y8A8V0",
    trailerUrl: "https://www.youtube.com/watch?v=a5Z96y8A8V0"
  },
  {
    id: "rosalia-la-fama",
    type: "music",
    title: "La Fama (feat. The Weeknd)",
    creator: "Rosalía",
    description: "A sultry and haunting bachata track exploring the obsession, tragedy, and superficiality of fame.",
    genres: ["Pop", "Latin", "Bachata"],
    year: "2021",
    imageUrl: "https://i.scdn.co/image/ab67616d0000b273b54dcedd6d1b7ee2e27ed603",
    externalUrl: "https://music.youtube.com/watch?v=e-CEd4VUXLg",
    trailerUrl: "https://www.youtube.com/watch?v=e-CEd4VUXLg"
  }
];

function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function clientFallbackSearch(query: string): BaseItem[] {
  const q = query.toLowerCase().trim();

  // Expanded high-fidelity backup database to ensure gorgeous results offline
  const EXTENDED_STATIC_ITEMS: BaseItem[] = [
    {
      id: "yellow",
      type: "music",
      title: "Yellow",
      creator: "Coldplay",
      description: "A legendary alternative rock anthem that launched Coldplay to international fame.",
      genres: ["Rock", "Alternative"],
      year: "2000",
      imageUrl: "https://i.scdn.co/image/ab67616d0000b273e0428d08cb50d754dc979140",
      externalUrl: "https://music.youtube.com/watch?v=yKNxeF4KxyY",
      trailerUrl: "https://www.youtube.com/watch?v=yKNxeF4KxyY"
    },
    {
      id: "fix-you",
      type: "music",
      title: "Fix You",
      creator: "Coldplay",
      description: "An emotionally outstanding alternative rock ballad known for its swell-to-crescendo organ and guitars.",
      genres: ["Rock", "Alternative"],
      year: "2005",
      imageUrl: "https://i.scdn.co/image/ab67616d0000b27329590059c2e118dcd37d3635",
      externalUrl: "https://music.youtube.com/watch?v=k4V3Mo61fJM",
      trailerUrl: "https://www.youtube.com/watch?v=k4V3Mo61fJM"
    },
    {
      id: "viva-la-vida",
      type: "music",
      title: "Viva La Vida",
      creator: "Coldplay",
      description: "An orchestral pop-rock masterpiece featuring lush string arrangements and historic lyrics.",
      genres: ["Rock", "Pop"],
      year: "2008",
      imageUrl: "https://i.scdn.co/image/ab67616d0000b273822da33fdf081c7ffcc7a2f2",
      externalUrl: "https://music.youtube.com/watch?v=dvgZkm1xWPE",
      trailerUrl: "https://www.youtube.com/watch?v=dvgZkm1xWPE"
    },
    {
      id: "the-scientist",
      type: "music",
      title: "The Scientist",
      creator: "Coldplay",
      description: "A melancholy piano-driven ballad about a desire to start over in a broken relationship.",
      genres: ["Rock", "Alternative"],
      year: "2002",
      imageUrl: "https://i.scdn.co/image/ab67616d0000b273de03be95ca8b68aa4a2ff4ef",
      externalUrl: "https://music.youtube.com/watch?v=RB-RcX5DS5A",
      trailerUrl: "https://www.youtube.com/watch?v=RB-RcX5DS5A"
    },
    {
      id: "clocks",
      type: "music",
      title: "Clocks",
      creator: "Coldplay",
      description: "An iconic piano-riff driven alternative rock track that won Record of the Year at the Grammy Awards.",
      genres: ["Rock", "Alternative"],
      year: "2002",
      imageUrl: "https://i.scdn.co/image/ab67616d0000b273822da33fdf081c7ffcc7a2f2",
      externalUrl: "https://music.youtube.com/watch?v=d020hcgZ_QI",
      trailerUrl: "https://www.youtube.com/watch?v=d020hcgZ_QI"
    },
    {
      id: "creep",
      type: "music",
      title: "Creep",
      creator: "Radiohead",
      description: "An iconic alternative rock ballad about unrequited love and self-doubt.",
      genres: ["Rock", "Alternative"],
      year: "1992",
      imageUrl: "https://i.scdn.co/image/ab67616d0000b2730ca99e69da79fe37ef6ba8ee",
      externalUrl: "https://music.youtube.com/watch?v=XFkzRNyygfk",
      trailerUrl: "https://www.youtube.com/watch?v=XFkzRNyygfk"
    },
    {
      id: "bohemian-rhapsody",
      type: "music",
      title: "Bohemian Rhapsody",
      creator: "Queen",
      description: "A legendary operatic rock suite featuring multi-section structures and majestic vocal harmonies.",
      genres: ["Rock"],
      year: "1975",
      imageUrl: "https://i.scdn.co/image/ab67616d0000b273c59a68da560cb6c5be8a3b50",
      externalUrl: "https://music.youtube.com/watch?v=fJ9rUzIMcZQ",
      trailerUrl: "https://www.youtube.com/watch?v=fJ9rUzIMcZQ"
    },
    {
      id: "save-your-tears",
      type: "music",
      title: "Save Your Tears",
      creator: "The Weeknd",
      description: "An upbeat synth-pop and disco song diving into heartbreak and avoidance.",
      genres: ["Pop", "Synthpop"],
      year: "2020",
      imageUrl: "https://i.scdn.co/image/ab67616d0000b273c387b1ff4bc1e2eb3111b1e1",
      externalUrl: "https://music.youtube.com/watch?v=XXYlFuWEuKI",
      trailerUrl: "https://www.youtube.com/watch?v=XXYlFuWEuKI"
    },
    {
      id: "the-hills",
      type: "music",
      title: "The Hills",
      creator: "The Weeknd",
      description: "A dark alternative R&B and trap record expressing lust, escape, and midnight desires.",
      genres: ["Pop", "R&B"],
      year: "2015",
      imageUrl: "https://i.scdn.co/image/ab67616d0000b2737fbc0aa7937397984852ee3f",
      externalUrl: "https://music.youtube.com/watch?v=yzTuBuLH9Dg",
      trailerUrl: "https://www.youtube.com/watch?v=yzTuBuLH9Dg"
    },
    {
      id: "what-was-i-made-for",
      type: "music",
      title: "What Was I Made For?",
      creator: "Billie Eilish",
      description: "A fragile, heart-wrenching piano ballad written for the Barbie film soundtrack.",
      genres: ["Pop"],
      year: "2023",
      imageUrl: "https://i.scdn.co/image/ab67616d0000b2730b201f9ce06ad90bbfacff48",
      externalUrl: "https://music.youtube.com/watch?v=cW8V0gNu5I8",
      trailerUrl: "https://www.youtube.com/watch?v=cW8V0gNu5I8"
    },
    {
      id: "ocean-eyes",
      type: "music",
      title: "Ocean Eyes",
      creator: "Billie Eilish",
      description: "A dreamy indie-pop and bedroom-pop song that first broke Billie Eilish into mainstream notice.",
      genres: ["Pop"],
      year: "2016",
      imageUrl: "https://i.scdn.co/image/ab67616d0000b273062630ab5820ee75cf52eb73",
      externalUrl: "https://music.youtube.com/watch?v=viimfQi_pUw",
      trailerUrl: "https://www.youtube.com/watch?v=viimfQi_pUw"
    },
    {
      id: "blank-space",
      type: "music",
      title: "Blank Space",
      creator: "Taylor Swift",
      description: "An electro-pop masterpiece satirizing media portrayals of Swift's personal relationships.",
      genres: ["Pop", "Synthpop"],
      year: "2014",
      imageUrl: "https://i.scdn.co/image/ab67616d0000b273574af667794356cbd78b1735",
      externalUrl: "https://music.youtube.com/watch?v=e-ORhEE9VVg",
      trailerUrl: "https://www.youtube.com/watch?v=e-ORhEE9VVg"
    },
    {
      id: "cruel-summer",
      type: "music",
      title: "Cruel Summer",
      creator: "Taylor Swift",
      description: "An infectious, synth-driven pop anthem describing an intense summer romance.",
      genres: ["Pop", "Synthpop"],
      year: "2019",
      imageUrl: "https://i.scdn.co/image/ab67616d0000b273e787cffec20aa2a196c61860",
      externalUrl: "https://music.youtube.com/watch?v=ic8j13gFLzc",
      trailerUrl: "https://www.youtube.com/watch?v=ic8j13gFLzc"
    },
    {
      id: "oppenheimer",
      type: "movie",
      title: "Oppenheimer",
      creator: "Christopher Nolan",
      description: "The biographical epic chronicling the life of J. Robert Oppenheimer and his role in the development of the atomic bomb.",
      genres: ["Drama"],
      year: "2023",
      imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/8Gxv2gSjBeYFwt6ZidR29Clq7Sg.jpg",
      externalUrl: "https://www.themoviedb.org/movie/872585-oppenheimer",
      trailerUrl: "https://www.youtube.com/watch?v=uYPbbksJxIg"
    },
    {
      id: "dunkirk",
      type: "movie",
      title: "Dunkirk",
      creator: "Christopher Nolan",
      description: "Allied soldiers from Belgium, the British Empire, and France are surrounded by the German Army and evacuated during a fierce World War II battle.",
      genres: ["Action", "Drama"],
      year: "2017",
      imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/ebZg3aCO9b4vo3Wcc67bZ9I7Z6B.jpg",
      externalUrl: "https://www.themoviedb.org/movie/374720-dunkirk",
      trailerUrl: "https://www.youtube.com/watch?v=F-eMt3GrSL8"
    },
    {
      id: "inglourious-basterds",
      type: "movie",
      title: "Inglourious Basterds",
      creator: "Quentin Tarantino",
      description: "In Nazi-occupied France during World War II, a group of Jewish U.S. soldiers plan to assassinate German leaders.",
      genres: ["Action", "Drama"],
      year: "2009",
      imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/w9g3i6m7r8unfofm99g98dfvsm8.jpg",
      externalUrl: "https://www.themoviedb.org/movie/19995-inglourious-basterds",
      trailerUrl: "https://www.youtube.com/watch?v=KnrRy6kSFI0"
    },
    {
      id: "django-unchained",
      type: "movie",
      title: "Django Unchained",
      creator: "Quentin Tarantino",
      description: "With the help of a German bounty-hunter, a freed slave sets out to rescue his wife from a brutal Mississippi plantation owner.",
      genres: ["Drama"],
      year: "2012",
      imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/78N9h07m887b47zDscO06g77651.jpg",
      externalUrl: "https://www.themoviedb.org/movie/68718-django-unchained",
      trailerUrl: "https://www.youtube.com/watch?v=0fUCuvNlOCg"
    },
    {
      id: "jurassic-park",
      type: "movie",
      title: "Jurassic Park",
      creator: "Steven Spielberg",
      description: "A pragmatic paleontologist touring an island dinosaur theme park must protect visitors when a power failure unleashes the beasts.",
      genres: ["Sci-Fi", "Adventure"],
      year: "1993",
      imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/o90696316262w874312693898216.jpg",
      externalUrl: "https://www.themoviedb.org/movie/329-jurassic-park",
      trailerUrl: "https://www.youtube.com/watch?v=QWBKEDPE_aM"
    },
    {
      id: "saving-private-ryan",
      type: "movie",
      title: "Saving Private Ryan",
      creator: "Steven Spielberg",
      description: "Following the Normandy Landings, a group of U.S. soldiers go behind enemy lines to retrieve a paratrooper whose brothers have been killed in action.",
      genres: ["Drama"],
      year: "1998",
      imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/uq839Lzi8fCHfctclv6v89CH0vO.jpg",
      externalUrl: "https://www.themoviedb.org/movie/857-saving-private-ryan",
      trailerUrl: "https://www.youtube.com/watch?v=9CzZ8_O_yY4"
    },
    {
      id: "the-matrix",
      type: "movie",
      title: "The Matrix",
      creator: "Lana Wachowski, Lilly Wachowski (Starring Keanu Reeves)",
      description: "When a computer hacker Neo discovers the shocking truth that the life he knows is an elaborate virtual deception, he decides to fight.",
      genres: ["Sci-Fi", "Action"],
      year: "1999",
      imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/f89U3w7n0gjf6s683e9873d6e50.jpg",
      externalUrl: "https://www.themoviedb.org/movie/603-the-matrix",
      trailerUrl: "https://www.youtube.com/watch?v=vKQi3bBA1y8"
    },
    {
      id: "john-wick",
      type: "movie",
      title: "John Wick",
      creator: "Chad Stahelski (Starring Keanu Reeves)",
      description: "An ex-hit-man comes out of retirement to track down the gangsters that killed his dog and took everything from him.",
      genres: ["Action", "Thriller"],
      year: "2014",
      imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/fZ7b7b1b5e679803ae.jpg",
      externalUrl: "https://www.themoviedb.org/movie/245891-john-wick",
      trailerUrl: "https://www.youtube.com/watch?v=2AUmvWm5R1s"
    },
    {
      id: "fight-club",
      type: "movie",
      title: "Fight Club",
      creator: "David Fincher (Starring Brad Pitt)",
      description: "An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into much more.",
      genres: ["Drama", "Thriller"],
      year: "1999",
      imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/bptfVcl691qqO66vms68a8fct.jpg",
      externalUrl: "https://www.themoviedb.org/movie/550-fight-club",
      trailerUrl: "https://www.youtube.com/watch?v=qtRKdVHc-cE"
    },
    {
      id: "seven",
      type: "movie",
      title: "Se7en",
      creator: "David Fincher (Starring Brad Pitt)",
      description: "Two detectives, a rookie and a veteran, hunt a serial killer who uses the seven deadly sins as his motives.",
      genres: ["Thriller", "Crime"],
      year: "1995",
      imageUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/or687786g987uivr98u.jpg",
      externalUrl: "https://www.themoviedb.org/movie/47-seven",
      trailerUrl: "https://www.youtube.com/watch?v=znmZoYm7tGM"
    }
  ];

  // Combine standard BACKUP_ITEMS and our high-fidelity EXTENDED_STATIC_ITEMS deduplicating safely
  const uniqueItemsMap = new Map<string, BaseItem>();
  for (const item of [...BACKUP_ITEMS, ...EXTENDED_STATIC_ITEMS]) {
    const key = `${item.title.toLowerCase()}|||${item.creator.toLowerCase()}`;
    uniqueItemsMap.set(key, item);
  }
  const allItems = Array.from(uniqueItemsMap.values());

  const normQuery = normalizeString(query);
  if (!normQuery) return [];

  // Define exact match & close keywords for genre identification
  const genreKeywords: Record<string, string[]> = {
    "sci-fi": ["sci-fi", "science fiction", "ciencia ficcion", "espacio", "space", "ficcion", "fiction", "alien", "galaxy"],
    "action": ["action", "accion", "fight", "combate", "disparos", "peleas"],
    "drama": ["drama", "dramatico", "llorar", "melodrama", "sad", "triste"],
    "comedy": ["comedy", "comedia", "risa", "funny", "gracioso", "humor", "bromas"],
    "romance": ["romance", "romantica", "romantic", "amor", "love", "pareja"],
    "thriller": ["thriller", "suspense", "crimen", "crime", "terro", "horror", "miedo"],
    "pop": ["pop", "musica pop", "pop music", "cantante pop"],
    "rock": ["rock", "musica rock", "indie", "alternative", "band"]
  };

  // 1. FIRST, ATTEMPT TO FIND SPECIFIC WORK/TITLE MATCH (Exact or close substring)
  const exactTitleMatch = allItems.find(
    item => normQuery === normalizeString(item.title)
  );
  if (exactTitleMatch) {
    const related = allItems.filter(
      item => item.id !== exactTitleMatch.id && 
              (item.type === exactTitleMatch.type || item.genres.some(g => exactTitleMatch.genres.includes(g)))
    );
    return [exactTitleMatch, ...related].slice(0, 12);
  }

  const partialTitleMatch = allItems.find(
    item => normalizeString(item.title).includes(normQuery) || normQuery.includes(normalizeString(item.title))
  );
  if (partialTitleMatch) {
    const related = allItems.filter(
      item => item.id !== partialTitleMatch.id && 
              (item.type === partialTitleMatch.type || item.genres.some(g => partialTitleMatch.genres.includes(g)))
    );
    return [partialTitleMatch, ...related].slice(0, 12);
  }

  // 2. SECOND, ATTEMPT TO FIND ARTIST/CREATOR MATCH (e.g. "Coldplay", "Nolan", "Keanu", "Pitt")
  const artistMatches = allItems.filter(
    item => normalizeString(item.creator).includes(normQuery) || normQuery.includes(normalizeString(item.creator))
  );
  if (artistMatches.length > 0) {
    if (artistMatches.length < 6) {
      const otherSameType = allItems.filter(
        item => !artistMatches.some(am => am.id === item.id) && item.type === artistMatches[0].type
      );
      return [...artistMatches, ...otherSameType].slice(0, 12);
    }
    return artistMatches.slice(0, 12);
  }

  // 3. THIRD, ATTEMPT TO FIND GENRE MATCH 
  let matchedGenre: string | null = null;
  for (const [genreName, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some(kw => normQuery.includes(kw))) {
      matchedGenre = genreName;
      break;
    }
  }

  if (matchedGenre) {
    const genreResults = allItems.filter(item => 
      item.genres.some(g => normalizeString(g).includes(matchedGenre!))
    );
    if (genreResults.length > 0) {
      return genreResults.slice(0, 12);
    }
  }

  // 4. GENERAL SUBSTRING FILTER ON THE ENTIRE CATALOG
  const generalMatches = allItems.filter(item => 
    normalizeString(item.title).includes(normQuery) ||
    normalizeString(item.creator).includes(normQuery) ||
    item.genres.some(g => normalizeString(g).includes(normQuery)) ||
    (item.description && normalizeString(item.description).includes(normQuery))
  );

  if (generalMatches.length > 0) {
    if (generalMatches.length < 6) {
      const remaining = allItems.filter(item => !generalMatches.some(gm => gm.id === item.id));
      return [...generalMatches, ...remaining].slice(0, 12);
    }
    return generalMatches.slice(0, 12);
  }

  // 5. LAST RESORT DYNAMIC ITEM GENERATOR (if completely unknown query)
  const isMusicKeywords = ["song", "music", "sing", "album", "artist", "band", "soundtrack", "beat", "voice", "melody"].some(k => normQuery.includes(k));
  const isSeriesKeywords = ["show", "series", "season", "episode", "tv"].some(k => normQuery.includes(k));

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
      description: `A masterclass showcasing the rich design, styling, and cultural influence of ${cleanTitle}.`,
      genres: detectedGenres,
      year: "2024",
      imageUrl: defaultPoster,
      externalUrl: defaultExternal,
      trailerUrl: defaultTrailer
    },
    {
      id: `dyn-2-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      type: detectedType === "music" ? "movie" : "music",
      title: detectedType === "music" ? `${cleanTitle} (Official Soundtrack)` : `${cleanTitle} - Main Theme`,
      creator: "Creative Studio",
      description: `A stunning artistic and thematic counterpart inspired by the premium atmosphere of ${cleanTitle}.`,
      genres: ["Alternative", "Indie"],
      year: "2025",
      imageUrl: detectedType === "music"
        ? "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600"
        : "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600",
      externalUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}`,
      trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}+trailer`
    },
    {
      id: `dyn-3-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      type: "music",
      title: `${cleanTitle} (Remix & Extended Version)`,
      creator: "DJ Remix Lab",
      description: `An official energetic electronic remix maximizing the soundscapes of ${cleanTitle}.`,
      genres: ["Electronic", "Dance"],
      year: "2024",
      imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600",
      externalUrl: `https://music.youtube.com/search?q=${encodeURIComponent(cleanTitle)}+remix`,
      trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}+remix`
    },
    {
      id: `dyn-4-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      type: "movie",
      title: `The Story of ${cleanTitle}`,
      creator: "Historical Docs",
      description: `An intimate and award-winning documentary diving deep into the history and making of ${cleanTitle}.`,
      genres: ["Documentary", "Biography"],
      year: "2023",
      imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600",
      externalUrl: `https://www.youtube.com/results?search_query=The+story+of+${encodeURIComponent(cleanTitle)}`,
      trailerUrl: `https://www.youtube.com/results?search_query=The+story+of+${encodeURIComponent(cleanTitle)}+official+trailer`
    },
    {
      id: `dyn-5-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      type: "series",
      title: `${cleanTitle} (Origins: Part One)`,
      creator: "Show Runner",
      description: `The acclaimed critically-reviewed spin-off miniseries exploring the genesis of the ${cleanTitle} universe.`,
      genres: ["Drama", "Sci-Fi"],
      year: "2026",
      imageUrl: "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?w=600",
      externalUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}+origins`,
      trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}+origins+trailer`
    },
    {
      id: `dyn-6-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      type: detectedType,
      title: `${cleanTitle} Live Session`,
      creator: "Acoustic Sessions",
      description: `Ambiance recordings showcasing a pristine unplugged acoustic performance of ${cleanTitle}.`,
      genres: ["Live", "Acoustic"],
      year: "2025",
      imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600",
      externalUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}+live+performance`,
      trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}+live+performance`
    }
  ];

  // Pad with top real media suggestions
  const recommendations = allItems.filter(
    item => item.type === detectedType && !item.id.includes("rosalia")
  );

  return [...dynamicItems, ...recommendations].slice(0, 12);
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
