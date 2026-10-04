import pool from "../services/database";

export interface ReportRow {
  id: string;
  business_id: string;
  title: string;
  report_type: "weekly" | "monthly" | "custom";
  period_start: Date;
  period_end: Date;
  summary_text: string;
  confidence: "High" | "Medium" | "Low";
  confidence_score: number;
  data: any;
  pdf_path: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface InsertReportInput {
  business_id: string;
  title: string;
  report_type: "weekly" | "monthly" | "custom";
  period_start: Date;
  period_end: Date;
  summary_text: string;
  confidence: "High" | "Medium" | "Low";
  confidence_score: number;
  data: any;
  pdf_path?: string | null;
  created_by?: string | null;
}

export async function createReport(input: InsertReportInput): Promise<ReportRow> {
  const query = `
    INSERT INTO reports (
      business_id,
      title,
      report_type,
      period_start,
      period_end,
      summary_text,
      confidence,
      confidence_score,
      data,
      pdf_path,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING
      id,
      business_id,
      title,
      report_type,
      period_start,
      period_end,
      summary_text,
      confidence,
      confidence_score::float AS confidence_score,
      data,
      pdf_path,
      created_by,
      created_at,
      updated_at
  `;

  const values = [
    input.business_id,
    input.title,
    input.report_type,
    input.period_start,
    input.period_end,
    input.summary_text,
    input.confidence,
    input.confidence_score,
    JSON.stringify(input.data || {}),
    input.pdf_path || null,
    input.created_by || null,
  ];

  const result = await pool.query<ReportRow>(query, values);
  return result.rows[0];
}

export async function getReportById(id: string, businessId?: string): Promise<ReportRow | null> {
  let query = `
    SELECT
      id,
      business_id,
      title,
      report_type,
      period_start,
      period_end,
      summary_text,
      confidence,
      confidence_score::float AS confidence_score,
      data,
      pdf_path,
      created_by,
      created_at,
      updated_at
    FROM reports
    WHERE id = $1
  `;
  const values: any[] = [id];

  if (businessId) {
    query += ` AND business_id = $2`;
    values.push(businessId);
  }

  const result = await pool.query<ReportRow>(query, values);
  return result.rows[0] || null;
}

export async function listReportsByBusiness(
  businessId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ reports: ReportRow[]; total: number }> {
  const countQuery = `
    SELECT count(*)::int AS total
    FROM reports
    WHERE business_id = $1
  `;
  const countResult = await pool.query<{ total: number }>(countQuery, [businessId]);
  const total = countResult.rows[0]?.total || 0;

  const dataQuery = `
    SELECT
      id,
      business_id,
      title,
      report_type,
      period_start,
      period_end,
      summary_text,
      confidence,
      confidence_score::float AS confidence_score,
      data,
      pdf_path,
      created_by,
      created_at,
      updated_at
    FROM reports
    WHERE business_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;
  const dataResult = await pool.query<ReportRow>(dataQuery, [businessId, limit, offset]);

  return {
    reports: dataResult.rows,
    total,
  };
}

export async function deleteReport(id: string, businessId?: string): Promise<boolean> {
  let query = `DELETE FROM reports WHERE id = $1`;
  const values: any[] = [id];

  if (businessId) {
    query += ` AND business_id = $2`;
    values.push(businessId);
  }

  const result = await pool.query(query, values);
  return (result.rowCount ?? 0) > 0;
}

export async function updateReportPdfPath(id: string, pdfPath: string): Promise<void> {
  const query = `
    UPDATE reports
    SET pdf_path = $1, updated_at = NOW()
    WHERE id = $2
  `;
  await pool.query(query, [pdfPath, id]);
}
