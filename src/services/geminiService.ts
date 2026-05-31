import { BaseItem, ItemType } from "../types";

const reviewsCache: Record<string, any[]> = {};
const recsCache: Record<string, any[]> = {};

// Helper to make POST requests to server-side Gemini Proxy routes
async function apiPost(endpoint: string, body: object): Promise<any> {
  const response = await fetch(endpoint, {
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
    return null;
  }
}

export async function searchItemsAI(query: string): Promise<BaseItem[]> {
  try {
    return await apiPost("/api/gemini/search", { query });
  } catch (error) {
    console.error("searchItemsAI Error calling server:", error);
    return [];
  }
}

export async function generateInitialRecommendations(item: BaseItem): Promise<{ title: string; type: ItemType; reason: string }[]> {
  // Fallback signature to maintain typing compatibility in the client application code
  return [];
}

export async function generateCommunityReviews(item: BaseItem): Promise<{ userName: string; rating: number; comment: string }[]> {
  if (reviewsCache[item.id]) return reviewsCache[item.id];
  
  try {
    const reviews = await apiPost("/api/gemini/reviews", { item });
    reviewsCache[item.id] = reviews;
    return reviews;
  } catch (error) {
    console.error("generateCommunityReviews Error calling server:", error);
    return [];
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
    console.error("generateCommunityRecommendations Error calling server:", error);
    return [];
  }
}
