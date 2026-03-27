"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRepository = exports.NotificationRepository = void 0;
const database_1 = __importDefault(require("../config/database"));
class NotificationRepository {
    async createMany(notifications) {
        if (notifications.length === 0)
            return [];
        const rows = notifications.map(n => ({
            userId: n.userId,
            unitId: n.unitId,
            type: n.type,
            message: n.message,
        }));
        const created = [];
        await database_1.default.begin(async (trx) => {
            for (const row of rows) {
                const result = (await trx `
          INSERT INTO "Notification" ("userId", "unitId", type, message)
          VALUES (${row.userId}, ${row.unitId}, ${row.type}, ${row.message})
          RETURNING id, "userId", "unitId", type, message, "isRead", "createdAt"
        `);
                if (result[0])
                    created.push(result[0]);
            }
        });
        return created;
    }
    async listByUser(userId, isRead, limit = 50, offset = 0) {
        const result = await (0, database_1.default) `
      SELECT id, "userId", "unitId", type, message, "isRead", "createdAt"
      FROM "Notification"
      WHERE "userId" = ${userId}
      ${isRead === undefined ? (0, database_1.default) `` : (0, database_1.default) `AND "isRead" = ${isRead}`}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
        return result;
    }
    async markRead(userId, notificationId) {
        await (0, database_1.default) `
      UPDATE "Notification"
      SET "isRead" = TRUE
      WHERE id = ${notificationId} AND "userId" = ${userId}
    `;
    }
    async markAllRead(userId) {
        await (0, database_1.default) `
      UPDATE "Notification"
      SET "isRead" = TRUE
      WHERE "userId" = ${userId} AND "isRead" = FALSE
    `;
    }
    async deleteById(userId, notificationId) {
        await (0, database_1.default) `
      DELETE FROM "Notification"
      WHERE id = ${notificationId} AND "userId" = ${userId}
    `;
    }
}
exports.NotificationRepository = NotificationRepository;
exports.notificationRepository = new NotificationRepository();
//# sourceMappingURL=NotificationRepository.js.map