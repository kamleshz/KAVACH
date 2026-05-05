import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { API_ENDPOINTS } from "../../services/apiEndpoints";
import { getClientDetailQueryKey } from "./useClientDetailQuery";

export const getPlantProcessHistoryQueryKey = (clientId, type, itemId) => [
  "plant-process",
  "history",
  clientId,
  type,
  itemId,
];

export const usePlantProcessClientQuery = (clientId) =>
  useQuery({
    queryKey: getClientDetailQueryKey(clientId),
    enabled: Boolean(clientId),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.CLIENT.GET_BY_ID(clientId), {
        params: { _: Date.now() },
      });
      return response.data?.data || null;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const usePlantProcessHistoryQuery = ({ clientId, type, itemId }) =>
  useQuery({
    queryKey: getPlantProcessHistoryQueryKey(clientId, type, itemId),
    enabled: Boolean(clientId && type && itemId),
    queryFn: async () => {
      const response = await api.get(
        API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE_HISTORY(clientId),
        {
          params: { type, itemId },
        },
      );
      return response.data?.data || [];
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
