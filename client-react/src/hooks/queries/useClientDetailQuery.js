import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { API_ENDPOINTS } from "../../services/apiEndpoints";

export const getClientDetailQueryKey = (clientId) => ["client", clientId];

export const useClientDetailQuery = (clientId) =>
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

export default useClientDetailQuery;
