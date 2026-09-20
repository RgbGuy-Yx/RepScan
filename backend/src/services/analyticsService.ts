import type { AnalyzedReviewRow, PlatformStatusRow } from "../repositories/analyticsRepository";
import type {
  ConfidenceLevel,
  ConfidenceResult,
  MeaningfulChange,
  PlatformCoverage,
  RatingStats,
  SentimentDistribution,
  ThemeMetric,
  WeeklyMetrics,
  ChangeType,
} from "../schemas/analyticsSchemas";

export interface AggregateOptions {
  periodStart: Date;
  periodEnd: Date;
  connectedPlatforms?: PlatformStatusRow[];
}

/**
 * Aggregates raw analyzed review rows into weekly metrics.
 */
export function aggregateWeeklyMetrics(
  reviews: AnalyzedReviewRow[],
  options: AggregateOptions
): WeeklyMetrics {
  const totalReviews = reviews.length;

  // 1. Sentiment Distribution
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  let sentimentScoreSum = 0;
  let sentimentScoreCount = 0;

  for (const r of reviews) {
    if (r.sentiment_label === "positive") positive++;
    else if (r.sentiment_label === "negative") negative++;
    else if (r.sentiment_label === "neutral") neutral++;

    if (r.sentiment_score !== null && r.sentiment_score !== undefined) {
      sentimentScoreSum += r.sentiment_score;
      sentimentScoreCount++;
    }
  }

  const sentimentDistribution: SentimentDistribution = {
    positive,
    neutral,
    negative,
    total: totalReviews,
    averageScore:
      sentimentScoreCount > 0
        ? Math.round((sentimentScoreSum / sentimentScoreCount) * 1000) / 1000
        : null,
  };

  // 2. Rating Stats
  let ratingSum = 0;
  let totalRated = 0;
  const ratingDistribution: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };

  for (const r of reviews) {
    if (r.rating !== null && r.rating !== undefined && r.rating >= 1 && r.rating <= 5) {
      ratingSum += r.rating;
      totalRated++;
      const roundedStar = Math.round(r.rating).toString();
      if (ratingDistribution[roundedStar] !== undefined) {
        ratingDistribution[roundedStar]++;
      }
    }
  }

  const ratingStats: RatingStats = {
    averageRating: totalRated > 0 ? Math.round((ratingSum / totalRated) * 100) / 100 : null,
    totalRated,
    distribution: ratingDistribution,
  };

  // 3. Theme Breakdown
  const themeMap = new Map<
    string,
    {
      count: number;
      negativeCount: number;
      positiveCount: number;
      neutralCount: number;
      ratingSum: number;
      ratingCount: number;
      rawItemIds: Set<string>;
      evidenceSnippets: Set<string>;
    }
  >();

  for (const r of reviews) {
    const themes = r.themes || [];
    for (const theme of themes) {
      const normalizedTheme = theme.trim();
      if (!normalizedTheme) continue;

      let entry = themeMap.get(normalizedTheme);
      if (!entry) {
        entry = {
          count: 0,
          negativeCount: 0,
          positiveCount: 0,
          neutralCount: 0,
          ratingSum: 0,
          ratingCount: 0,
          rawItemIds: new Set<string>(),
          evidenceSnippets: new Set<string>(),
        };
        themeMap.set(normalizedTheme, entry);
      }

      entry.count++;
      entry.rawItemIds.add(r.id);

      if (r.sentiment_label === "negative") entry.negativeCount++;
      else if (r.sentiment_label === "positive") entry.positiveCount++;
      else if (r.sentiment_label === "neutral") entry.neutralCount++;

      if (r.rating !== null && r.rating !== undefined) {
        entry.ratingSum += r.rating;
        entry.ratingCount++;
      }

      if (r.evidence && Array.isArray(r.evidence)) {
        for (const ev of r.evidence) {
          if (typeof ev === "string" && ev.trim()) {
            entry.evidenceSnippets.add(ev.trim());
          }
        }
      }
    }
  }

  const themes: ThemeMetric[] = Array.from(themeMap.entries())
    .map(([theme, data]) => {
      const prevalence =
        totalReviews > 0 ? Math.round((data.count / totalReviews) * 1000) / 10 : 0;
      const averageRating =
        data.ratingCount > 0
          ? Math.round((data.ratingSum / data.ratingCount) * 100) / 100
          : null;

      return {
        theme,
        count: data.count,
        prevalence,
        negativeCount: data.negativeCount,
        positiveCount: data.positiveCount,
        neutralCount: data.neutralCount,
        averageRating,
        evidenceRawItemIds: Array.from(data.rawItemIds),
        evidenceSnippets: Array.from(data.evidenceSnippets).slice(0, 5),
      };
    })
    .sort((a, b) => b.count - a.count);

  // 4. Platform Coverage
  const platformCounts = new Map<string, number>();
  for (const r of reviews) {
    platformCounts.set(r.platform, (platformCounts.get(r.platform) || 0) + 1);
  }

  const platformCoverage: PlatformCoverage[] = (options.connectedPlatforms || []).map((cp) => ({
    platform: cp.platform,
    count: platformCounts.get(cp.platform) || 0,
    isActive: cp.is_active,
  }));

  // If no connected platforms provided, create coverage from observed platforms
  if (platformCoverage.length === 0) {
    for (const [platform, count] of platformCounts.entries()) {
      platformCoverage.push({
        platform,
        count,
        isActive: true,
      });
    }
  }

  return {
    periodStart: options.periodStart.toISOString(),
    periodEnd: options.periodEnd.toISOString(),
    totalReviews,
    ratingStats,
    sentimentDistribution,
    themes,
    platformCoverage,
  };
}

