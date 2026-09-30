export interface ProofItem {
  theme: string;
  author: string;
  date: string;
  rating: number;
  platform: 'Google Reviews' | 'Instagram' | 'LinkedIn';
  excerpt: string;
  highlight: string;
  rawId: string;
}

export interface MetricShift {
  id: string;
  theme: string;
  classification: 'decreasing' | 'emerging' | 'increasing';
  statusLabel: string;
  description: string;
  delta: string;
  sampleSize: number;
  proof: ProofItem;
}
