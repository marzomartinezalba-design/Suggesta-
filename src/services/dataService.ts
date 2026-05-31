import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  onSnapshot,
  getDocFromServer,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { BaseItem, Review, Recommendation, ItemType, UserProfile } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Silence error if it's just missing document, but log if offline
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

const DEFAULT_PROFILE: UserProfile = {
  name: 'Culture Curator',
  avatarUrl: '',
  isAuthenticated: false
};

const INITIAL_ITEMS: BaseItem[] = [
  {
    id: 'mean-girls',
    type: 'movie',
    title: 'Mean Girls',
    creator: 'Mark Waters',
    description: 'Cady Heron is a hit with The Plastics, the A-list girl clique at her new school, until she makes the mistake of falling for Aaron Samuels, the ex-boyfriend of alpha Plastic Regina George.',
    imageUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/fXDsBSpR6v9KeLZQWo789vpkK9M.jpg',
    genres: ['Comedy', 'Teen'],
    year: '2004',
    externalUrl: 'https://www.themoviedb.org/movie/10625-mean-girls'
  },
  {
    id: 'obsessed',
    type: 'music',
    title: 'Obsessed',
    creator: 'Mariah Carey',
    description: 'A sassy pop and R&B song by American singer and songwriter Mariah Carey.',
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b27341fe817f54c9c61bf9c10444',
    genres: ['Pop', 'R&B'],
    year: '2009',
    externalUrl: 'https://open.spotify.com/track/5enY774EwOllZ5I13L7j5u'
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
    externalUrl: 'https://www.themoviedb.org/movie/9603-clueless'
  },
  {
    id: 'galactic-war',
    type: 'movie',
    title: 'Galactic War',
    creator: 'Chris Watson',
    description: 'In a devastated future, an interdimensional portal unleashes an alien invasion on Earth. An elite squad crosses to the other side to stop it, but discovers that the invaders are fleeing from an even greater threat. Now, they must decide whether to save their world... or the entire universe.',
    imageUrl: '/src/assets/images/galactic_war_1779863110135.png',
    genres: ['Sci-Fi', 'Action', 'Adventure'],
    year: '2026',
    externalUrl: 'https://www.youtube.com/results?search_query=Galactic+War+official+trailer'
  },
  {
    id: 'blade-runner-2049-soundtrack',
    type: 'music',
    title: 'Blade Runner 2049 (Original Motion Picture Soundtrack)',
    creator: 'Hans Zimmer & Benjamin Wallfisch',
    description: 'The hauntingly beautiful and atmospheric synthesized score for Denis Villeneuve\'s Neo-Noir Sci-Fi masterpiece Blade Runner 2049, composed by Hans Zimmer and Benjamin Wallfisch.',
    imageUrl: '/src/assets/images/br2049_album_1779863139111.png',
    genres: ['Electronic', 'Ambient', 'Soundtrack'],
    year: '2017',
    externalUrl: 'https://music.youtube.com/search?q=Blade+Runner+2049+Soundtrack'
  },
  {
    id: 'oblivion',
    type: 'movie',
    title: 'Oblivion',
    creator: 'Joseph Kosinski',
    description: 'A veteran assigned to extract Earth\'s remaining resources confronts a mysterious past and a truth that changes his life.',
    imageUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/hm6SIsyO730j48S3fX8UoE10X3M.jpg',
    genres: ['Sci-Fi', 'Action', 'Mystery'],
    year: '2013',
    externalUrl: 'https://www.themoviedb.org/movie/75612-oblivion'
  }
];

