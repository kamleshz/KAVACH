import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { API_ENDPOINTS } from "../../services/apiEndpoints";

export const getClientDetailQueryKey = (clientId) => ["client", clientId];

export const useClientDetailQuery = (clientId, options = {}) =>
  useQuery({
    queryKey: [...getClientDetailQueryKey(clientId), options?.view || "default"],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.CLIENT.GET_BY_ID(clientId), {
        params: {
          _: Date.now(),
          ...(options?.view ? { view: options.view } : {}),
        },
      });
      return response.data?.data || null;
    },
    initialData: options?.initialData || undefined,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

export default useClientDetailQuery;
