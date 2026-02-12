import sql from '../config/database';
import type { CreateNotificationDTO, Notification } from '../types';

export class NotificationRepository {
  async createMany(notifications: CreateNotificationDTO[]): Promise<Notification[]> {
    if (notifications.length === 0) return [];

    const rows = notifications.map(n => ({
      userId: n.userId,
      unitId: n.unitId,
      type: n.type,
      message: n.message,
    }));

    const created: Notification[] = [];

    await sql.begin(async trx => {
      for (const row of rows) {
        const result = (await (trx as any)`
          INSERT INTO "Notification" ("userId", "unitId", type, message)
          VALUES (${row.userId}, ${row.unitId}, ${row.type}, ${row.message})
          RETURNING id, "userId", "unitId", type, message, "isRead", "createdAt"
        `) as Notification[];

        if (result[0]) created.push(result[0]);
      }
    });

    return created;
  }

  async listByUser(userId: number, isRead?: boolean, limit = 50, offset = 0): Promise<Notification[]> {
    const result = await sql<Notification[]>`
      SELECT id, "userId", "unitId", type, message, "isRead", "createdAt"
      FROM "Notification"
      WHERE "userId" = ${userId}
      ${isRead === undefined ? sql`` : sql`AND "isRead" = ${isRead}`}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return result as Notification[];
  }

  async markRead(userId: number, notificationId: number): Promise<void> {
    await sql`
      UPDATE "Notification"
      SET "isRead" = TRUE
      WHERE id = ${notificationId} AND "userId" = ${userId}
    `;
  }

  async markAllRead(userId: number): Promise<void> {
    await sql`
      UPDATE "Notification"
      SET "isRead" = TRUE
      WHERE "userId" = ${userId} AND "isRead" = FALSE
    `;
  }

  async deleteById(userId: number, notificationId: number): Promise<void> {
    await sql`
      DELETE FROM "Notification"
      WHERE id = ${notificationId} AND "userId" = ${userId}
    `;
  }
}

export const notificationRepository = new NotificationRepository();