const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    itemId: 'mean-girls',
    userId: 'system',
    userName: 'Regina G.',
    rating: 5,
    comment: 'Literally the most fetch movie ever made. I watch it every Wednesday while wearing pink.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24
  },
  {
    id: 'rev-2',
    itemId: 'clueless',
    userId: 'system',
    userName: 'Cher H.',
    rating: 5,
    comment: 'As if! This movie is a total classic. My wardrobe needs a computerized upgrade like hers.',
    createdAt: Date.now() - 1000 * 60 * 60 * 48
  },
  {
    id: 'rev-gw-1',
    itemId: 'galactic-war',
    userId: 'system',
    userName: 'Alex M.',
    rating: 4,
    comment: 'Entertaining and intense, although the story is a bit predictable.',
    createdAt: Date.now() - 1000 * 60 * 60 * 5
  },
  {
    id: 'rev-gw-2',
    itemId: 'galactic-war',
    userId: 'system',
    userName: 'Elena R.',
    rating: 4,
    comment: 'The special effects are spectacular, but I felt a lack of depth in the characters.',
    createdAt: Date.now() - 1000 * 60 * 60 * 10
  },
  {
    id: 'rev-gw-3',
    itemId: 'galactic-war',
    userId: 'system',
    userName: 'Marc T.',
    rating: 5,
    comment: 'A surprise! It blends action and mystery very well with an interesting twist.',
    createdAt: Date.now() - 1000 * 60 * 60 * 15
  },
  {
    id: 'rev-gw-4',
    itemId: 'galactic-war',
    userId: 'system',
    userName: 'Sofia P.',
    rating: 4,
    comment: "Highly reminiscent of Denis Villeneuve's work, especially Dune.",
    createdAt: Date.now() - 1000 * 60 * 60 * 20
  }
];

const INITIAL_RECS: Recommendation[] = [
  {
    id: 'rec-1',
    sourceItemId: 'mean-girls',
    targetItem: {
      id: 'clueless',
      type: 'movie',
      title: 'Clueless',
      creator: 'Amy Heckerling',
      description: 'Shallow, rich and socially successful Cher is at the top of her Beverly Hills high school\'s pecking order.',
      imageUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/899M7O9uivlT6pZ7tVbeT1H9d1H.jpg',
      genres: ['Comedy', 'Romance'],
      year: '1995',
      externalUrl: 'https://www.themoviedb.org/movie/9603-clueless'
    },
    userId: 'system',
    userName: 'PopCultureAddict',
    reason: 'If you love high school royalty and iconic fashion, you absolutely need to see Clueless after Mean Girls.',
    createdAt: Date.now() - 1000 * 60 * 60 * 12
  },
  {
    id: 'rec-gw-br',
    sourceItemId: 'galactic-war',
    targetItem: {
      id: 'blade-runner-2049-soundtrack',
      type: 'music',
      title: 'Blade Runner 2049 (Original Motion Picture Soundtrack)',
      creator: 'Hans Zimmer & Benjamin Wallfisch',
      description: 'The hauntingly beautiful and atmospheric synthesized score for Denis Villeneuve\'s Neo-Noir Sci-Fi masterpiece Blade Runner 2049, composed by Hans Zimmer and Benjamin Wallfisch.',
      imageUrl: '/src/assets/images/br2049_album_1779863139111.png',
      genres: ['Electronic', 'Ambient', 'Soundtrack'],
      year: '2017',
      externalUrl: 'https://music.youtube.com/search?q=Blade+Runner+2049+Soundtrack'
    },
    userId: 'system',
    userName: 'AmbientLover',
    reason: 'If you like the intense atmosphere of Galactic War, listen to the soundtrack of Blade Runner 2049 (Original Motion Picture Soundtrack), it shares the same ambient feel.',
    createdAt: Date.now() - 1000 * 60 * 60 * 3
  },
  {
    id: 'rec-gw-ob',
    sourceItemId: 'galactic-war',
    targetItem: {
      id: 'oblivion',
      type: 'movie',
      title: 'Oblivion',
      creator: 'Joseph Kosinski',
      description: 'A veteran assigned to extract Earth\'s remaining resources confronts a mysterious past and a truth that changes his life.',
      imageUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/hm6SIsyO730j48S3fX8UoE10X3M.jpg',
      genres: ['Sci-Fi', 'Action', 'Mystery'],
      year: '2013',
      externalUrl: 'https://www.themoviedb.org/movie/75612-oblivion'
    },
    userId: 'system',
    userName: 'VibeFinder',
    reason: 'It gave me total Oblivion vibes but with a touch of extra action.',
    createdAt: Date.now() - 1000 * 60 * 60 * 2
  }
];

