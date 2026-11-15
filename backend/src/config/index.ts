import dotenv from "dotenv";
dotenv.config();

function resolveDatabaseSsl(
  databaseUrl: string,
  explicitSsl?: string
): boolean | { rejectUnauthorized: boolean } {
  if (explicitSsl === "true" || explicitSsl === "1") {
    return { rejectUnauthorized: false };
  }
  if (explicitSsl === "false" || explicitSsl === "0") {
    return false;
  }

  const isLocalhost =
    databaseUrl.includes("localhost") ||
    databaseUrl.includes("127.0.0.1") ||
    databaseUrl.includes("::1");

  const isRemoteOrSupabase =
    databaseUrl.includes("supabase.co") ||
    databaseUrl.includes("supabase.com") ||
    databaseUrl.includes("pooler.supabase.com") ||
    databaseUrl.includes("sslmode=require");

  if (isRemoteOrSupabase) {
    return { rejectUnauthorized: false };
  }

  if (process.env.NODE_ENV === "production" && !isLocalhost) {
    return { rejectUnauthorized: false };
  }

  return false;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:yuvi@localhost:5432/repscan_db",
  databaseSsl: resolveDatabaseSsl(
    process.env.DATABASE_URL || "postgresql://postgres:yuvi@localhost:5432/repscan_db",
    process.env.DATABASE_SSL
  ),
  databasePoolMax: parseInt(process.env.DATABASE_POOL_MAX || "10", 10),
  databaseConnectionTimeoutMs: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS || "10000", 10),
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
  corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:5173"],
  apifyToken: process.env.APIFY_API_TOKEN || "",
  googleReviewsActorId: process.env.APIFY_GOOGLE_REVIEWS_ACTOR_ID || "",
  apifyInstagramActorId: process.env.APIFY_INSTAGRAM_ACTOR_ID || "apify/instagram-scraper",
  instagramMaxPostsPerSync: parseInt(process.env.INSTAGRAM_MAX_POSTS_PER_SYNC || "50", 10),
  scrapeIntervalMinutes: parseInt(process.env.SCRAPE_INTERVAL_MINUTES || "60", 10),
  enableScheduler: process.env.ENABLE_SCHEDULED_SCRAPING === "true",
  clerkSecretKey: process.env.CLERK_SECRET_KEY || "",
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || "",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
};
