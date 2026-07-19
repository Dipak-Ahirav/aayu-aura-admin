export interface StorefrontProduct {
  slug: string;
  name: string;
  category: string;
  sareeType: string;
  fabric: string;
  colour: string;
  pattern: string;
  occasion: string;
  priceInPaise: number;
  mrpInPaise: number;
  discount: number;
  rating: number;
  reviews: number;
  stock: 'In stock' | 'Only a few left' | 'Out of stock';
  imageUrl?: string;
  imageTone: string;
  colours: string[];
}

export interface StorefrontFilter {
  label: string;
  values: string[];
}