export const dataService = {
  getProfile: async (userId: string): Promise<UserProfile> => {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return DEFAULT_PROFILE;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      return DEFAULT_PROFILE;
    }
  },

  updateProfile: async (userId: string, profile: UserProfile) => {
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, {
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        isAuthenticated: profile.isAuthenticated
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  },

  subscribeToItems: (callback: (items: BaseItem[]) => void) => {
    return onSnapshot(collection(db, 'items'), (snapshot) => {
      const dbItems = snapshot.docs.map(doc => doc.data() as BaseItem);
      const merged = [...dbItems];
      INITIAL_ITEMS.forEach(initItem => {
        if (!merged.some(item => item.id === initItem.id)) {
          merged.push(initItem);
        }
      });
      callback(merged);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'items');
      callback(INITIAL_ITEMS);
    });
  },

  subscribeToReviews: (callback: (reviews: Review[]) => void) => {
    return onSnapshot(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')), (snapshot) => {
      const dbReviews = snapshot.docs.map(doc => doc.data() as Review);
      const merged = [...dbReviews];
      INITIAL_REVIEWS.forEach(initReview => {
        if (!merged.some(rev => rev.id === initReview.id)) {
          merged.push(initReview);
        }
      });
      merged.sort((a, b) => b.createdAt - a.createdAt);
      callback(merged);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reviews');
      callback(INITIAL_REVIEWS);
    });
  },

  subscribeToRecommendations: (callback: (recs: Recommendation[]) => void) => {
    return onSnapshot(query(collection(db, 'recommendations'), orderBy('createdAt', 'desc')), (snapshot) => {
      const dbRecs = snapshot.docs.map(doc => doc.data() as Recommendation);
      const merged = [...dbRecs];
      INITIAL_RECS.forEach(initRec => {
        if (!merged.some(rec => rec.id === initRec.id)) {
          merged.push(initRec);
        }
      });
      merged.sort((a, b) => b.createdAt - a.createdAt);
      callback(merged);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'recommendations');
      callback(INITIAL_RECS);
    });
  },

  getStoredItems: async (): Promise<BaseItem[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, 'items'));
      const dbItems = querySnapshot.docs.map(doc => doc.data() as BaseItem);
      const merged = [...dbItems];
      INITIAL_ITEMS.forEach(initItem => {
        if (!merged.some(item => item.id === initItem.id)) {
          merged.push(initItem);
        }
      });
      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'items');
      return INITIAL_ITEMS;
    }
  },
  
  saveItem: async (item: BaseItem) => {
    try {
      const docRef = doc(db, 'items', item.id);
      await setDoc(docRef, item, { merge: true });
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `items/${item.id}`);
    }
  },

  getReviews: async (itemId?: string): Promise<Review[]> => {
    try {
      const reviewsCol = collection(db, 'reviews');
      const q = itemId 
        ? query(reviewsCol, where('itemId', '==', itemId), orderBy('createdAt', 'desc'))
        : query(reviewsCol, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Review);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'reviews');
      return [];
    }
  },

  addReview: async (review: Review) => {
    try {
      const docRef = doc(db, 'reviews', review.id);
      await setDoc(docRef, {
        ...review,
        createdAt: Date.now() // Use server timestamp logic in rules, client provides current time
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `reviews/${review.id}`);
    }
  },

  getRecommendations: async (sourceId?: string): Promise<Recommendation[]> => {
    try {
      const recsCol = collection(db, 'recommendations');
      const q = sourceId
        ? query(recsCol, where('sourceItemId', '==', sourceId), orderBy('createdAt', 'desc'))
        : query(recsCol, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Recommendation);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'recommendations');
      return [];
    }
  },

  addRecommendation: async (rec: Recommendation) => {
    try {
      const docRef = doc(db, 'recommendations', rec.id);
      await setDoc(docRef, {
        ...rec,
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `recommendations/${rec.id}`);
    }
  },

  searchItems: async (searchQuery: string): Promise<BaseItem[]> => {
     // For simplicity, we fetch all and filter in client (budget search)
     // Firestore doesn't support easy case-insensitive substring search without plugins/3rd party
     const allItems = await dataService.getStoredItems();
     const q = searchQuery.toLowerCase();
     return allItems.filter(item => 
       item.title.toLowerCase().includes(q) || 
       item.genres.some(g => g.toLowerCase().includes(q)) ||
       item.creator.toLowerCase().includes(q)
     );
  }
};
