import { useState, useCallback } from 'react';
import { message } from 'antd';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';

const useSkuCompliance = (clientId, isProducer = false, externalProductRows = [], externalComponentRows = []) => {
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
                remarks: [],
                complianceRemarks: []
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
                remarks: [],
                complianceRemarks: []
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

            const markingImageList = Array.isArray(record.markingImage) ? record.markingImage : [];
            let finalImageUrls = markingImageList.map(img => img.url).filter(Boolean);
            const newFiles = markingImageList.filter(img => img.originFileObj);

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
            let productRows = [];
            let componentRows = [];
            let fetchSuccess = false;

            if (externalProductRows && externalProductRows.length > 0) {
                 productRows = externalProductRows;
                 fetchSuccess = true;
                 console.log('Using external product rows:', productRows.length);
            } else {
                const prodResponse = await api.get(API_ENDPOINTS.CLIENT.ALL_PRODUCT_COMPLIANCE_ROWS(clientId));
                console.log('Product Compliance Response:', prodResponse.data);

                if (prodResponse.data?.success && Array.isArray(prodResponse.data.data)) {
                    productRows = prodResponse.data.data;
                    fetchSuccess = true;
                }
            }

            // Prefer externally provided componentRows when available
            if (externalComponentRows && externalComponentRows.length > 0) {
                componentRows = externalComponentRows;
            } else {
                try {
                    const compRes = await api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPONENT_DETAILS(clientId));
                    if (compRes.data?.success && Array.isArray(compRes.data.data)) {
                        componentRows = compRes.data.data;
                    }
                } catch (e) {
                    console.warn('Failed to fetch component details; polymer codes may be incomplete');
                }
            }

            console.log('Product Rows to Merge:', productRows);

            // If we have product rows, we should ensure they exist in SKU data
            // Create a map of existing SKU codes to avoid duplicates or to update
            const skuMap = new Map();
            skuData.forEach(item => {
                if (item.skuCode) skuMap.set(item.skuCode.trim(), item);
            });

            const mergedData = [];
            const seenSkus = new Set();
            
            // First, add or update from Product Data
            productRows.forEach((prod, index) => {
                 // Logic for Producer vs others
                 let code, description, uom, image;

                 if (isProducer) {
                     code = (prod.componentCode || '').trim();
                     description = prod.componentDescription || '';
                     uom = ''; // Component typically doesn't use SKU UOM here
                     image = prod.componentImage || null;
                 } else {
                     code = (prod.skuCode || '').trim();
                     description = prod.skuDescription || '';
                     uom = prod.skuUom || '';
                     image = prod.productImage || null;
                 }

                 if (!code) return; // Skip if no code

                 // For Brand Owner, ensure unique SKU to prevent duplicates
                 if (!isProducer) {
                    if (seenSkus.has(code)) return;
                    seenSkus.add(code);
                 }

                 const existing = skuMap.get(code);

                // Derive polymers from component details when saved value is not present
                const derivePolymers = () => {
                    try {
                        const related = productRows.filter(p => {
                            if (isProducer) {
                                return (p.componentCode || '').trim() === code;
                            }
                            return (p.skuCode || '').trim() === code;
                        });
                        const compCodes = new Set(
                            related
                                .map(p => (p.componentCode || '').trim())
                                .filter(Boolean)
                        );
                        const polys = [];
                        compCodes.forEach(cc => {
                            const comp = componentRows.find(c => (c.componentCode || '').trim() === cc);
                            if (comp) {
                                const name = comp.componentPolymer || comp.polymerType || '';
                                const pcode = comp.polymerCode || comp.materialCode || '';
                                const label = [name, pcode ? `(${pcode})` : ''].filter(Boolean).join(' ');
                                if (label) polys.push(label.trim());
                            }
                        });
                        // Return unique non-empty entries
                        return Array.from(new Set(polys.filter(Boolean)));
                    } catch {
                        return [];
                    }
                };

                const mergedItem = {
                     key: existing ? (existing._id || existing.key) : `prod-${index}`,
                     ...existing, // Keep existing SKU compliance edits
                     // Overwrite basic info from Product Compliance (source of truth)
                     skuCode: code,
                     skuDescription: description || existing?.skuDescription || '',
                     skuUm: uom || existing?.skuUm || '', 
                     productImage: image || existing?.productImage || null,
                     
                     // Ensure other fields are initialized
                     brandOwner: existing?.brandOwner || '',
                     eprCertBrandOwner: existing?.eprCertBrandOwner || '',
                     eprCertProducer: existing?.eprCertProducer || '',
                     thicknessMentioned: existing?.thicknessMentioned || '',
                    polymerUsed: Array.isArray(existing?.polymerUsed) && existing.polymerUsed.length > 0
                        ? existing.polymerUsed
                        : derivePolymers(),
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
                     remarks: Array.isArray(existing?.remarks) ? existing.remarks : [],
                     complianceRemarks: Array.isArray(existing?.complianceRemarks) ? existing.complianceRemarks : []
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
                           remarks: Array.isArray(value.remarks) ? value.remarks : [],
                           complianceRemarks: Array.isArray(value.complianceRemarks) ? value.complianceRemarks : []
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
                        remarks: [],
                        complianceRemarks: []
                    }
                 ]);
            } else {
                 setSkuComplianceData(mergedData);
            }

        } catch (error) {
            console.error('Error fetching SKU compliance data:', error);
            message.error('Failed to load SKU compliance data');
        }
    }, [clientId, isProducer, externalProductRows]);

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