/**
 * Detects the status and label of a theme across weeks.
 */
export function classifyThemeChange(
  currentMetric: ThemeMetric | undefined,
  previousMetric: ThemeMetric | undefined,
  currentTotalReviews: number,
  previousTotalReviews: number
): { changeType: ChangeType; deltaPrevalence: number; deltaNegative: number } {
  const currentCount = currentMetric?.count || 0;
  const previousCount = previousMetric?.count || 0;
  const currentNeg = currentMetric?.negativeCount || 0;
  const previousNeg = previousMetric?.negativeCount || 0;

  const currentPrev = currentMetric?.prevalence || 0;
  const prevPrev = previousMetric?.prevalence || 0;

  const deltaPrevalence = Math.round((currentPrev - prevPrev) * 10) / 10;
  const deltaNegative = currentNeg - previousNeg;

  if (previousCount === 0 && currentCount >= 2) {
    return { changeType: "new", deltaPrevalence, deltaNegative };
  }

  if (deltaNegative >= 2 || deltaPrevalence >= 15) {
    return { changeType: "increasing", deltaPrevalence, deltaNegative };
  }

  if (deltaNegative <= -2 || deltaPrevalence <= -15) {
    return { changeType: "decreasing", deltaPrevalence, deltaNegative };
  }

  return { changeType: "stable", deltaPrevalence, deltaNegative };
}

interface CandidateChange {
  change: MeaningfulChange;
  impactScore: number;
}

/**
 * Detects top 2-3 meaningful week-over-week changes adhering to minimum-data thresholds.
 */
