import pool from "../services/database";
import type { MeaningfulChange } from "../schemas/analyticsSchemas";
import type { GroundedThemeHighlight } from "../schemas/briefSchemas";

export interface BriefDbRow {
  id: string;
  business_id: string;
  period_start: Date;
  period_end: Date;
  summary_text: string;
  top_complaints: GroundedThemeHighlight[];
  top_praises: GroundedThemeHighlight[];
  meaningful_changes: MeaningfulChange[];
  confidence: "High" | "Medium" | "Low";
  confidence_score: number;
  limitations: string[];
  metrics: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface InsertBriefData {
  business_id: string;
  period_start: Date;
  period_end: Date;
  summary_text: string;
  top_complaints: GroundedThemeHighlight[];
  top_praises: GroundedThemeHighlight[];
  meaningful_changes: MeaningfulChange[];
  confidence: "High" | "Medium" | "Low";
  confidence_score: number;
  limitations: string[];
  metrics: Record<string, unknown>;
}

export async function insertBrief(data: InsertBriefData): Promise<BriefDbRow> {
  const query = `
    INSERT INTO briefs (
      business_id, period_start, period_end, summary_text,
      top_complaints, top_praises, meaningful_changes,
      confidence, confidence_score, limitations, metrics
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING
      id, business_id, period_start, period_end, summary_text,
      top_complaints, top_praises, meaningful_changes,
      confidence, confidence_score::float AS confidence_score,
      limitations, metrics, created_at, updated_at
  `;

  const result = await pool.query<BriefDbRow>(query, [
    data.business_id,
    data.period_start,
    data.period_end,
    data.summary_text,
    JSON.stringify(data.top_complaints),
    JSON.stringify(data.top_praises),
    JSON.stringify(data.meaningful_changes),
    data.confidence,
    data.confidence_score,
    JSON.stringify(data.limitations),
    JSON.stringify(data.metrics),
  ]);

  return result.rows[0];
}

export async function getBriefById(
  businessId: string,
  briefId: string
): Promise<BriefDbRow | null> {
  const query = `
    SELECT
      id, business_id, period_start, period_end, summary_text,
      top_complaints, top_praises, meaningful_changes,
      confidence, confidence_score::float AS confidence_score,
      limitations, metrics, created_at, updated_at
    FROM briefs
    WHERE business_id = $1 AND id = $2
  `;
  const result = await pool.query<BriefDbRow>(query, [businessId, briefId]);
  return result.rows[0] || null;
}

export async function getLatestBriefForBusiness(
  businessId: string
): Promise<BriefDbRow | null> {
  const query = `
    SELECT
      id, business_id, period_start, period_end, summary_text,
      top_complaints, top_praises, meaningful_changes,
      confidence, confidence_score::float AS confidence_score,
      limitations, metrics, created_at, updated_at
    FROM briefs
    WHERE business_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const result = await pool.query<BriefDbRow>(query, [businessId]);
  return result.rows[0] || null;
}

export async function listBriefsForBusiness(
  businessId: string,
  limit = 10,
  offset = 0
): Promise<{ briefs: BriefDbRow[]; total: number }> {
  const countQuery = `SELECT COUNT(*)::int AS total FROM briefs WHERE business_id = $1`;
  const countResult = await pool.query<{ total: number }>(countQuery, [businessId]);
  const total = countResult.rows[0]?.total || 0;

  const dataQuery = `
    SELECT
      id, business_id, period_start, period_end, summary_text,
      top_complaints, top_praises, meaningful_changes,
      confidence, confidence_score::float AS confidence_score,
      limitations, metrics, created_at, updated_at
    FROM briefs
    WHERE business_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;
  const dataResult = await pool.query<BriefDbRow>(dataQuery, [businessId, limit, offset]);

  return { briefs: dataResult.rows, total };
}
