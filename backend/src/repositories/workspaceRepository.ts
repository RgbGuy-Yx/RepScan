import pool from "../services/database";

export type WorkspaceRole = "owner" | "admin" | "analyst";

export interface Workspace {
  id: string;
  name: string;
  created_by: string | null;
  created_at: Date;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: Date;
}

export async function create(name: string, createdBy: string): Promise<Workspace> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const wsResult = await client.query<Workspace>(
      `INSERT INTO workspaces (name, created_by)
       VALUES ($1, $2)
       RETURNING id, name, created_by, created_at`,
      [name, createdBy]
    );
    const workspace = wsResult.rows[0];

    // Automatically add creator as owner
    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [workspace.id, createdBy]
    );

    await client.query("COMMIT");
    return workspace;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function findById(id: string): Promise<Workspace | null> {
  const result = await pool.query<Workspace>(
    "SELECT id, name, created_by, created_at FROM workspaces WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function findWorkspacesByUserId(
  userId: string
): Promise<Array<Workspace & { role: WorkspaceRole }>> {
  const result = await pool.query<Workspace & { role: WorkspaceRole }>(
    `SELECT w.id, w.name, w.created_by, w.created_at, wm.role
     FROM workspaces w
     INNER JOIN workspace_members wm ON w.id = wm.workspace_id
     WHERE wm.user_id = $1
     ORDER BY w.created_at ASC`,
    [userId]
  );
  return result.rows;
}

export async function addMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<WorkspaceMember> {
  const result = await pool.query<WorkspaceMember>(
    `INSERT INTO workspace_members (workspace_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (workspace_id, user_id)
     DO UPDATE SET role = EXCLUDED.role
     RETURNING id, workspace_id, user_id, role, created_at`,
    [workspaceId, userId, role]
  );
  return result.rows[0];
}

export async function getMember(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember | null> {
  const result = await pool.query<WorkspaceMember>(
    `SELECT id, workspace_id, user_id, role, created_at
     FROM workspace_members
     WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  return result.rows[0] || null;
}

export async function listMembers(
  workspaceId: string
): Promise<Array<WorkspaceMember & { email: string; name: string | null }>> {
  const result = await pool.query<WorkspaceMember & { email: string; name: string | null }>(
    `SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.created_at, u.email, u.name
     FROM workspace_members wm
     INNER JOIN users u ON wm.user_id = u.id
     WHERE wm.workspace_id = $1
     ORDER BY wm.created_at ASC`,
    [workspaceId]
  );
  return result.rows;
}
