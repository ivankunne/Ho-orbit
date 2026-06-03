import { supabase } from '@/lib/supabase';

export type ReviewResourceType = 'venue' | 'scene';

export interface ReviewStats {
  /** Average rating across all reviews, or null when there are none. */
  average: number | null;
  /** Total number of reviews. */
  count: number;
  /** Percentage of reviews per star (1–5), each 0–100, rounded. */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

const EMPTY_DISTRIBUTION: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

/** Fetch aggregated review stats for a resource. Returns zeros on error/empty. */
export async function getReviewStats(
  resourceType: ReviewResourceType,
  resourceId: string | number,
): Promise<ReviewStats> {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('resource_type', resourceType)
    .eq('resource_id', String(resourceId));

  if (error || !data || data.length === 0) {
    return { average: null, count: 0, distribution: { ...EMPTY_DISTRIBUTION } };
  }

  const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const row of data) {
    const r = Math.min(5, Math.max(1, Math.round(row.rating))) as 1 | 2 | 3 | 4 | 5;
    counts[r] += 1;
    sum += row.rating;
  }

  const total = data.length;
  const distribution = { ...EMPTY_DISTRIBUTION };
  (Object.keys(counts) as unknown as (1 | 2 | 3 | 4 | 5)[]).forEach(star => {
    distribution[star] = Math.round((counts[star] / total) * 100);
  });

  return {
    average: Math.round((sum / total) * 10) / 10,
    count: total,
    distribution,
  };
}

/** Submit a review. Throws on failure so callers can surface an error. */
export async function submitReview(params: {
  resourceType: ReviewResourceType;
  resourceId: string | number;
  rating: number;
  text?: string;
  userId?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('reviews').insert({
    resource_type: params.resourceType,
    resource_id: String(params.resourceId),
    rating: params.rating,
    review_text: params.text ?? '',
    ...(params.userId ? { user_id: params.userId } : {}),
  });
  if (error) throw error;
}
