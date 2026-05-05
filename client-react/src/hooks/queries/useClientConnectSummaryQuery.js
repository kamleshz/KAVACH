import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { API_ENDPOINTS } from "../../services/apiEndpoints";

const isValidProcessType = (value) => value === "CTE" || value === "CTO";
const isValidObjectId = (value) =>
  /^[0-9a-fA-F]{24}$/.test((value || "").toString().trim());

export const getClientConnectSummaryQueryKey = (clientId, type, itemId) => [
  "client-connect",
  "summary",
  clientId,
  type,
  itemId,
];

export const useClientConnectSummaryQuery = ({
  clientId,
  type,
  itemId,
  enabled = true,
}) => {
  const hasValidSelection =
    Boolean(clientId) && isValidProcessType(type) && isValidObjectId(itemId);

  return useQuery({
    queryKey: getClientConnectSummaryQueryKey(clientId, type, itemId),
    enabled: Boolean(enabled && hasValidSelection),
    queryFn: async () => {
      const cacheBust = Date.now();
      const params = { type, itemId, _: cacheBust };
      const [
        product,
        components,
        suppliers,
        supplierCto,
        monthly,
        recycled,
        analysis,
      ] = await Promise.all([
        api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(clientId), { params }),
        api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPONENT_DETAILS(clientId), {
          params,
        }),
        api.get(API_ENDPOINTS.CLIENT.PRODUCT_SUPPLIER_COMPLIANCE(clientId), {
          params,
        }),
        api.get(API_ENDPOINTS.CLIENT.SUPPLIER_CTO_CHECK(clientId), { params }),
        api.get(API_ENDPOINTS.CLIENT.MONTHLY_PROCUREMENT(clientId), { params }),
        api.get(API_ENDPOINTS.CLIENT.RECYCLED_QUANTITY_USED(clientId), {
          params,
        }),
        api.get(`${API_ENDPOINTS.ANALYSIS.PLASTIC_PREPOST}/${clientId}`, {
          params,
        }),
      ]);

      return {
        productRows: product.data?.data || [],
        componentRows: components.data?.data || [],
        supplierRows: suppliers.data?.data || [],
        supplierCtoRows: supplierCto.data?.data || [],
        monthlyRows: monthly.data?.data || [],
        recycledRows: recycled.data?.data || [],
        targetTables: analysis.data?.full_summary?.target_tables || [],
        annualTargetRows: analysis.data?.data || [],
      };
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
};

export default useClientConnectSummaryQuery;
