import dotenv from "dotenv";
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:yuvi@localhost:5432/repscan_db",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
  corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:5173"],
  apifyToken: process.env.APIFY_API_TOKEN || "",
  googleReviewsActorId: process.env.APIFY_GOOGLE_REVIEWS_ACTOR_ID || "",
  scrapeIntervalMinutes: parseInt(process.env.SCRAPE_INTERVAL_MINUTES || "60", 10),
  enableScheduler: process.env.ENABLE_SCHEDULED_SCRAPING === "true",
  clerkSecretKey: process.env.CLERK_SECRET_KEY || "",
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || "",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
};