export function detectMeaningfulChanges(
  currentWeek: WeeklyMetrics,
  previousWeek: WeeklyMetrics
): MeaningfulChange[] {
  const candidates: CandidateChange[] = [];

  const currentThemeMap = new Map<string, ThemeMetric>(
    currentWeek.themes.map((t) => [t.theme.toLowerCase(), t])
  );
  const previousThemeMap = new Map<string, ThemeMetric>(
    previousWeek.themes.map((t) => [t.theme.toLowerCase(), t])
  );

  // Collect all unique theme names
  const allThemeKeys = new Set([
    ...Array.from(currentThemeMap.keys()),
    ...Array.from(previousThemeMap.keys()),
  ]);

  for (const key of allThemeKeys) {
    const cur = currentThemeMap.get(key);
    const prev = previousThemeMap.get(key);
    const themeName = cur?.theme || prev?.theme || key;

    const classification = classifyThemeChange(
      cur,
      prev,
      currentWeek.totalReviews,
      previousWeek.totalReviews
    );

    const evidenceIds = cur?.evidenceRawItemIds || [];

    // Candidate 1: Negative review surges (High Impact)
    if (classification.deltaNegative >= 2 && cur && cur.negativeCount >= 2) {
      candidates.push({
        change: {
          theme: themeName,
          change_type: classification.changeType === "new" ? "new" : "increasing",
          metric: `Negative reviews regarding "${themeName}" increased from ${prev?.negativeCount || 0} to ${cur.negativeCount} (${classification.deltaNegative > 0 ? "+" : ""}${classification.deltaNegative})`,
          current_value: cur.negativeCount,
          previous_value: prev?.negativeCount || 0,
          delta: classification.deltaNegative,
          evidence_raw_item_ids: evidenceIds,
        },
        impactScore: 100 + classification.deltaNegative * 10,
      });
      continue;
    }

    // Candidate 2: New emerging theme with volume >= 2
    if (classification.changeType === "new" && cur && cur.count >= 2) {
      const isNegativeLeaning = cur.negativeCount > cur.positiveCount;
      candidates.push({
        change: {
          theme: themeName,
          change_type: "new",
          metric: `New theme "${themeName}" emerged with ${cur.count} reviews (${cur.prevalence}% prevalence)`,
          current_value: cur.count,
          previous_value: 0,
          delta: cur.count,
          evidence_raw_item_ids: evidenceIds,
        },
        impactScore: isNegativeLeaning ? 90 + cur.count * 5 : 70 + cur.count * 5,
      });
      continue;
    }

    // Candidate 3: Significant prevalence shift (>= 15% points) with minimum 3 reviews
    if (
      Math.abs(classification.deltaPrevalence) >= 15 &&
      ((cur && cur.count >= 2) || (prev && prev.count >= 2))
    ) {
      const isIncreasing = classification.deltaPrevalence > 0;
      candidates.push({
        change: {
          theme: themeName,
          change_type: isIncreasing ? "increasing" : "decreasing",
          metric: `Prevalence of "${themeName}" ${isIncreasing ? "increased" : "decreased"} by ${Math.abs(classification.deltaPrevalence)}% (from ${prev?.prevalence || 0}% to ${cur?.prevalence || 0}%)`,
          current_value: cur?.prevalence || 0,
          previous_value: prev?.prevalence || 0,
          delta: classification.deltaPrevalence,
          evidence_raw_item_ids: evidenceIds.length > 0 ? evidenceIds : (prev?.evidenceRawItemIds || []),
        },
        impactScore: 60 + Math.abs(classification.deltaPrevalence),
      });
      continue;
    }

    // Candidate 4: Negative reviews drop / resolution (positive improvement)
    if (classification.deltaNegative <= -2 && prev && prev.negativeCount >= 2) {
      candidates.push({
        change: {
          theme: themeName,
          change_type: "decreasing",
          metric: `Complaints regarding "${themeName}" dropped from ${prev.negativeCount} to ${cur?.negativeCount || 0} (${classification.deltaNegative})`,
          current_value: cur?.negativeCount || 0,
          previous_value: prev.negativeCount,
          delta: classification.deltaNegative,
          evidence_raw_item_ids: evidenceIds,
        },
        impactScore: 50 + Math.abs(classification.deltaNegative) * 5,
      });
      continue;
    }
  }

  // Candidate 5: Overall rating change with minimum sample (>= 3 rated reviews in both periods)
  if (
    currentWeek.ratingStats.totalRated >= 3 &&
    previousWeek.ratingStats.totalRated >= 3 &&
    currentWeek.ratingStats.averageRating !== null &&
    previousWeek.ratingStats.averageRating !== null
  ) {
    const ratingDelta =
      Math.round(
        (currentWeek.ratingStats.averageRating - previousWeek.ratingStats.averageRating) * 100
      ) / 100;

    if (Math.abs(ratingDelta) >= 0.4) {
      const isDrop = ratingDelta < 0;
      const allCurrentReviewIds = currentWeek.themes.flatMap((t) => t.evidenceRawItemIds);
      const uniqueCurrentIds = Array.from(new Set(allCurrentReviewIds)).slice(0, 10);

      candidates.push({
        change: {
          theme: "Overall Rating",
          change_type: isDrop ? "decreasing" : "increasing",
          metric: `Average rating ${isDrop ? "dropped" : "improved"} by ${Math.abs(ratingDelta)} stars (from ${previousWeek.ratingStats.averageRating} to ${currentWeek.ratingStats.averageRating})`,
          current_value: currentWeek.ratingStats.averageRating,
          previous_value: previousWeek.ratingStats.averageRating,
          delta: ratingDelta,
          evidence_raw_item_ids: uniqueCurrentIds,
        },
        impactScore: isDrop ? 95 + Math.abs(ratingDelta) * 20 : 65 + Math.abs(ratingDelta) * 15,
      });
    }
  }

  // Sort candidates by impact score descending and return TOP 2 to 3
  candidates.sort((a, b) => b.impactScore - a.impactScore);

  return candidates.slice(0, 3).map((c) => c.change);
}

