import { config } from "../config";
import { logger } from "../config/logger";
import * as platformRepo from "../repositories/platformConnectionRepository";
import { scrapeGoogleReviews } from "./googleReviewsService";

export interface ScheduledScrapeSummary {
  attempted: number;
  succeeded: number;
  failed: number;
  errors: Array<{ connectionId: string; error: string }>;
}

export class SchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private isRunningCycle = false;

  public async runScheduledScrapes(): Promise<ScheduledScrapeSummary> {
    if (this.isRunningCycle) {
      logger.warn("Scheduled scrape cycle already in progress, skipping trigger");
      return { attempted: 0, succeeded: 0, failed: 0, errors: [] };
    }

    this.isRunningCycle = true;
    logger.info("Starting scheduled scrape cycle for active Google Review connections");

    const summary: ScheduledScrapeSummary = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    try {
      const activeConnections = await platformRepo.findAllActiveByPlatform("google");
      logger.info(`Found ${activeConnections.length} active Google Review connection(s) to process`);

      for (const connection of activeConnections) {
        summary.attempted++;
        try {
          await scrapeGoogleReviews(connection.business_id, connection.id);
          summary.succeeded++;
          logger.info(`Scheduled scrape completed successfully for connection ${connection.id}`);
        } catch (error) {
          summary.failed++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          summary.errors.push({ connectionId: connection.id, error: errorMessage });
          logger.error(`Scheduled scrape failed for connection ${connection.id}:`, error);
        }
      }
    } catch (err) {
      logger.error("Error retrieving active platform connections for scheduling:", err);
    } finally {
      this.isRunningCycle = false;
    }

    logger.info(
      `Scheduled scrape cycle finished. Attempted: ${summary.attempted}, Succeeded: ${summary.succeeded}, Failed: ${summary.failed}`
    );
    return summary;
  }

  public start(): void {
    if (this.timer) {
      return;
    }

    const intervalMs = Math.max(1, config.scrapeIntervalMinutes) * 60 * 1000;
    logger.info(`Scheduler started. Scrape interval: ${config.scrapeIntervalMinutes} minute(s)`);

    this.timer = setInterval(() => {
      this.runScheduledScrapes().catch((err) => {
        logger.error("Unhandled error in scheduled scrape job:", err);
      });
    }, intervalMs);

    // Unref timer so it does not block Node process exit if needed
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info("Scheduler stopped");
    }
  }
}

export const schedulerService = new SchedulerService();
