import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { API_ENDPOINTS } from "../../services/apiEndpoints";

export const dashboardStatsQueryKey = ["dashboard", "stats"];

export const useDashboardStats = () =>
  useQuery({
    queryKey: dashboardStatsQueryKey,
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.CLIENT.STATS);
      return response.data?.data || {};
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

export default useDashboardStats;
