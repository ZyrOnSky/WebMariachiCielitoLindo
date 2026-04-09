export type ViewState = 'home' | 'about' | 'gallery' | 'repertoire' | 'reviews' | 'contact' | 'admin';

export interface Review {
  id?: string;
  userName: string;
  comment: string;
  rating: number;
  status: 'pending' | 'approved';
  isFeatured: boolean;
  createdAt: any;
  fingerprint?: string;
}
