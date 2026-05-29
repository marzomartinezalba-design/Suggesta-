import { GoogleGenAI, Type } from "@google/genai";
import { BaseItem, ItemType } from "../types";

const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

export async function generateItemInfo(query: string, typeHint?: ItemType): Promise<BaseItem | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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

    const data = JSON.parse(response.text);
    return data;
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}

export async function searchItemsAI(query: string): Promise<BaseItem[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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

    const items: BaseItem[] = JSON.parse(response.text);
    return items;
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
}

export async function generateInitialRecommendations(item: BaseItem): Promise<{ title: string; type: ItemType; reason: string }[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Given the item "${item.title}" (${item.type}) by ${item.creator}, recommend 3 other items (mix of music, movies, series) that someone who likes it would enjoy. Response in JSON list.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["music", "movie", "series"] },
              reason: { type: Type.STRING },
            },
            required: ["title", "type", "reason"],
          },
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Recs Error:", error);
    return [];
  }
}

const reviewsCache: Record<string, any[]> = {};
const recsCache: Record<string, any[]> = {};

export async function generateCommunityReviews(item: BaseItem): Promise<{ userName: string; rating: number; comment: string }[]> {
  if (reviewsCache[item.id]) return reviewsCache[item.id];
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 diverse, very short reviews for "${item.title}" by ${item.creator}. 
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

    const reviews = JSON.parse(response.text);
    reviewsCache[item.id] = reviews;
    return reviews;
  } catch (error) {
    console.error("Gemini Reviews Error:", error);
    return [];
  }
}

export async function generateCommunityRecommendations(item: BaseItem): Promise<any[]> {
  if (recsCache[item.id]) return recsCache[item.id];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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

    const data = JSON.parse(response.text);
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
    console.error("Gemini Recommendations Error:", error);
    return [];
  }
}
