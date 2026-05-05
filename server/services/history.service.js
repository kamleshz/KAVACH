import ProductComplianceHistoryModel from "../models/productComplianceHistory.model.js";

class HistoryService {
  static async appendEntries({
    clientId,
    type,
    itemId,
    entries = [],
    userId = null,
  }) {
    if (
      !clientId ||
      !type ||
      !itemId ||
      !Array.isArray(entries) ||
      entries.length === 0
    ) {
      return [];
    }

    const historyDoc = await ProductComplianceHistoryModel.findOneAndUpdate(
      { client: clientId, type, itemId },
      {
        $setOnInsert: { client: clientId, type, itemId },
        $push: { entries: { $each: entries } },
        $set: { updatedBy: userId || null },
      },
      { new: true, upsert: true },
    );

    return historyDoc.entries || [];
  }

  static async replaceEntries({
    clientId,
    type,
    itemId,
    entries = [],
    userId = null,
  }) {
    const historyDoc = await ProductComplianceHistoryModel.findOneAndUpdate(
      { client: clientId, type, itemId },
      {
        $set: {
          client: clientId,
          type,
          itemId,
          entries,
          updatedBy: userId || null,
        },
      },
      { new: true, upsert: true },
    );

    return historyDoc.entries || [];
  }

  static async getEntries({ clientId, type, itemId }) {
    const historyDoc = await ProductComplianceHistoryModel.findOne({
      client: clientId,
      type,
      itemId,
    }).lean();
    return historyDoc?.entries || [];
  }
}

export default HistoryService;
