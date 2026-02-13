export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/auth/login',
        VERIFY_OTP: '/api/auth/verify-login-otp',
        REFRESH_TOKEN: '/api/auth/refresh-token',
        FORGOT_PASSWORD: '/api/auth/forgot-password',
        VERIFY_FORGOT_OTP: '/api/auth/verify-forgot-password-otp',
        RESET_PASSWORD: '/api/auth/reset-password',
        LOGOUT: '/api/auth/logout',
        ME: '/api/auth/user-details',
        REGISTER: '/api/auth/register',
        VERIFY_EMAIL: '/api/auth/verify-email',
        RESEND_VERIFY_EMAIL_OTP: '/api/auth/resend-verify-email-otp'
    },
    CLIENT: {
        BASE: '/api/client',
        GET_ALL: '/api/client/all',
        CREATE: '/api/client/create',
        GET_BY_ID: (id) => `/api/client/${id}`,
        UPDATE: (id) => `/api/client/${id}`,
        DELETE: (id) => `/api/client/${id}`,
        STATS: '/api/client/stats',
        UPLOAD_DOC: (id) => `/api/client/${id}/upload-document`,
        DELETE_DOC: (id, docId) => `/api/client/${id}/document/${docId}`,
        VALIDATE: (id) => `/api/client/${id}/validate`,
        ASSIGN: (id) => `/api/client/${id}/assign`,
        VERIFY_FACILITY: (id) => `/api/client/${id}/verify-facility`,
        PLANT_PROCESS_PROGRESS: (id) => `/api/client/${id}/plant-process-progress`,
        
        // Sub-resources
        PRODUCT_COMPLIANCE: (id) => `/api/client/${id}/product-compliance`,
        ALL_PRODUCT_COMPLIANCE_ROWS: (id) => `/api/client/${id}/all-product-compliance-rows`,
        PRODUCT_COMPLIANCE_UPLOAD: (id) => `/api/client/${id}/product-compliance/upload-row`,
        PRODUCT_COMPLIANCE_HISTORY: (id) => `/api/client/${id}/product-compliance-history`,
        PRODUCT_COMPLIANCE_HISTORY_IMPORT: (id) => `/api/client/${id}/product-compliance-history/import`,
        PRODUCT_COMPLIANCE_ROW_SAVE: (id) => `/api/client/${id}/product-compliance-row-save`,
        
        PRODUCT_SUPPLIER_COMPLIANCE: (id) => `/api/client/${id}/product-supplier-compliance`,
        PRODUCT_COMPONENT_DETAILS: (id) => `/api/client/${id}/product-component-details`,
        RECYCLED_QUANTITY_USED: (id) => `/api/client/${id}/recycled-quantity-used`,
        
        SKU_COMPLIANCE: (id) => `/api/client/${id}/sku-compliance`,
        GET_SKU_COMPLIANCE: (id) => `/api/client/${id}/sku-compliance`,
        SKU_COMPLIANCE_UPLOAD: (id) => `/api/client/${id}/sku-compliance/upload-row`,
        
        MARKING_LABELLING_EVENTS: (id) => `/api/client/${id}/marking-labelling/events`,
        
        MONTHLY_PROCUREMENT: (id) => `/api/client/${id}/monthly-procurement`,
        SUP_CHECKLIST: (id) => `/api/client/${id}/sup-checklist`,
        PROCUREMENT: (id) => `/api/client/${id}/procurement`,
        E_WASTE_COMPLIANCE: (id) => `/api/client/${id}/e-waste-compliance`,
        E_WASTE_COMPLIANCE_UPLOAD: (id) => `/api/client/${id}/e-waste-compliance/upload-image`,
        E_WASTE_ROHS_COMPLIANCE: (id) => `/api/client/${id}/e-waste-compliance/rohs`,
        E_WASTE_STORAGE_COMPLIANCE: (id) => `/api/client/${id}/e-waste-compliance/storage`,
        E_WASTE_STORAGE_UPLOAD: (id) => `/api/client/${id}/e-waste-compliance/storage/upload-image`,
        E_WASTE_AWARENESS_COMPLIANCE: (id) => `/api/client/${id}/e-waste-compliance/awareness`
    },
    USER: {
        BASE: '/api/user',
        GET_ALL: '/api/user/all',
        CREATE: '/api/user/create',
        ROLES: '/api/user/roles',
        LOGIN_ACTIVITY: '/api/user/login-activity',
        UPDATE_ROLE: (id) => `/api/user/${id}/role`,
        UNLOCK: (id) => `/api/user/${id}/unlock`,
        UPDATE_STATUS: (id) => `/api/user/${id}/status`
    },
    ADMIN: {
        DASHBOARD_STATS: '/api/admin/dashboard-stats',
        BULK_UPDATE_STATUS: '/api/admin/bulk-update-status'
    },
    AI: {
        ANALYZE: '/api/ai/analyze'
    },
    ANALYSIS: {
        PLASTIC_PREPOST: '/api/analysis/plastic-prepost',
        SALES: '/api/analysis/sales-analysis',
        PURCHASE: '/api/analysis/purchase-analysis',
        COMPLIANCE_REPORT: (id) => `/api/analysis/plastic-compliance-report/${id}`
    }
};

export default API_ENDPOINTS;
