import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { API_ENDPOINTS } from "../../services/apiEndpoints";

export const clientConnectClientsQueryKey = ["client-connect", "clients"];

export const useClientConnectClients = () =>
  useQuery({
    queryKey: clientConnectClientsQueryKey,
    queryFn: async () => {
      const limit = 100;
      const firstResponse = await api.get(API_ENDPOINTS.CLIENT.GET_ALL, {
        params: { page: 1, limit },
      });

      const firstPageData = firstResponse.data?.data || [];
      const totalPages = Math.max(firstResponse.data?.totalPages || 1, 1);

      if (totalPages === 1) {
        return firstPageData;
      }

      const remainingResponses = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          api.get(API_ENDPOINTS.CLIENT.GET_ALL, {
            params: { page: index + 2, limit },
          }),
        ),
      );

      return [
        ...firstPageData,
        ...remainingResponses.flatMap((response) => response.data?.data || []),
      ];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export default useClientConnectClients;
