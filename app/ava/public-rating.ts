export type AvaPublicRating = {
  value: number;
  band: "HIGH" | "MEDIUM" | "LOW";
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

// Abramowitz and Stegun 7.1.26. The public number is a percentile-shaped
// presentation of an internal score, not a second decision model.
const normalCdf = (z: number) => {
  const x = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * x);
  const density = Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
  const tail =
    density *
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - tail : tail;
};

export const publicRatingFromDistribution = (
  score: number,
  center: number,
  spread: number,
): AvaPublicRating => {
  const percentile = normalCdf((score - center) / Math.max(0.000001, spread));
  const value = clamp(Math.round(percentile * 100), 1, 100);
  return {
    value,
    band: value >= 67 ? "HIGH" : value >= 34 ? "MEDIUM" : "LOW",
  };
};

export const publicCognitiveRating = (low: number, high: number) =>
  publicRatingFromDistribution((low + high) / 2, 0.5577675, 0.0201283);

export const publicDirectiveRating = (score: number) =>
  publicRatingFromDistribution(score, 687.5063, 104.624);

export const publicOpportunityRating = (score: number) =>
  publicRatingFromDistribution(score, 4.664, 7.0212);

export const formatPublicRating = (rating: AvaPublicRating) =>
  `${rating.band} ${rating.value}/100`;
