import AuditLogModel from "../models/auditLog.model.js";
import UserModel from "../models/user.model.js";
import logger from "../utils/logger.js";
import { getRoleName } from "../utils/accessControl.js";

class AuditLogService {
  static async resolveActor(actorId) {
    if (!actorId) return null;
    try {
      return await UserModel.findById(actorId).populate("role");
    } catch (error) {
      logger.warn({ err: error, actorId }, "Failed to resolve audit log actor");
      return null;
    }
  }

  static async record({
    actorId = null,
    module,
    action,
    clientId = null,
    entityType = "",
    entityId = "",
    type = "",
    itemId = "",
    status = "success",
    message = "",
    changeCount = 0,
    changes = [],
    metadata = {},
  }) {
    if (!module || !action) return null;

    const actor = await this.resolveActor(actorId);
    const safeChanges = Array.isArray(changes) ? changes.slice(0, 200) : [];

    try {
      return await AuditLogModel.create({
        actor: actorId || null,
        actorEmail: actor?.email || "",
        actorRole: getRoleName(actor),
        module,
        action,
        clientId: clientId || null,
        entityType,
        entityId: entityId ? String(entityId) : "",
        type,
        itemId: itemId ? String(itemId) : "",
        status,
        message,
        changeCount,
        changes: safeChanges,
        metadata,
      });
    } catch (error) {
      logger.error(
        { err: error, module, action, clientId, entityType, entityId },
        "Failed to persist audit log",
      );
      return null;
    }
  }
}

export default AuditLogService;
