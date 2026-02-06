import { useState, useCallback } from 'react';
import { message } from 'antd';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';

const useSkuCompliance = (clientId) => {
    const [skuComplianceData, setSkuComplianceData] = useState([
        { 
            key: Date.now(), 
            skuCode: '', 
            skuDescription: '', 
            skuUm: '', 
            productImage: null, 
            brandOwner: '', 
            eprCertBrandOwner: '', 
            eprCertProducer: '', 
            thicknessMentioned: '', 
            polymerUsed: [], 
            polymerMentioned: '', 
            recycledPercent: '', 
            complianceStatus: '', 
            markingImage: [], 
            compostableRegNo: '', 
            remarks: [] 
        }
    ]);
    const [skuSearchText, setSkuSearchText] = useState('');
    const [skuStatusFilter, setSkuStatusFilter] = useState('all');
    const [skuPagination, setSkuPagination] = useState({ current: 1, pageSize: 10 });
    const [skuImageLoading, setSkuImageLoading] = useState(false);
    const [editingSkuKey, setEditingSkuKey] = useState(null);

    const handleSkuComplianceChange = (key, field, value) => {
        setSkuComplianceData((prev) =>
            prev.map((row) =>
                row.key === key ? { ...row, [field]: value } : row
            )
        );
    };

    const addSkuRow = () => {
        setSkuComplianceData(prev => [
            { 
                key: Date.now(), 
                skuCode: '', 
                skuDescription: '', 
                skuUm: '', 
                productImage: null, 
                brandOwner: '', 
                eprCertBrandOwner: '', 
                eprCertProducer: '', 
                thicknessMentioned: '', 
                polymerUsed: [], 
                polymerMentioned: '', 
                recycledPercent: '', 
                complianceStatus: '', 
                markingImage: [], 
                compostableRegNo: '', 
                remarks: [] 
            },
            ...prev
        ]);
    };

    const removeSkuRow = (key) => {
        setSkuComplianceData(prev => prev.filter(item => item.key !== key));
    };

    const cancelSkuRow = (key) => {
        setEditingSkuKey(null);
    };

    const handleSkuPageChange = (page) => {
        setSkuPagination((prev) => ({ ...prev, current: page }));
    };

    const handleSkuPageSizeChange = (size) => {
        setSkuPagination({ current: 1, pageSize: size });
    };

    const handleSkuStatusChange = (status) => {
        setSkuStatusFilter(status);
        setSkuPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleSaveSkuCompliance = async (record) => {
        try {
            if (!clientId) {
                message.error('Client ID is missing');
                return;
            }

            let finalImageUrls = record.markingImage.map(img => img.url).filter(Boolean);
            const newFiles = record.markingImage.filter(img => img.originFileObj);

            if (newFiles.length > 0) {
                const formData = new FormData();
                newFiles.forEach(file => {
                    formData.append('markingImage', file.originFileObj);
                });

                const uploadRes = await api.post(API_ENDPOINTS.CLIENT.SKU_COMPLIANCE_UPLOAD(clientId), formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (uploadRes.data?.success && uploadRes.data?.data?.markingImage) {
                    finalImageUrls = [...finalImageUrls, ...uploadRes.data.data.markingImage];
                }
            }

            const payload = {
                ...record,
                markingImage: finalImageUrls,
                recycledPercent: record.recycledPercent || '',
                complianceStatus: record.complianceStatus || ''
            };

            const res = await api.post(API_ENDPOINTS.CLIENT.SKU_COMPLIANCE(clientId), payload);

            if (res.data?.success) {
                message.success({ content: 'Saved successfully', key: 'saveSku' });
                setSkuComplianceData(prev => prev.map(row => {
                    if (row.key === record.key) {
                        const updatedImages = finalImageUrls.map((url, idx) => ({
                            uid: `-${idx}`,
                            name: `Image ${idx + 1}`,
                            status: 'done',
                            url: url
                        }));
                        return {
                            ...row,
                            markingImage: updatedImages
                        };
                    }
                    return row;
                }));
            } else {
                message.error({ content: 'Failed to save', key: 'saveSku' });
            }

        } catch (error) {
            console.error(error);
            message.error({ content: 'Error saving data', key: 'saveSku' });
        }
    };

    const fetchSkuComplianceData = useCallback(async () => {
        if (!clientId) return;
        try {
            console.log('Fetching SKU Compliance Data for Client:', clientId);

            // Fetch SKU Compliance Data
            const skuResponse = await api.get(API_ENDPOINTS.CLIENT.GET_SKU_COMPLIANCE(clientId));
            console.log('SKU Response:', skuResponse.data);

            let skuData = [];
            if (skuResponse.data?.success && Array.isArray(skuResponse.data.data)) {
                skuData = skuResponse.data.data;
            }

            // Fetch Product Compliance Data to sync/merge
            const prodResponse = await api.get(API_ENDPOINTS.CLIENT.ALL_PRODUCT_COMPLIANCE_ROWS(clientId));
            console.log('Product Compliance Response:', prodResponse.data);

            let productRows = [];
            let fetchSuccess = false;
            if (prodResponse.data?.success && Array.isArray(prodResponse.data.data)) {
                productRows = prodResponse.data.data;
                fetchSuccess = true;
            }

            console.log('Product Rows to Merge:', productRows);

            // If we have product rows, we should ensure they exist in SKU data
            // Create a map of existing SKU codes to avoid duplicates or to update
            const skuMap = new Map();
            skuData.forEach(item => {
                if (item.skuCode) skuMap.set(item.skuCode.trim(), item);
            });

            const mergedData = [];
            
            // First, add or update from Product Data
            productRows.forEach((prod, index) => {
                 // Assuming product data has skuCode, skuDescription, skuUom, etc.
                 const code = (prod.skuCode || '').trim();
                 if (!code) return; // Skip if no skuCode

                 const existing = skuMap.get(code);

                 const mergedItem = {
                     key: existing ? (existing._id || existing.key) : `prod-${index}`,
                     ...existing, // Keep existing SKU compliance edits
                     // Overwrite basic info from Product Compliance (source of truth)
                     skuCode: code,
                     skuDescription: prod.skuDescription || existing?.skuDescription || '',
                     skuUm: prod.skuUom || existing?.skuUm || '', 
                     productImage: prod.productImage || existing?.productImage || null,
                     
                     // Ensure other fields are initialized
                     brandOwner: existing?.brandOwner || '',
                     eprCertBrandOwner: existing?.eprCertBrandOwner || '',
                     eprCertProducer: existing?.eprCertProducer || '',
                     thicknessMentioned: existing?.thicknessMentioned || '',
                     polymerUsed: Array.isArray(existing?.polymerUsed) ? existing.polymerUsed : [],
                     polymerMentioned: existing?.polymerMentioned || '',
                     recycledPercent: existing?.recycledPercent || '',
                     complianceStatus: existing?.complianceStatus || '',
                     markingImage: existing?.markingImage ? existing.markingImage.map((url, idx) => ({
                        uid: `-${idx}`,
                        name: `Image ${idx + 1}`,
                        status: 'done',
                        url: url
                    })) : [],
                     compostableRegNo: existing?.compostableRegNo || '',
                     remarks: Array.isArray(existing?.remarks) ? existing.remarks : []
                 };
                 mergedData.push(mergedItem);
                 // Remove from map to track what's left
                 if (existing) skuMap.delete(code);
            });

            // If fetch was successful, we trust productRows as the master list.
            // Any remaining items in skuMap are orphans (deleted from Product Compliance) and should be removed.
            
            if (skuMap.size > 0 && fetchSuccess) {
                 console.log('Removed orphaned SKU Compliance items not found in Product Compliance:', Array.from(skuMap.values()));
            }

            // Fallback only if we couldn't get product list (fetchSuccess is false)
            if (!fetchSuccess && skuData.length > 0 && productRows.length === 0) {
                 console.warn('Failed to fetch product rows, keeping existing SKU data');
                 skuMap.forEach((value) => {
                      mergedData.push({
                           ...value,
                           key: value._id || value.key,
                           markingImage: value.markingImage ? value.markingImage.map((url, idx) => ({
                             uid: `-${idx}`,
                             name: `Image ${idx + 1}`,
                             status: 'done',
                             url: url
                           })) : [],
                           polymerUsed: Array.isArray(value.polymerUsed) ? value.polymerUsed : [],
                           remarks: Array.isArray(value.remarks) ? value.remarks : []
                      });
                 });
            }
            
            console.log('Final Merged SKU Data:', mergedData);

            if (mergedData.length === 0 && skuData.length === 0) {
                 // If absolutely no data, keep the empty state or default row
                 setSkuComplianceData([
                    { 
                        key: Date.now(), 
                        skuCode: '', 
                        skuDescription: '', 
                        skuUm: '', 
                        productImage: null, 
                        brandOwner: '', 
                        eprCertBrandOwner: '', 
                        eprCertProducer: '', 
                        thicknessMentioned: '', 
                        polymerUsed: [], 
                        polymerMentioned: '', 
                        recycledPercent: '', 
                        complianceStatus: '', 
                        markingImage: [], 
                        compostableRegNo: '', 
                        remarks: [] 
                    }
                 ]);
            } else {
                 setSkuComplianceData(mergedData);
            }

        } catch (error) {
            console.error('Error fetching SKU compliance data:', error);
            message.error('Failed to load SKU compliance data');
        }
    }, [clientId]);

    return {
        skuComplianceData,
        setSkuComplianceData,
        skuSearchText,
        setSkuSearchText,
        skuStatusFilter,
        setSkuStatusFilter,
        skuPagination,
        setSkuPagination,
        skuImageLoading,
        setSkuImageLoading,
        editingSkuKey,
        setEditingSkuKey,
        handleSkuComplianceChange,
        addSkuRow,
        removeSkuRow,
        cancelSkuRow,
        handleSkuPageChange,
        handleSkuPageSizeChange,
        handleSkuStatusChange,
        handleSaveSkuCompliance,
        fetchSkuComplianceData
    };
};

export default useSkuCompliance;
