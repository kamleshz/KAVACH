import ClientModel from "../models/client.model.js";
import PWPModel from "../models/pwp.model.js";

export const CLIENT_LINK_MODELS = ["Client", "PWP"];

export const getRoleName = (user) => {
  if (!user) return "";
  return typeof user.role === "string" ? user.role : user.role?.name || "";
};

export const isAdminRole = (roleName) =>
  ["ADMIN", "SUPER ADMIN"].includes(roleName);

export const isClientRole = (roleName) => roleName === "CLIENT";

export const normalizeObjectId = (value) => {
  if (!value) return null;
  if (typeof value === "object" && value !== null && value._id) {
    return String(value._id);
  }
  return String(value);
};

export const resolveClientLink = async (clientId) => {
  if (!clientId) return null;

  const normalizedClientId = normalizeObjectId(clientId);
  const client = await ClientModel.findById(normalizedClientId).select("_id");
  if (client) {
    return { linkedClient: client._id, linkedClientModel: "Client" };
  }

  const pwp = await PWPModel.findById(normalizedClientId).select("_id");
  if (pwp) {
    return { linkedClient: pwp._id, linkedClientModel: "PWP" };
  }

  return null;
};

export const canUserAccessClient = (user, client) => {
  const roleName = getRoleName(user);
  if (isAdminRole(roleName)) return true;

  const userId = normalizeObjectId(user?._id || user?.id);
  const clientId = normalizeObjectId(client?._id || client?.id);

  if (isClientRole(roleName)) {
    return normalizeObjectId(user?.linkedClient) === clientId;
  }

  return [
    normalizeObjectId(client?.assignedTo),
    normalizeObjectId(client?.assignedManager),
    normalizeObjectId(client?.createdBy),
  ].includes(userId);
};