/**
 * Calculates deterministic confidence score and builds limitation notes.
 */
export function calculateConfidenceAndLimitations(
  currentWeek: WeeklyMetrics,
  connectedPlatforms: PlatformStatusRow[],
  latestReviewDate: Date | null,
  referenceDate: Date = new Date()
): ConfidenceResult {
  const limitations: string[] = [];

  // 1. Evidence count score
  const count = currentWeek.totalReviews;
  let evidenceScore = 0;
  if (count === 0) {
    evidenceScore = 0.0;
    limitations.push("No reviews were recorded in the current week.");
  } else if (count < 5) {
    evidenceScore = 0.35;
    limitations.push(
      `Sample size is small (${count} review${count === 1 ? "" : "s"} this week), which may not represent overall customer sentiment.`
    );
  } else if (count < 15) {
    evidenceScore = 0.70;
  } else if (count < 30) {
    evidenceScore = 0.90;
  } else {
    evidenceScore = 1.0;
  }

  // 2. Source coverage score
  const activePlatforms = connectedPlatforms.filter((p) => p.is_active);
  let coverageScore = 1.0;
  if (activePlatforms.length > 0) {
    const coveredPlatforms = currentWeek.platformCoverage.filter((p) => p.count > 0 && p.isActive);
    const coverageRatio = coveredPlatforms.length / activePlatforms.length;
    coverageScore = Math.max(0.2, coverageRatio);

    if (activePlatforms.length > 1 && coveredPlatforms.length < activePlatforms.length) {
      const missingPlatforms = activePlatforms
        .filter((p) => !coveredPlatforms.some((c) => c.platform === p.platform))
        .map((p) => p.platform);
      limitations.push(
        `Limited source coverage: Missing feedback from ${missingPlatforms.join(", ")}.`
      );
    }
  } else {
    coverageScore = 0.5;
  }

  // 3. Freshness score
  let freshnessDays: number | null = null;
  let freshnessScore = 1.0;

  if (latestReviewDate) {
    const diffMs = Math.max(0, referenceDate.getTime() - latestReviewDate.getTime());
    freshnessDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (freshnessDays > 14) {
      freshnessScore = 0.3;
      limitations.push(
        `Data may be stale: Latest recorded review was ${freshnessDays} days ago.`
      );
    } else if (freshnessDays > 7) {
      freshnessScore = 0.6;
      limitations.push(
        `Review data is ${freshnessDays} days old; recent shifts may not be reflected yet.`
      );
    } else {
      freshnessScore = 1.0;
    }
  } else if (count > 0) {
    freshnessScore = 0.8;
  }

  // 4. Sentiment-Rating Consistency score
  let consistencyScore = 0.85; // default reasonable consistency
  if (currentWeek.ratingStats.totalRated >= 3) {
    let consistentCount = 0;
    const { distribution } = currentWeek.ratingStats;
    const highRatings = (distribution["4"] || 0) + (distribution["5"] || 0);
    const lowRatings = (distribution["1"] || 0) + (distribution["2"] || 0);

    const pos = currentWeek.sentimentDistribution.positive;
    const neg = currentWeek.sentimentDistribution.negative;

    // Check directional alignment
    const ratingNet = highRatings - lowRatings;
    const sentimentNet = pos - neg;

    if ((ratingNet >= 0 && sentimentNet >= 0) || (ratingNet <= 0 && sentimentNet <= 0)) {
      consistencyScore = 0.95;
    } else {
      consistencyScore = 0.5;
      limitations.push(
        "Divergence detected between star ratings and analyzed sentiment text."
      );
    }
  }

  // Weighted formula
  const weightedScore =
    0.40 * evidenceScore +
    0.25 * coverageScore +
    0.20 * freshnessScore +
    0.15 * consistencyScore;

  const score = Math.round(weightedScore * 100) / 100;

  let level: ConfidenceLevel = "Low";
  if (score >= 0.75) {
    level = "High";
  } else if (score >= 0.50) {
    level = "Medium";
  } else {
    level = "Low";
  }

  return {
    level,
    score,
    signals: {
      evidenceCount: count,
      sourceCoverageRatio: Math.round(coverageScore * 100) / 100,
      freshnessDays,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
    },
    limitations,
  };
}
