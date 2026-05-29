/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ItemType = 'music' | 'movie' | 'series';

export interface BaseItem {
  id: string;
  type: ItemType;
  title: string;
  creator: string; // Artist, Director, etc.
  description: string;
  imageUrl: string;
  genres: string[];
  year?: string;
  externalUrl?: string;
  trailerUrl?: string;
}

export interface Review {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: number;
}

export interface Recommendation {
  id: string;
  sourceItemId: string; // "If you like this..."
  targetItem: BaseItem; // "...you'll love this"
  reason: string;
  userId: string;
  userName: string;
  createdAt: number;
}

export interface UserProfile {
  name: string;
  avatarUrl: string;
  isAuthenticated?: boolean;
}

export interface AppState {
  currentPage: 'home' | 'search' | 'detail' | 'profile';
  searchQuery: string;
  selectedItemId?: string;
}
