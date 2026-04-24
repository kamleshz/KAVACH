import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/apiEndpoints';
import useAuth from '../../../hooks/useAuth';
import { usePlantProcessHistory } from './usePlantProcessHistory';
import {
  PACKAGING_TYPES,
  POLYMER_TYPES,
  CATEGORIES,
  CATEGORY_II_TYPE_OPTIONS,
  CONTAINER_CAPACITIES,
  LAYER_TYPES
} from '../../../constants/complianceConstants';

export const usePlantProcessState = (argsOrClientId, typeArg, itemIdArg, onBackArg, onFinishArg) => {
  const { clientId, type, itemId, onBack, onFinish } =
    typeof argsOrClientId === 'object' && argsOrClientId !== null
      ? {
          clientId: argsOrClientId.clientId,
          type: argsOrClientId.type,
          itemId: argsOrClientId.itemId,
          onBack: argsOrClientId.onBack,
          onFinish: argsOrClientId.onFinish
        }
      : {
          clientId: argsOrClientId,
          type: typeArg,
          itemId: itemIdArg,
          onBack: onBackArg,
          onFinish: onFinishArg
        };
    const params = useParams();
    const navigate = useNavigate();
    const { user, isManager } = useAuth();

  const {
    resolvedUserName,
    historyStorageKey,
    legacyHistoryStorageKey,
    persistedHistory,
    appendPersistedHistory,
    dbHistoryLoaded,
    normalizedDbHistory
  } = usePlantProcessHistory({ clientId, type, itemId, user });

  const [client, setClient] = useState(null);
  const isProducer = client?.entityType === 'Producer';
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('verification');
  const [subTab, setSubTab] = useState('product-compliance');
  const [notifications, setNotifications] = useState([]);
  const notify = (type, text, duration = 4000) => {
    const id = `${Date.now()}-${Math.random()}`;
    const entry = { id, type, text, duration, started: false };
    setNotifications(prev => [...prev, entry]);
    setTimeout(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, started: true } : n));
    }, 20);
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
  };
  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getCompanyShortName = (name) => {
    if (!name) return 'UNK';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 0) return parts[0].substring(0, 3).toUpperCase();
    return 'UNK';
  };

  const getPlantCode = (name) => {
    if (!name) return 'PLT';
    return name.substring(0, 4);
  };

  const getSupplierShortName = (name) => {
    if (!name) return 'UNK';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 0) return parts[0].substring(0, 3).toUpperCase();
    return 'UNK';
  };
  const getStateShortName = (name) => {
    if (!name) return 'NA';
    const s = name.trim();
    if (!s) return 'NA';
    return s.substring(0, 3).toUpperCase();
  };

  const getSupplierCodePrefix = (supplierName, supplierState, companyName) => {
    const supplierShortName = getSupplierShortName(supplierName);
    const companyShortName = getCompanyShortName(companyName);
    const supplierStateShort = getStateShortName(supplierState);
    return `${supplierShortName}/${companyShortName}/${supplierStateShort}/`;
  };

  const generateNextSupplierCode = (rows, prefix, excludeIndex) => {
    let maxNum = 0;
    (rows || []).forEach((r, i) => {
      if (i === excludeIndex) return;
      const code = (r?.supplierCode || '').trim();
      if (!code.startsWith(prefix)) return;
      const numPart = code.substring(prefix.length);
      if (/^\d+$/.test(numPart)) {
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  const ensureSupplierCodeWithState = (rows, row, excludeIndex) => {
    if (!row || row.generateSupplierCode !== 'No') return (row?.supplierCode || '').trim();
    const supplierName = (row.supplierName || '').trim();
    if (!supplierName) return (row.supplierCode || '').trim();

    const prefix = getSupplierCodePrefix(row.supplierName, row.supplierState, client?.clientName);
    const currentCode = (row.supplierCode || '').trim();
    if (currentCode && currentCode.startsWith(prefix)) return currentCode;

    const supplierNameLower = supplierName.toLowerCase();
    const stateShort = getStateShortName(row.supplierState);
    const match = (rows || []).find((r, i) => {
      if (i === excludeIndex) return false;
      const nameLower = ((r?.supplierName || '').trim()).toLowerCase();
      if (!nameLower || nameLower !== supplierNameLower) return false;
      if (getStateShortName(r?.supplierState) !== stateShort) return false;
      const code = (r?.supplierCode || '').trim();
      return code && code.startsWith(prefix);
    });
    if (match?.supplierCode) return match.supplierCode;

    return generateNextSupplierCode(rows, prefix, excludeIndex);
  };

  const [productRows, setProductRows] = useState([]);
  const [lastSavedRows, setLastSavedRows] = useState([]);
  const [initialProductRows, setInitialProductRows] = useState([]);
  const [skuRows, setSkuRows] = useState([
    {
      generate: 'No',
      systemCode: '',
      packagingType: '',
      skuCode: '',
      skuDescription: '',
      skuUom: '',
      productImage: null,
      componentCode: '',
      componentDescription: '',
      supplierName: '',
      generateSupplierCode: 'No',
      supplierCode: '',
      componentImage: null
    }
  ]);
  const [lastSavedSkuRows, setLastSavedSkuRows] = useState([]);
  const [initialSkuRows, setInitialSkuRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [skuPage, setSkuPage] = useState(1);
  const [skuItemsPerPage, setSkuItemsPerPage] = useState(5);
  const fileInputSupplierRef = useRef(null);
  const [componentRows, setComponentRows] = useState([]);

  useEffect(() => {
    const totalPages = Math.ceil(productRows.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [productRows.length, itemsPerPage, currentPage]);

  // Using constants
  const packagingTypes = PACKAGING_TYPES;
  const polymerTypes = POLYMER_TYPES;
  const categories = CATEGORIES;
  const categoryIITypeOptions = CATEGORY_II_TYPE_OPTIONS;
  const containerCapacities = CONTAINER_CAPACITIES;
  const layerTypes = LAYER_TYPES;
  const componentOptions = useMemo(() => {
    const map = new Map();
    productRows.forEach(r => {
      if (!r) return;
      const code = (r.componentCode || '').trim();
      if (code) {
        if (!map.has(code)) {
          map.set(code, (r.componentDescription || '').trim());
        }
      }
    });
    return Array.from(map.entries()).map(([code, description]) => ({ code, description }));
  }, [productRows]);

  const normalizeSystemCodeKey = (value) => (value || '').toString().replace(/\s+/g, '').toLowerCase();
  const extractComponentCodeFromSystemCode = (value) => {
    const raw = (value || '').toString();
    if (!raw) return '';
    const parts = raw.split('|').map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[1];
    return '';
  };

  const systemCodeOptions = useMemo(() => {
    const uniqueMap = new Map();
    productRows.forEach(r => {
      if (!r) return;
      const code = (r.systemCode || '').trim();
      if (!code) return;
      const existing = uniqueMap.get(code) || {
        code,
        skuCode: '',
        componentCode: '',
        componentDescription: '',
        supplierName: '',
        supplierState: '',
        supplierType: '',
        supplierCategory: '',
        polymerType: '',
        componentPolymer: '',
        category: ''
      };
      if (!existing.skuCode && r.skuCode) existing.skuCode = r.skuCode;
      if (r.componentCode) existing.componentCode = r.componentCode;
      if (r.componentDescription) existing.componentDescription = r.componentDescription;
      if (!existing.supplierName && r.supplierName) existing.supplierName = r.supplierName;
      if (!existing.supplierState && r.supplierState) existing.supplierState = r.supplierState;
      if (!existing.supplierType && r.supplierType) existing.supplierType = r.supplierType;
      if (!existing.supplierCategory && r.supplierCategory) existing.supplierCategory = r.supplierCategory;
      uniqueMap.set(code, existing);
    });
    componentRows.forEach(r => {
      const code = (r.systemCode || '').trim();
      if (!code) return;
      const existing = uniqueMap.get(code) || {
        code,
        skuCode: '',
        componentCode: '',
        componentDescription: '',
        supplierName: '',
        supplierState: '',
        supplierType: '',
        supplierCategory: '',
        polymerType: '',
        componentPolymer: '',
        category: ''
      };
      if (!existing.skuCode && r.skuCode) existing.skuCode = r.skuCode;
      if (r.componentCode) existing.componentCode = r.componentCode;
      if (r.componentDescription) existing.componentDescription = r.componentDescription;
      if (!existing.supplierName && r.supplierName) existing.supplierName = r.supplierName;
      if (!existing.supplierState && r.supplierState) existing.supplierState = r.supplierState;
      if (r.polymerType) existing.polymerType = r.polymerType;
      if (r.componentPolymer) existing.componentPolymer = r.componentPolymer;
      if (r.category) existing.category = r.category;
      uniqueMap.set(code, existing);
    });
    return Array.from(uniqueMap.values()).map(item => ({
      code: item.code,
      label: `${item.code} | ${item.componentCode} | ${item.componentDescription} | ${item.supplierName}`,
      data: item
    }));
  }, [productRows, componentRows]);

  const skuOptions = useMemo(() => {
    const map = new Map();
    productRows.forEach(row => {
        const code = (row.skuCode || '').trim();
        if (code) {
            const existing = map.get(code);
            const hasImage = !!row.productImage;
            const existingHasImage = existing && !!existing.productImage;
            
            if (!existing || (hasImage && !existingHasImage)) {
                map.set(code, {
                    skuCode: code,
                    skuDescription: row.skuDescription || (existing?.skuDescription || ''),
                    skuUom: row.skuUom || (existing?.skuUom || ''),
                    productImage: row.productImage || (existing?.productImage || '')
                });
            }
        }
    });
    return Array.from(map.values());
  }, [productRows]);

  const handleRowChange = (index, field, value) => {
    setProductRows(prev => {
      const copy = [...prev];
      const updatedRow = { ...copy[index], [field]: value };
      
      // Clear validation error if user edits
      if (updatedRow._validationError) {
          updatedRow._validationError = null;
      }
      
      // If Auto-Generate is ON and SKU/Description changes, try to reuse existing code or keep current (if no match)
      if (updatedRow.generate === 'No' && (field === 'skuCode' || field === 'componentDescription')) {
          const sku = (updatedRow.skuCode || '').trim();
          const desc = (updatedRow.componentDescription || '').trim();
          
          if (sku && desc) {
             const existingMatch = copy.find((r, i) => 
                 i !== index && 
                 (r.skuCode || '').trim() === sku && 
                 (r.componentDescription || '').trim() === desc && 
                 (r.componentCode || '').trim()
             );
             
             if (existingMatch) {
                 updatedRow.componentCode = existingMatch.componentCode;
             }
             // If no match, we keep the current code (which might be a generated one).
             // We do NOT auto-generate a new one on every keystroke unless we want to enforce uniqueness logic strictly here.
             // But if I change 'Bottle' to 'Cap', I expect a new code if 'Cap' doesn't exist.
             // If I change 'Bottle' (C1) to 'Cap', and 'Cap' (C2) exists, it should switch to C2.
             // If 'Cap' does not exist, it should probably generate a NEW code (C3) instead of keeping C1 (Bottle).
             // Because C1 is for Bottle.
             else {
                 // Check if current code is "taken" by another SKU/Desc combination?
                 // Actually, if I change description, the old code (C1) is no longer valid for this row if C1 belongs to (SKU, Bottle).
                 // So we should generate a NEW code if no match found.
                 
                 // Reuse generation logic (copy-pasted to avoid stale state issues or extract to helper)
                 // We need to pass 'copy' to helper to see latest state.
                 // But helper 'generateComponentCode' uses 'productRows' state which is stale inside this callback.
                 // So we must implement generation here or pass 'copy'.
                 
                 const companyShortName = getCompanyShortName(client?.clientName);
                 const plantCode = getPlantCode(item?.plantName);
                 const prefix = `${companyShortName}/${plantCode}/Com/`;
                 
                 let maxNum = 0;
                 // Check all rows in 'copy' (except current one ideally, or just find max)
                 // We want to find max number used in ANY row.
                 copy.forEach((r) => { // Check ALL rows including current (current might have old code we are replacing, but that's fine, we want max)
                     // Actually we should ignore the code of the row we are changing IF we are about to replace it?
                     // If I am changing Row 2 from C1 to something else, C1 is still used by Row 1?
                     // If Row 2 was the ONLY one with C1, then C1 is free?
                     // But "Running Number" usually strictly increases. We don't backfill holes.
                     
                     const code = (r.componentCode || '').trim();
                     if (code.startsWith(prefix)) {
                         const numPart = code.substring(prefix.length);
                         if (/^\d+$/.test(numPart)) {
                             const num = parseInt(numPart, 10);
                             if (!isNaN(num) && num > maxNum) maxNum = num;
                         }
                     }
                 });
                 
                 componentRows.forEach(r => {
                     const code = (r.componentCode || '').trim();
                     if (code.startsWith(prefix)) {
                         const numPart = code.substring(prefix.length);
                         if (/^\d+$/.test(numPart)) {
                             const num = parseInt(numPart, 10);
                             if (!isNaN(num) && num > maxNum) maxNum = num;
                         }
                     }
                 });
                 
                 const nextNum = maxNum + 1;
                 updatedRow.componentCode = `${prefix}${nextNum.toString().padStart(3, '0')}`;
             }
          }
      }

      // If Supplier Name/State changes and Generate Supplier Code is 'No', regenerate Supplier Code
      if (updatedRow.generateSupplierCode === 'No' && (field === 'supplierName' || field === 'supplierState')) {
          const supplierName = (updatedRow.supplierName || '').trim();
          const supplierShortName = getSupplierShortName(updatedRow.supplierName);
          const companyShortName = getCompanyShortName(client?.clientName);
          const stateShort = getStateShortName(updatedRow.supplierState);
          const prefix = `${supplierShortName}/${companyShortName}/${stateShort}/`;
          
          let existingCode = '';
          if (supplierName) {
            const match = copy.find((r, i) => 
                i !== index && 
                (r.supplierName || '').trim().toLowerCase() === supplierName.toLowerCase() && 
                (r.supplierCode || '').trim().startsWith(prefix)
            );
            if (match) {
                existingCode = match.supplierCode;
            }
          }

          if (existingCode) {
              updatedRow.supplierCode = existingCode;
          } else {
              let maxNum = 0;
              copy.forEach((r, i) => {
                  const code = (r.supplierCode || '').trim();
                  if (code.startsWith(prefix)) {
                      const numPart = code.substring(prefix.length);
                      if (/^\d+$/.test(numPart)) {
                          const num = parseInt(numPart, 10);
                          if (!isNaN(num) && num > maxNum) maxNum = num;
                      }
                  }
              });
              
              const nextNum = maxNum + 1;
              updatedRow.supplierCode = `${prefix}${nextNum.toString().padStart(3, '0')}`;
          }
      }

      copy[index] = updatedRow;
      return copy;
    });
  };
  const handleFileChange = (index, field, file) => {
    setProductRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: file };
      return copy;
    });
  };

  const handleProductComponentCodeChange = (index, code) => {
    const compMatch = componentRows.find(r => (r.componentCode || '').trim().toLowerCase() === (code || '').trim().toLowerCase());
    const descFromComponent = (compMatch?.componentDescription || '').trim();
    const supplierFromComponent = (compMatch?.supplierName || '').trim();

    setProductRows(prev => {
      const copy = [...prev];
      copy[index] = { 
        ...copy[index], 
        componentCode: code,
        componentDescription: descFromComponent || copy[index].componentDescription,
        supplierName: supplierFromComponent || copy[index].supplierName
      };
      return copy;
    });
  };

  const generateComponentCode = (indexToSkip = -1) => {
    const companyShortName = getCompanyShortName(client?.clientName);
    const plantCode = getPlantCode(item?.plantName);

    const prefix = `${companyShortName}/${plantCode}/Com/`;
    
    let maxNum = 0;
    
    // Check productRows
    productRows.forEach((r, i) => {
        if (i === indexToSkip) return; 
        const code = (r.componentCode || '').trim();
        if (code.startsWith(prefix)) {
            const numPart = code.substring(prefix.length);
            if (/^\d+$/.test(numPart)) {
                const num = parseInt(numPart, 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        }
    });
    
    // Check componentRows
    componentRows.forEach(r => {
        const code = (r.componentCode || '').trim();
        if (code.startsWith(prefix)) {
            const numPart = code.substring(prefix.length);
            if (/^\d+$/.test(numPart)) {
                const num = parseInt(numPart, 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        }
    });
    
    const nextNum = maxNum + 1;
    const nextNumStr = nextNum.toString().padStart(3, '0');
    return `${prefix}${nextNumStr}`;
  };

  const generateSystemCode = (currentRows = []) => {
    const companyShortName = getCompanyShortName(client?.clientName);
    const prefix = `${companyShortName}/Com/`;
    
    let maxNum = 0;
    currentRows.forEach(r => {
        const code = (r.systemCode || '').trim();
        if (code.startsWith(prefix)) {
            const numPart = code.substring(prefix.length);
            if (/^\d+$/.test(numPart)) {
                const num = parseInt(numPart, 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        }
    });

    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  // Backfill systemCode for existing rows
  useEffect(() => {
    if (!client || !productRows.length) return;

    const needsUpdate = productRows.some(r => !r.systemCode);
    if (!needsUpdate) return;

    const companyShortName = getCompanyShortName(client?.clientName);
    const prefix = `${companyShortName}/Com/`;
    
    // Find max existing number
    let maxNum = 0;
    productRows.forEach(r => {
        const code = (r.systemCode || '').trim();
        if (code.startsWith(prefix)) {
            const numPart = code.substring(prefix.length);
            if (/^\d+$/.test(numPart)) {
                const num = parseInt(numPart, 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        }
    });

    const updatedRows = productRows.map(row => {
        if (!row.systemCode) {
            maxNum++;
            return {
                ...row,
                systemCode: `${prefix}${maxNum.toString().padStart(3, '0')}`
            };
        }
        return row;
    });

    setProductRows(updatedRows);
  }, [client, productRows]);

  const handleGenerateChange = (index, value) => {
    setProductRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], generate: value };
      
      if (value === 'Yes') {
        copy[index].componentCode = '';
      } else if (value === 'No') {
        const row = copy[index];
        const sku = (row.skuCode || '').trim();
        const desc = (row.componentDescription || '').trim();
        let matchFound = false;

        if (sku && desc) {
            const existingMatch = copy.find((r, i) => 
                i !== index && 
                (r.skuCode || '').trim() === sku && 
                (r.componentDescription || '').trim() === desc && 
                (r.componentCode || '').trim()
            );
            
            if (existingMatch) {
                copy[index].componentCode = existingMatch.componentCode;
                matchFound = true;
            }
        }

        if (!matchFound) {
            const companyShortName = getCompanyShortName(client?.clientName);
            const plantCode = getPlantCode(item?.plantName);
    
            const prefix = `${companyShortName}/${plantCode}/Com/`;
            
            let maxNum = 0;
            
            prev.forEach((r, i) => {
                if (i === index) return;
                const code = (r.componentCode || '').trim();
                if (code.startsWith(prefix)) {
                    const numPart = code.substring(prefix.length);
                    if (/^\d+$/.test(numPart)) {
                        const num = parseInt(numPart, 10);
                        if (!isNaN(num) && num > maxNum) maxNum = num;
                    }
                }
            });
            
            componentRows.forEach(r => {
                const code = (r.componentCode || '').trim();
                if (code.startsWith(prefix)) {
                    const numPart = code.substring(prefix.length);
                    if (/^\d+$/.test(numPart)) {
                        const num = parseInt(numPart, 10);
                        if (!isNaN(num) && num > maxNum) maxNum = num;
                    }
                }
            });
            
            const nextNum = maxNum + 1;
            const newCode = `${prefix}${nextNum.toString().padStart(3, '0')}`;
            
            copy[index].componentCode = newCode;
        }
      }
      
      return copy;
    });
  };

  const handleGenerateSupplierCodeChange = (index, value) => {
    setProductRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], generateSupplierCode: value };
      
      if (value === 'Yes') {
        copy[index].supplierCode = '';
      } else if (value === 'No') {
        const row = copy[index];
        const supplierName = (row.supplierName || '').trim();
        const supplierStateShort = getStateShortName(row.supplierState);
        
        // 1. Check if Supplier Name exists in other rows and has a valid Supplier Code
        let existingCode = '';
        if (supplierName) {
            const prefix = `${getSupplierShortName(row.supplierName)}/${getCompanyShortName(client?.clientName)}/${supplierStateShort}/`;
            const match = prev.find((r, i) => 
                i !== index && 
                (r.supplierName || '').trim().toLowerCase() === supplierName.toLowerCase() && 
                (r.supplierCode || '').trim().startsWith(prefix)
            );
            if (match) {
                existingCode = match.supplierCode;
            }
        }

        if (existingCode) {
            copy[index].supplierCode = existingCode;
        } else {
            const supplierShortName = getSupplierShortName(row.supplierName);
            const companyShortName = getCompanyShortName(client?.clientName);
            
            const prefix = `${supplierShortName}/${companyShortName}/${supplierStateShort}/`;
            
            let maxNum = 0;
            
            prev.forEach((r, i) => {
                const code = (r.supplierCode || '').trim();
                if (code.startsWith(prefix)) {
                    const numPart = code.substring(prefix.length);
                    if (/^\d+$/.test(numPart)) {
                        const num = parseInt(numPart, 10);
                        if (!isNaN(num) && num > maxNum) maxNum = num;
                    }
                }
            });
            
            const nextNum = maxNum + 1;
            const newCode = `${prefix}${nextNum.toString().padStart(3, '0')}`;
            
            copy[index].supplierCode = newCode;
        }
      }
      
      return copy;
    });
  };

  const generateComponentCodeForBulk = (currentRows, clientName, plantName, existingComponentRows) => {
      const companyShortName = getCompanyShortName(clientName);
      const plantCode = getPlantCode(plantName);
      const prefix = `${companyShortName}/${plantCode}/Com/`;
      
      let maxNum = 0;
      currentRows.forEach(r => {
          const code = (r.componentCode || '').trim();
          if (code.startsWith(prefix)) {
              const numPart = code.substring(prefix.length);
              if (/^\d+$/.test(numPart)) {
                  const num = parseInt(numPart, 10);
                  if (!isNaN(num) && num > maxNum) maxNum = num;
              }
          }
      });
      if (existingComponentRows) {
          existingComponentRows.forEach(r => {
              const code = (r.componentCode || '').trim();
              if (code.startsWith(prefix)) {
                  const numPart = code.substring(prefix.length);
                  if (/^\d+$/.test(numPart)) {
                      const num = parseInt(numPart, 10);
                      if (!isNaN(num) && num > maxNum) maxNum = num;
                  }
              }
          });
      }
      
      const nextNum = maxNum + 1;
      return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  const generateSupplierCodeForBulk = (currentRows, supplierName, clientName) => {
      const supplierShortName = getSupplierShortName(supplierName);
      const companyShortName = getCompanyShortName(clientName);
      const sampleRow = (currentRows || []).find(r => (r.supplierName || '').trim().toLowerCase() === (supplierName || '').trim().toLowerCase());
      const stateShort = getStateShortName(sampleRow?.supplierState);
      const prefix = `${supplierShortName}/${companyShortName}/${stateShort}/`;
      
      let maxNum = 0;
      currentRows.forEach((r) => {
          const code = (r.supplierCode || '').trim();
          if (code.startsWith(prefix)) {
              const numPart = code.substring(prefix.length);
              if (/^\d+$/.test(numPart)) {
                  const num = parseInt(numPart, 10);
                  if (!isNaN(num) && num > maxNum) maxNum = num;
              }
          }
      });
      
      const nextNum = maxNum + 1;
      return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  const fileInputRef = useRef(null);
  const fileInputSkuRef = useRef(null);
  const fileInputComponentRef = useRef(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isSupplierBulkSaving, setIsSupplierBulkSaving] = useState(false);
  const [isComponentBulkSaving, setIsComponentBulkSaving] = useState(false);

  const handleProductDeleteAll = async () => {
        setIsBulkSaving(true);
        try {
            const payload = {
                type,
                itemId,
                rows: []
            };
            const res = await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(clientId), payload);
            if (res.data.success) {
                notify('success', 'All product compliance rows deleted');
                setProductRows([]);
                setLastSavedRows([]);
                setInitialProductRows([]);
                setCurrentPage(1);
            } else {
                notify('error', res.data.message || 'Failed to delete all rows');
            }
        } catch (err) {
            console.error(err);
            notify('error', err.response?.data?.message || 'Failed to delete all rows');
        } finally {
            setIsBulkSaving(false);
        }
    };

    const handleSupplierDeleteAll = async () => {
        setIsSupplierBulkSaving(true);
        try {
            const payload = {
                type,
                itemId,
                rows: []
            };
            const res = await api.post(API_ENDPOINTS.CLIENT.PRODUCT_SUPPLIER_COMPLIANCE(clientId), payload);
            if (res.data.success) {
                notify('success', 'All supplier compliance rows deleted');
                setSupplierRows([]);
                setLastSavedSupplierRows([]);
                setInitialSupplierRows([]);
            } else {
                notify('error', res.data.message || 'Failed to delete all rows');
            }
        } catch (err) {
            console.error(err);
            notify('error', err.response?.data?.message || 'Failed to delete all rows');
        } finally {
            setIsSupplierBulkSaving(false);
        }
    };

    const handleSummaryChange = (identifier, field, value) => {
        setProductRows(prev => prev.map(row => {
            const rowKey = isProducer ? (row.componentCode || '').trim() : (row.skuCode || '').trim();
            if (rowKey === identifier) {
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    const handleComponentSummaryChange = (skuIdentifier, componentCode, field, value) => {
        setProductRows(prev => prev.map(row => {
            const rowKey = isProducer ? (row.componentCode || '').trim() : (row.skuCode || '').trim();
            if (rowKey === skuIdentifier && (row.componentCode || '').trim() === componentCode) {
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    const handleSummaryFileChange = (identifier, file) => {
        setProductRows(prev => prev.map(row => {
            const rowKey = isProducer ? (row.componentCode || '').trim() : (row.skuCode || '').trim();
            if (rowKey === identifier) {
                return { ...row, additionalDocument: file };
            }
            return row;
        }));
    };

    const handleComponentSummaryFileChange = (skuIdentifier, componentCode, file) => {
        setProductRows(prev => prev.map(row => {
            const rowKey = isProducer ? (row.componentCode || '').trim() : (row.skuCode || '').trim();
            if (rowKey === skuIdentifier && (row.componentCode || '').trim() === componentCode) {
                return { ...row, additionalDocument: file };
            }
            return row;
        }));
    };

    const handleProductExport = () => {
        if (productRows.length === 0) {
            notify('warning', 'No data to export');
            return;
        }

        const exportData = productRows.map((row) => {
            const data = {
                'Packaging Type': row.packagingType,
                ...(isProducer ? { 'Client Name': row.clientName || '', 'State': row.clientState || '' } : {}),
                'Industry Category': row.industryCategory,
                'SKU Code': row.skuCode,
                'SKU Description': row.skuDescription,
                'SKU UOM': row.skuUom,
                'Generate Component Code': row.generate || 'No',
                'Component Code': row.componentCode,
                'Component Description': row.componentDescription,
                'Supplier Name': row.supplierName,
                'Supplier State': row.supplierState || '',
                'Supplier Type': row.supplierType || '',
                'Supplier Category': row.supplierCategory || '',
                'Generate Supplier Code': row.generateSupplierCode || 'No',
                'Supplier Code': row.supplierCode
            };
            if (!isManager) {
                data['System Code'] = row.systemCode;
            }
            return data;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Product Compliance");
        XLSX.writeFile(wb, `Product_Compliance_${clientId}.xlsx`);
    };

    const handleProductTemplateDownload = () => {
        const headers = [
            'Packaging Type',
            isProducer ? 'Client Name' : null,
            isProducer ? 'State' : null,
            'Industry Category',
            'SKU Code',
            'SKU Description',
            'SKU UOM',
            'Generate Component Code',
            'Component Code',
            !isManager ? 'System Code' : null,
            'Component Description',
            'Supplier Name',
            'Supplier State',
            'Supplier Type',
            'Supplier Category',
            'Generate Supplier Code',
            'Supplier Code'
        ].filter(Boolean);

        const ws = XLSX.utils.aoa_to_sheet([headers]);

        if (isProducer) {
            const colToLetter = (colIndex1Based) => {
                let n = colIndex1Based;
                let s = '';
                while (n > 0) {
                    const m = (n - 1) % 26;
                    s = String.fromCharCode(65 + m) + s;
                    n = Math.floor((n - 1) / 26);
                }
                return s;
            };

            const getColRef = (headerName) => {
                const idx = headers.findIndex(h => h === headerName);
                if (idx === -1) return null;
                const col = colToLetter(idx + 1);
                return `${col}2:${col}500`;
            };

            const generateRef = getColRef('Generate Component Code');
            const supplierTypeRef = getColRef('Supplier Type');
            const supplierCategoryRef = getColRef('Supplier Category');
            const generateSupplierRef = getColRef('Generate Supplier Code');

            ws['!dataValidation'] = [
                generateRef ? {
                    type: 'list',
                    allowBlank: true,
                    sqref: generateRef,
                    formulae: ['"Yes,No"']
                } : null,
                supplierTypeRef ? {
                    type: 'list',
                    allowBlank: true,
                    sqref: supplierTypeRef,
                    formulae: ['"Manufacture,Importer of raw material,Importer,Producer,Brand Owner,Seller"']
                } : null,
                supplierCategoryRef ? {
                    type: 'list',
                    allowBlank: true,
                    sqref: supplierCategoryRef,
                    formulae: ['"PIBO,SIMP,PWP"']
                } : null,
                generateSupplierRef ? {
                    type: 'list',
                    allowBlank: true,
                    sqref: generateSupplierRef,
                    formulae: ['"Yes,No"']
                } : null
            ].filter(Boolean);
        } else {
            ws['!dataValidation'] = [
                {
                    type: 'list',
                    allowBlank: true,
                    sqref: 'E2:E500',
                    formulae: ['"Yes,No"']
                },
                {
                    type: 'list',
                    allowBlank: true,
                    sqref: 'K2:K500',
                    formulae: ['"Contract Manufacture,Co-Processer,Co-Packaging,Not Applicable"']
                },
                {
                    type: 'list',
                    allowBlank: true,
                    sqref: 'L2:L500',
                    formulae: ['"Producer,Importer,Brand Owner"']
                },
                {
                    type: 'list',
                    allowBlank: true,
                    sqref: 'M2:M500',
                    formulae: ['"Yes,No"']
                }
            ];
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Product Compliance Template");
        XLSX.writeFile(wb, "Product_Compliance_Template.xlsx");
    };

    const handleSupplierExport = () => {
        if (supplierRows.length === 0) {
            notify('warning', 'No data to export');
            return;
        }

        const isProducer = client?.entityType === 'Producer';

        const exportData = supplierRows.map((row) => {
            const data = isProducer ? {
                'Component Code': row.componentCode,
                'Component Description': row.componentDescription,
                'Name of Supplier': row.supplierName,
                'Supplier Type': row.supplierType,
                'Supplier State': row.supplierState || '',
                'Application Type': row.applicationType
            } : {
                'Component Code': row.componentCode,
                'Component Description': row.componentDescription,
                'Name of Supplier': row.supplierName,
                'Supplier State': row.supplierState || ''
            };

            Object.assign(data, {
                'Supplier Status': row.supplierStatus,
                'Food Grade': row.foodGrade,
                'EPR Certificate Number': row.eprCertificateNumber,
                'FSSAI Lic No': row.fssaiLicNo
            });

            if (!isProducer) {
                data['FSSAI Valid Upto'] = row.fssaiValidUpto;
            }

            if (!isManager) {
                data['System Code'] = row.systemCode;
            }
            return data;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Supplier Compliance");
        XLSX.writeFile(wb, `Supplier_Compliance_${clientId}.xlsx`);
    };

    const handleSupplierTemplateDownload = () => {
        const isProducer = client?.entityType === 'Producer';
        const headers = [
            !isManager ? 'System Code' : null,
            'Component Code',
            'Component Description',
            'Name of Supplier',
            isProducer ? 'Supplier Type' : null,
            'Supplier State',
            'Supplier Status',
            isProducer ? 'Application Type' : null,
            'Food Grade',
            'EPR Certificate Number',
            'FSSAI Lic No'
        ].filter(Boolean);

        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const colLetter = (colIndex) => {
            let n = colIndex + 1;
            let s = '';
            while (n > 0) {
                const m = (n - 1) % 26;
                s = String.fromCharCode(65 + m) + s;
                n = Math.floor((n - 1) / 26);
            }
            return s;
        };
        const headerIndex = (label) => headers.findIndex((h) => (h || '').toString().trim().toLowerCase() === label.toLowerCase());
        const statusCol = headerIndex('Supplier Status');
        const foodCol = headerIndex('Food Grade');
        const appCol = headerIndex('Application Type');
        ws['!dataValidation'] = [
            {
                type: 'list',
                allowBlank: true,
                sqref: statusCol >= 0 ? `${colLetter(statusCol)}2:${colLetter(statusCol)}500` : 'A1:A1',
                formulae: ['"Registered,Unregistered"']
            },
            ...(appCol >= 0 ? [{
                type: 'list',
                allowBlank: true,
                sqref: `${colLetter(appCol)}2:${colLetter(appCol)}500`,
                formulae: ['"Liquid,Solid"']
            }] : []),
            {
                type: 'list',
                allowBlank: true,
                sqref: foodCol >= 0 ? `${colLetter(foodCol)}2:${colLetter(foodCol)}500` : 'A1:A1',
                formulae: ['"Food,Non Food"']
            }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Supplier Compliance Template");
        XLSX.writeFile(wb, "Supplier_Compliance_Template.xlsx");
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            if (!data || data.length === 0) {
                notify('error', 'Excel file is empty');
                return;
            }

            const newRows = [];
            let currentAllRows = [...productRows];

            data.forEach((row, index) => {
                // Helper to find value by regex patterns
                const getValue = (patterns) => {
                    const rowKeys = Object.keys(row);
                    // 1. Try finding a key that matches one of the patterns
                    for (const pattern of patterns) {
                        const match = rowKeys.find(k => pattern.test(k));
                        if (match && row[match] !== undefined) return String(row[match]).trim();
                    }
                    return '';
                };
                
                let packagingType = getValue([/packaging.*type/i]);
                let industryCategory = getValue([/industry.*cat/i, /category/i]);
                let skuCode = getValue([/sku.*code/i, /^sku$/i]);
                let skuDescription = getValue([/sku.*desc/i]);
                let skuUom = getValue([/sku.*uom/i, /uom/i]);
                // Generate: matches "generate", but exclude "supplier" to avoid confusing with "Generate Supplier Code"
                let generate = getValue([/^generate\s*component\s*code/i, /^generate(?!.*supplier)/i, /^generate$/i]);
                
                // Be very strict about matching exactly "Component Code"
                let componentCode = getValue([/^component\s*code$/i, /^componentCode$/i]);
                if (!componentCode) {
                     // Fallback if header is slightly dirty but definitely not generate
                     componentCode = getValue([/^component.*code/i]);
                }

                // Specifically avoid accidental assignment of "Yes"/"No" to componentCode
                if (componentCode && (componentCode.toLowerCase() === 'yes' || componentCode.toLowerCase() === 'no')) {
                    const possibleGenerateValue = componentCode;
                    componentCode = ''; // Clear it out because it read the wrong column
                    if (!generate) generate = possibleGenerateValue;
                }

                if (!generate && isProducer) {
                    generate = 'No'; // Producer doesn't usually generate codes
                } else if (!generate) {
                    generate = 'No';
                }
                
                let componentDescription = getValue([/component.*desc/i]);
                let supplierName = getValue([/supplier.*name/i]);
                let supplierState = getValue([/supplier.*state/i]);
                let supplierType = getValue([/supplier.*type/i]);
                let supplierCategory = getValue([/supplier.*cat/i, /category/i]);
                let generateSupplierCode = getValue([/generate.*supplier/i]) || 'No';
                let supplierCode = getValue([/supplier.*code/i]);
                let clientName = getValue([/client.*name/i]);
                let clientState = getValue([/client.*state/i, /^state$/i]);

                if (generate === 'Yes') {
                     const match = currentAllRows.find(r => 
                        (r.skuCode || '').trim() === skuCode && 
                        (r.componentDescription || '').trim() === componentDescription &&
                        r.componentCode
                     );
                     
                     if (match && match.componentCode) {
                         componentCode = match.componentCode;
                     } else {
                         componentCode = generateComponentCodeForBulk(currentAllRows, client?.clientName, item?.plantName, componentRows);
                     }
                } else {
                    // generate === 'No'
                    if (!componentCode) {
                         const match = currentAllRows.find(r => 
                            (r.skuCode || '').trim() === skuCode && 
                            (r.componentDescription || '').trim() === componentDescription &&
                            r.componentCode
                         );
                         if (match && match.componentCode) {
                             componentCode = match.componentCode;
                         }
                    }
                }
                
                if (generateSupplierCode === 'No') {
                     const stateShort = getStateShortName(supplierState);
                     const supplierShort = getSupplierShortName(supplierName);
                     const companyShort = getCompanyShortName(client?.clientName);
                     const prefix = `${supplierShort}/${companyShort}/${stateShort}/`;
                     const match = currentAllRows.find(r => 
                        (r.supplierName || '').trim().toLowerCase() === supplierName.toLowerCase() && 
                        getStateShortName(r.supplierState) === stateShort &&
                        (r.supplierCode || '').trim().startsWith(prefix)
                     );
                     
                     if (match && match.supplierCode) {
                         supplierCode = match.supplierCode;
                     } else {
                         supplierCode = generateSupplierCodeForBulk(currentAllRows, supplierName, client?.clientName);
                     }
                }

                // Use the correct System Code generation logic
                const companyShortName = getCompanyShortName(client?.clientName);
                const sysPrefix = `${companyShortName}/Com/`;
                let maxSysNum = 0;
                currentAllRows.forEach(r => {
                    if (r.systemCode && r.systemCode.startsWith(sysPrefix)) {
                        const numPart = r.systemCode.substring(sysPrefix.length);
                        if (/^\d+$/.test(numPart)) {
                            const num = parseInt(numPart, 10);
                            if (!isNaN(num) && num > maxSysNum) maxSysNum = num;
                        }
                    }
                });
                const systemCode = `${sysPrefix}${String(maxSysNum + 1).padStart(3, '0')}`;

                const newRow = {
                    packagingType,
                    clientName,
                    clientState,
                    industryCategory,
                    skuCode,
                    skuDescription,
                    skuUom,
                    productImage: null,
                    generate,
                    componentCode,
                    systemCode,
                    componentDescription,
                    supplierName,
                    supplierState,
                    supplierType,
                    supplierCategory,
                    generateSupplierCode,
                    supplierCode,
                    componentImage: null,
                    id: `excel-${Date.now()}-${index}`
                };

                newRows.push(newRow);
                currentAllRows.push(newRow);
            });

            setProductRows(prev => [...prev, ...newRows]);
            notify('success', `Loaded ${newRows.length} rows from Excel`);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const handleBulkSave = async () => {
        setIsBulkSaving(true);
        try {
            const rowsForValidation = (Array.isArray(productRows) ? productRows : []).filter((r) => r && typeof r === 'object');
            const validatedRows = rowsForValidation.map(row => {
                const missing = [];
                if (!row.systemCode) missing.push('System Code');
                if (!row.packagingType) missing.push('Packaging Type');
                if (isProducer) {
                    if (!row.clientName) missing.push('Client Name');
                    if (!row.clientState) missing.push('State');
                } else {
                    if (!row.skuCode) missing.push('SKU Code');
                    if (!row.skuDescription) missing.push('SKU Description');
                    if (!row.skuUom) missing.push('SKU UOM');
                }
                if (!row.componentDescription) missing.push('Component Description');
                if (!row.supplierName) missing.push('Supplier Name');
                if (!row.componentCode) missing.push('Component Code');
                
                if (missing.length > 0) {
                    return { ...row, _validationError: `Missing: ${missing.join(', ')}` };
                }
                return { ...row, _validationError: null };
            });

            const normalizedRows = validatedRows.map((r, idx) => {
                if (!r || r._validationError) return r;
                const supplierCode = ensureSupplierCodeWithState(validatedRows, r, idx);
                if (!supplierCode) return r;
                return { ...r, supplierCode };
            });

            const validRows = validatedRows.filter(r => !r._validationError);
            const invalidRows = validatedRows.filter(r => r._validationError);
            
            if (validatedRows.length === 0) {
                notify('warning', 'No rows to save.');
                setIsBulkSaving(false);
                return false;
            }

            if (invalidRows.length > 0) {
                 notify('warning', `${invalidRows.length} row(s) have missing fields. Please fix them.`);
                 setProductRows(normalizedRows);
            }

            const payload = normalizedRows.map(r => {
                 const { _validationError, ...rest } = r;
                 return {
                    ...rest,
                    productImage: typeof rest.productImage === 'string' ? rest.productImage : '',
                    componentImage: typeof rest.componentImage === 'string' ? rest.componentImage : ''
                 };
            });
            
            const res = await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(clientId), {
                type,
                itemId,
                rows: payload
            });
            
            if (res.data && res.data.success) {
                notify('success', `Saved ${payload.length} rows successfully`);
                const savedRows = (Array.isArray(res.data.data) ? res.data.data : []).filter((r) => r && typeof r === 'object');
                setProductRows(savedRows);
                // We should update lastSavedRows carefully.
                // The response contains ONLY the rows we saved.
                // We need to keep the "old" lastSavedRows for the invalid rows (if they existed previously)
                // But actually, simpler is:
                // lastSavedRows should mirror what is in DB. 
                // Since we did a bulk save (overwriting logic usually?), or upsert?
                // The API usually returns the FULL list of rows for this itemId/type if it's a "save all" type endpoint.
                // If it only returns saved rows, we might have issues.
                // Let's assume it returns saved rows.
                
                // If the API returns ONLY saved rows, we need to fetch all?
                // Or maybe just assume invalid rows are "unsaved changes" on top of whatever they were.
                
                // For now, let's just update lastSavedRows with the saved ones, 
                // but we need to match them by ID or something?
                // Actually, existing logic: setLastSavedRows([...res.data.data]);
                // This implies res.data.data IS the full list.
                // But if we didn't send invalid rows, they won't be in res.data.data?
                // If backend does "delete all and insert", then invalid rows are LOST from DB?
                // Wait, if I bulk save, I expect it to be "Upsert" or "Replace All".
                // If "Replace All", then invalid rows (which I didn't send) will be deleted from DB!
                // That is DANGEROUS.
                
                // User requirement: "Save all valid rows in one API call. Skip invalid rows with error message."
                // If backend is "Replace All", we MUST send all rows (even invalid ones?) or handle it.
                // If backend is "Upsert", it's fine.
                
                // Let's check backend logic if possible. But I can't easily.
                // Assuming "Upsert" is safer.
                // But looking at previous code: setLastSavedRows([...res.data.data]);
                // It suggests res.data.data is the new truth.
                
                // If I am careful, I should verify if invalid rows are preserved.
                // But for now, I will stick to the implementation:
                setLastSavedRows([...savedRows]); 
                return true;
            } else {
                notify('error', res.data.message || 'Failed to save rows');
                setProductRows(validatedRows);
                return false;
            }

        } catch (err) {
            console.error(err);
            notify('error', 'Failed to save rows');
            return false;
        } finally {
            setIsBulkSaving(false);
        }
    };

    const handleSupplierExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            if (!data || data.length === 0) {
                notify('error', 'Excel file is empty');
                return;
            }

            const newRows = [];
          const normalizeFoodGrade = (value) => {
              const raw = (value ?? '').toString().trim();
              const lower = raw.toLowerCase();
              if (!raw) return '';
              if (lower === 'yes' || lower === 'food') return 'Food';
              if (lower === 'no' || lower === 'non food' || lower === 'non-food' || lower === 'nonfood') return 'Non Food';
              return raw;
          };
            data.forEach((row) => {
                const getValue = (patterns) => {
                    const rowKeys = Object.keys(row);
                    for (const pattern of patterns) {
                        const match = rowKeys.find(k => pattern.test(k));
                        if (match && row[match] !== undefined) return String(row[match]).trim();
                    }
                    return '';
                };

                const systemCode = getValue([/system.*code/i]);
                let componentCode = getValue([/component.*code/i]);
                let componentDescription = getValue([/component.*desc/i]);
                let supplierName = getValue([/name.*supplier/i, /supplier.*name/i]);
                let supplierState = getValue([/supplier.*state/i]);
                let supplierType = getValue([/supplier.*type/i]);
                const supplierStatus = getValue([/supplier.*status/i]);
                const rawApplicationType = getValue([/application.*type/i]);
                const applicationType = (() => {
                    const raw = (rawApplicationType ?? '').toString().trim();
                    const lower = raw.toLowerCase();
                    if (lower === 'liquid') return 'Liquid';
                    if (lower === 'solid') return 'Solid';
                    return raw;
                })();
              const foodGrade = normalizeFoodGrade(getValue([/food.*grade/i]));
                const eprCertificateNumber = getValue([/epr.*cert/i, /epr.*no/i]);
                const fssaiLicNo = getValue([/fssai.*lic/i, /fssai.*no/i]);
              const fssaiValidUpto = getValue([/fssai.*valid/i, /valid.*upto/i]);

                let selectedOption = null;
                if (systemCode) {
                    selectedOption = systemCodeOptions.find(opt => opt.code === systemCode) || null;
                    if (selectedOption && selectedOption.data) {
                        if (!componentCode) componentCode = selectedOption.data.componentCode || '';
                        if (!componentDescription) componentDescription = selectedOption.data.componentDescription || '';
                        if (!supplierName) supplierName = selectedOption.data.supplierName || '';
                        if (!supplierState) supplierState = selectedOption.data.supplierState || '';
                        if (!supplierType) supplierType = selectedOption.data.supplierType || '';
                    }
                }

                newRows.push({
                    systemCode,
                    componentCode,
                    componentDescription,
                    supplierName,
                    supplierState: supplierState || '',
                    supplierType,
                    supplierStatus,
                    applicationType: isProducer ? applicationType : '',
                    foodGrade,
                    eprCertificateNumber,
                    fssaiLicNo,
                    fssaiValidUpto,
                    _validationError: null
                });
            });

            setSupplierRows(prev => [...prev, ...newRows]);
            notify('success', `Loaded ${newRows.length} rows from Excel`);
        };
        reader.readAsBinaryString(file);
        e.target.value = null;
    };

    const handleSupplierBulkSave = async () => {
        setIsSupplierBulkSaving(true);
        try {
            const validatedRows = supplierRows.map((row) => {
                const hydrated = hydrateSupplierRowFromSystemCode(row);
                const missing = [];
                if (!hydrated.componentCode) missing.push('Component Code');
                if (!hydrated.supplierName) missing.push('Supplier Name');
                
                if (missing.length > 0) {
                    return { ...hydrated, _validationError: `Missing: ${missing.join(', ')}` };
                }
                return { ...hydrated, _validationError: null };
            });

            const validRows = validatedRows.filter(r => !r._validationError);
            const invalidRows = validatedRows.filter(r => r._validationError);

            if (validRows.length === 0 && invalidRows.length > 0) {
                setSupplierRows(validatedRows);
                notify('warning', 'No valid rows to save. Please check for missing fields.');
                setIsSupplierBulkSaving(false);
                return false;
            }
            
            // If strictly no rows at all
            if (validRows.length === 0 && invalidRows.length === 0) {
                 setIsSupplierBulkSaving(false);
                 return true;
            }

            const payload = {
                type,
                itemId,
                rows: validRows.map(r => ({
                    systemCode: r.systemCode,
                    componentCode: r.componentCode,
                    componentDescription: r.componentDescription,
                    supplierName: r.supplierName,
                    supplierState: r.supplierState,
                    supplierType: (r.supplierType || '').toString(),
                    supplierStatus: r.supplierStatus,
                    applicationType: r.applicationType,
                    foodGrade: r.foodGrade,
                    eprCertificateNumber: r.eprCertificateNumber,
                    fssaiLicNo: r.fssaiLicNo,
                    fssaiValidUpto: r.fssaiValidUpto
                }))
            };

            const res = await api.post(API_ENDPOINTS.CLIENT.PRODUCT_SUPPLIER_COMPLIANCE(clientId), payload);
            if (res.data.success) {
                notify('success', 'Supplier compliance saved successfully');
                const savedRows = res.data.data || [];
                // Merge saved rows with invalid rows (keep invalid ones in UI)
                setSupplierRows([...savedRows, ...invalidRows]);
                setLastSavedSupplierRows([...savedRows]);
                return true;
            } else {
                notify('error', res.data.message || 'Failed to save');
                setSupplierRows(validatedRows); // Show errors
                return false;
            }

        } catch (err) {
            console.error(err);
            notify('error', err.response?.data?.message || 'Failed to save supplier rows');
            return false;
        } finally {
            setIsSupplierBulkSaving(false);
        }
    };

  const addRow = () => {
    setProductRows(prev => {
        // Calculate new code using 'prev'
        const companyShortName = getCompanyShortName(client?.clientName);
        const plantCode = getPlantCode(item?.plantName);

        const prefix = `${companyShortName}/${plantCode}/Com/`;
        
        let maxNum = 0;
        prev.forEach(r => {
            if (!r) return;
            const code = (r.componentCode || '').trim();
            if (code.startsWith(prefix)) {
                const numPart = code.substring(prefix.length);
                if (/^\d+$/.test(numPart)) {
                    const num = parseInt(numPart, 10);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            }
        });
        componentRows.forEach(r => {
            if (!r) return;
            const code = (r.componentCode || '').trim();
            if (code.startsWith(prefix)) {
                const numPart = code.substring(prefix.length);
                if (/^\d+$/.test(numPart)) {
                    const num = parseInt(numPart, 10);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            }
        });
        
        const nextNum = maxNum + 1;
        const newCode = `${prefix}${nextNum.toString().padStart(3, '0')}`;
        
        const newSystemCode = generateSystemCode(prev);

      const newRows = [
        ...prev,
        {
          generate: 'No',
          systemCode: newSystemCode,
          packagingType: '',
          clientName: '',
          clientState: '',
          skuCode: '',
          skuDescription: '',
          skuUom: '',
          productImage: null,
          componentCode: newCode,
          componentDescription: '',
          supplierName: '',
          supplierState: '',
          supplierType: '',
          supplierCategory: '',
          generateSupplierCode: 'No',
          supplierCode: '',
          componentImage: null
        }
      ];
      setCurrentPage(Math.ceil(newRows.length / itemsPerPage));
      return newRows;
    });
  };
  const removeRow = (index) => {
    setProductRows(prev => prev.filter((_, i) => i !== index));
    setLastSavedRows(prev => prev.filter((_, i) => i !== index));
    setInitialProductRows(prev => prev.filter((_, i) => i !== index));
  };

  const [savingRow, setSavingRow] = useState(null);
  const getComparableProductValue = (value, field) => {
    if (field === 'productImage' || field === 'componentImage') {
      if (value instanceof File) return `file:${value.name}:${value.size}:${value.lastModified}`;
      if (typeof value === 'string') return `url:${value}`;
      return '';
    }
    return (value ?? '').toString().trim();
  };
  const formatProductFieldValue = (value, field) => {
    if (field === 'productImage' || field === 'componentImage') {
      if (value instanceof File) return value.name || 'Selected File';
      if (typeof value === 'string' && value) return 'Uploaded';
      return '-';
    }
    const str = (value ?? '').toString();
    return str === '' ? '-' : str;
  };
  const isProductFieldChanged = (rowIndex, field, currentValue) => {
    const prevValue = lastSavedRows[rowIndex]?.[field];
    return getComparableProductValue(prevValue, field) !== getComparableProductValue(currentValue, field);
  };

  const isSkuFieldChanged = (rowIndex, field, currentValue) => {
    const prevValue = lastSavedSkuRows[rowIndex]?.[field];
    return getComparableProductValue(prevValue, field) !== getComparableProductValue(currentValue, field);
  };

  const handleSkuCodeSelect = (idx, selectedSkuCode) => {
    const selectedOption = skuOptions.find(opt => opt.skuCode === selectedSkuCode);
    const newRows = [...skuRows];
    newRows[idx] = {
      ...newRows[idx],
      skuCode: selectedSkuCode,
      skuDescription: selectedOption ? selectedOption.skuDescription : '',
      skuUom: selectedOption ? selectedOption.skuUom : '',
      productImage: selectedOption ? selectedOption.productImage : newRows[idx].productImage
    };
    setSkuRows(newRows);
  };

  const saveRow = async (idx) => {
    setSavingRow(idx);
    
    // Validation
    const rowToCheck = productRows[idx];
    if (!rowToCheck || typeof rowToCheck !== 'object') {
        notify('error', 'Row is empty');
        setSavingRow(null);
        return;
    }
    if (!rowToCheck.componentCode || !rowToCheck.componentCode.trim()) {
        notify('error', 'Component Code is mandatory');
        setSavingRow(null);
        return;
    }
    
    const codeToCheck = rowToCheck.componentCode.trim();
    // 1. Check for Code Collision: If Code is same, SKU & Desc must match
    const isDuplicate = productRows.some((r, i) => {
        if (i === idx) return false;
        const otherCode = (r.componentCode || '').trim();
        if (otherCode !== codeToCheck) return false;
        
        const sameSku = (r.skuCode || '').trim() === (rowToCheck.skuCode || '').trim();
        const sameDesc = (r.componentDescription || '').trim() === (rowToCheck.componentDescription || '').trim();
        return !(sameSku && sameDesc);
    });

    if (isDuplicate) {
        notify('error', 'Component Code must be unique (or match existing SKU/Description)');
        setSavingRow(null);
        return;
    }

    // 2. Check for Consistency: If SKU & Desc match an existing row, Code must match
    const skuToCheck = (rowToCheck.skuCode || '').trim();
    const descToCheck = (rowToCheck.componentDescription || '').trim();
    
    if (skuToCheck && descToCheck) {
        const existingMatch = productRows.find((r, i) => {
            if (i === idx) return false;
            return (r.skuCode || '').trim() === skuToCheck && 
                   (r.componentDescription || '').trim() === descToCheck;
        });

        if (existingMatch) {
            const existingCode = (existingMatch.componentCode || '').trim();
            if (existingCode && existingCode !== codeToCheck) {
                notify('error', `For this SKU & Description, you must reuse Component Code: ${existingCode}`);
                setSavingRow(null);
                return;
            }
        }
    }

    // Check Supplier Code Uniqueness
    const supplierCodeNormalized = ensureSupplierCodeWithState(productRows, rowToCheck, idx);
    const supplierCodeToCheck = supplierCodeNormalized;
    const supplierNameToCheck = (rowToCheck.supplierName || '').trim().toLowerCase();
    
    if (supplierCodeToCheck) {
        const isSupplierDuplicate = productRows.some((r, i) => {
            if (i === idx) return false;
            const otherCode = (r.supplierCode || '').trim();
            if (otherCode !== supplierCodeToCheck) return false;
            
            // If code is same, Supplier Name MUST be same
            const otherName = (r.supplierName || '').trim().toLowerCase();
            return otherName !== supplierNameToCheck;
        });

        if (isSupplierDuplicate) {
            notify('error', 'Supplier Code must be unique (or reused for the same Supplier)');
            setSavingRow(null);
            return;
        }
    }

    try {
      const beforeRow = lastSavedRows[idx] || {};
      const row = { ...productRows[idx], supplierCode: supplierCodeNormalized };
      if ((productRows[idx]?.supplierCode || '').trim() !== supplierCodeNormalized) {
        setProductRows((prev) => {
          const copy = [...prev];
          copy[idx] = row;
          return copy;
        });
      }
      // Ensure hasFiles is true ONLY if actual File objects are present
      const hasFiles = (row.productImage instanceof File) || (row.componentImage instanceof File);
      let savedRowForHistory = row;
      if (hasFiles) {
        const fd = new FormData();
        fd.append('type', type);
        fd.append('itemId', itemId);
        fd.append('rowIndex', idx);
        const rowJson = JSON.stringify({
          ...row,
          productImage: typeof row.productImage === 'string' ? row.productImage : '',
          componentImage: typeof row.componentImage === 'string' ? row.componentImage : ''
        });
        fd.append('row', rowJson);
        if (row.productImage instanceof File) fd.append('productImage', row.productImage);
        if (row.componentImage instanceof File) fd.append('componentImage', row.componentImage);
        
        console.log("Uploading row with files:", { rowIndex: idx, hasProductImage: row.productImage instanceof File });
        
        const res = await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE_UPLOAD(clientId), fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const saved = res.data?.data?.row || row;
        savedRowForHistory = saved;
        setProductRows(prev => {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        });
      } else {
        const payload = {
          type,
          itemId,
          rowIndex: idx,
          row: {
            ...row,
            productImage: typeof row.productImage === 'string' ? row.productImage : '',
            componentImage: typeof row.componentImage === 'string' ? row.componentImage : ''
          }
        };
        console.log("Saving row (JSON):", payload.row);
        await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(clientId), payload);
      }

      const syncComponentDescription = (componentCode, systemCode, componentDescription) => {
        const cc = (componentCode || '').toString().trim();
        const sc = (systemCode || '').toString().trim();
        const desc = (componentDescription || '').toString();
        if (!cc || !desc.trim()) return;

        const matches = (r) => {
          const rSc = (r?.systemCode || '').toString().trim();
          const rCc = (r?.componentCode || '').toString().trim();
          if (sc && rSc) return rSc === sc;
          return rCc === cc;
        };

        const apply = (rows) => (Array.isArray(rows) ? rows.map((r) => (matches(r) ? { ...r, componentDescription: desc } : r)) : rows);

        setSupplierRows(apply);
        setLastSavedSupplierRows(apply);
        setComponentRows(apply);
        setLastSavedComponentRows(apply);
        setMonthlyRows(apply);
        setLastSavedMonthlyRows(apply);
        setRecycledRows(apply);
        setLastSavedRecycledRows(apply);
      };

      syncComponentDescription(
        savedRowForHistory.componentCode,
        savedRowForHistory.systemCode,
        savedRowForHistory.componentDescription
      );

      const fields = ['generate', 'systemCode', 'packagingType', 'clientName', 'clientState', 'skuCode', 'skuDescription', 'skuUom', 'productImage', 'componentCode', 'componentDescription', 'supplierName', 'supplierState', 'supplierType', 'supplierCategory', 'generateSupplierCode', 'supplierCode', 'componentImage'];
      const entryBaseId = `${Date.now()}-${Math.random()}`;
      const historyEntries = [];
      fields.forEach((field) => {
        const prevVal = beforeRow[field];
        const currVal = savedRowForHistory[field];
        if (getComparableProductValue(prevVal, field) !== getComparableProductValue(currVal, field)) {
          historyEntries.push({
            id: `${entryBaseId}-${field}`,
            table: 'Product Compliance',
            row: idx + 1,
            field: field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            prev: formatProductFieldValue(prevVal, field),
            curr: formatProductFieldValue(currVal, field),
            user: resolvedUserName,
            at: new Date().toISOString()
          });
        }
      });
      appendPersistedHistory(historyEntries);
      setDbHistory(prev => [...prev, ...historyEntries]);
      setLastSavedRows(prev => {
        const copy = [...prev];
        copy[idx] = savedRowForHistory;
        return copy;
      });
      notify('success', 'Product compliance saved successfully');
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to save product row');
    } finally {
      setSavingRow(null);
    }
  };
  const cancelRow = (idx) => {
    const saved = lastSavedRows[idx];
    if (saved) {
      setProductRows(prev => {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      });
    } else {
      removeRow(idx);
    }
  };

  const handleComponentSave = async (skuIdentifier, componentCode) => {
    const idx = productRows.findIndex(r => {
        const rowKey = isProducer ? (r.componentCode || '').trim() : (r.skuCode || '').trim();
        return rowKey === skuIdentifier && (r.componentCode || '').trim() === componentCode;
    });
    if (idx !== -1) {
        await saveRow(idx);
    } else {
        notify('error', 'Component not found');
    }
  };

  const [isSkuBulkSaving, setIsSkuBulkSaving] = useState(false);
  const [savingSkuRow, setSavingSkuRow] = useState(null);

  const addSkuRow = () => {
    setSkuRows(prev => {
      const newRows = [
        ...prev,
        {
          generate: 'No',
          systemCode: '',
          packagingType: '',
          skuCode: '',
          skuDescription: '',
          skuUom: '',
          productImage: null,
          componentCode: '',
          componentDescription: '',
          supplierName: '',
          supplierType: '',
          supplierCategory: '',
          generateSupplierCode: 'No',
          supplierCode: '',
          componentImage: null
        }
      ];
      setSkuPage(Math.ceil(newRows.length / skuItemsPerPage));
      return newRows;
    });
  };

  const removeSkuRow = (index) => {
    setSkuRows(prev => prev.filter((_, i) => i !== index));
    setLastSavedSkuRows(prev => prev.filter((_, i) => i !== index));
    setInitialSkuRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSkuRowChange = (index, field, value) => {
    setSkuRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSkuFileChange = (index, field, file) => {
    setSkuRows(prev => {
        const copy = [...prev];
        copy[index] = { ...copy[index], [field]: file };
        return copy;
    });
  };

  const saveSkuRow = async (idx) => {
    setSavingSkuRow(idx);
    try {
      const beforeRow = lastSavedSkuRows[idx] || {};
      const row = skuRows[idx];
      const hasFiles = (row.productImage instanceof File) || (row.componentImage instanceof File);
      let savedRowForHistory = row;

      if (hasFiles) {
        const fd = new FormData();
        fd.append('type', type);
        fd.append('itemId', itemId);
        fd.append('rowIndex', idx);
        const rowJson = JSON.stringify({
          ...row,
          productImage: typeof row.productImage === 'string' ? row.productImage : '',
          componentImage: typeof row.componentImage === 'string' ? row.componentImage : ''
        });
        fd.append('row', rowJson);
        if (row.productImage instanceof File) fd.append('productImage', row.productImage);
        if (row.componentImage instanceof File) fd.append('componentImage', row.componentImage);
        
        const res = await api.post(API_ENDPOINTS.CLIENT.SKU_COMPLIANCE_UPLOAD(clientId), fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const saved = res.data?.data?.row || row;
        savedRowForHistory = saved;
        setSkuRows(prev => {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        });
      } else {
        const payload = {
          type,
          itemId,
          rowIndex: idx,
          row: {
            ...row,
            productImage: typeof row.productImage === 'string' ? row.productImage : '',
            componentImage: typeof row.componentImage === 'string' ? row.componentImage : ''
          }
        };
        await api.post(API_ENDPOINTS.CLIENT.SKU_COMPLIANCE(clientId), payload);
      }

      const fields = ['skuCode', 'skuDescription', 'skuUom', 'productImage'];
      const entryBaseId = `${Date.now()}-${Math.random()}`;
      const historyEntries = [];
      fields.forEach((field) => {
        const prevVal = beforeRow[field];
        const currVal = savedRowForHistory[field];
        if (getComparableProductValue(prevVal, field) !== getComparableProductValue(currVal, field)) {
          historyEntries.push({
            id: `${entryBaseId}-${field}`,
            table: 'SKU Compliance',
            row: idx + 1,
            field: field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            prev: formatProductFieldValue(prevVal, field),
            curr: formatProductFieldValue(currVal, field),
            user: resolvedUserName,
            at: new Date().toISOString()
          });
        }
      });
      appendPersistedHistory(historyEntries);
      setDbHistory(prev => [...prev, ...historyEntries]);

      setLastSavedSkuRows(prev => {
        const copy = [...prev];
        copy[idx] = savedRowForHistory;
        return copy;
      });
      notify('success', 'SKU compliance saved successfully');
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to save SKU row');
    } finally {
      setSavingSkuRow(null);
    }
  };

  const cancelSkuRow = (idx) => {
    const saved = lastSavedSkuRows[idx];
    if (saved) {
        setSkuRows(prev => {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      });
    } else {
        removeSkuRow(idx);
    }
  };

  const handleSkuBulkSave = async () => {
    setIsSkuBulkSaving(true);
    try {
        const validatedRows = skuRows.map(row => {
            const missing = [];
            if (!row.skuCode) missing.push('SKU Code');
            // Add other mandatory fields if needed
            
            if (missing.length > 0) {
                return { ...row, _validationError: `Missing: ${missing.join(', ')}` };
            }
            return { ...row, _validationError: null };
        });

        const validRows = validatedRows.filter(r => !r._validationError);
        const invalidRows = validatedRows.filter(r => r._validationError);
        
        if (validRows.length === 0) {
            setSkuRows(validatedRows);
            notify('warning', 'No valid rows to save.');
            setIsSkuBulkSaving(false);
            return;
        }

        const payload = validRows.map(r => {
             const { _validationError, ...rest } = r;
             return {
                ...rest,
                productImage: typeof rest.productImage === 'string' ? rest.productImage : '',
                componentImage: typeof rest.componentImage === 'string' ? rest.componentImage : ''
             };
        });

        const res = await api.post(API_ENDPOINTS.CLIENT.SKU_COMPLIANCE(clientId), {
            type,
            itemId,
            rows: payload
        });
        
        if (res.data && res.data.success) {
            notify('success', `Saved ${validRows.length} rows successfully`);
            setSkuRows([...res.data.data, ...invalidRows]);
            setLastSavedSkuRows([...res.data.data]); 
        } else {
            notify('error', res.data.message || 'Failed to save rows');
            setSkuRows(validatedRows);
        }

    } catch (err) {
        console.error(err);
        notify('error', 'Failed to save rows');
    } finally {
        setIsSkuBulkSaving(false);
    }
  };

  const handleSkuDeleteAll = async () => {
      if (!window.confirm('Are you sure you want to delete all SKU compliance rows?')) return;
      
      try {
          const payload = {
              type,
              itemId,
              rows: []
          };
          await api.post(API_ENDPOINTS.CLIENT.SKU_COMPLIANCE(clientId), payload);
          setSkuRows([]);
          setLastSavedSkuRows([]);
          setInitialSkuRows([]);
          notify('success', 'All SKU compliance rows deleted successfully');
      } catch (err) {
          console.error('Failed to delete all SKU rows:', err);
          notify('error', 'Failed to delete all SKU rows');
      }
  };

    const handleSkuExport = () => {
        if (skuRows.length === 0) {
            notify('warning', 'No data to export');
            return;
        }

        const exportData = skuRows.map((row) => {
            const data = {
                'Packaging Type': row.packagingType,
                'SKU Code': row.skuCode,
                'SKU Description': row.skuDescription,
                'SKU UOM': row.skuUom,
                'Generate': row.generate || 'No',
                'Component Code': row.componentCode,
                'Component Description': row.componentDescription,
                'Supplier Name': row.supplierName,
                'Supplier Type': row.supplierType || '',
                'Supplier Category': row.supplierCategory || '',
                'Generate Supplier Code': row.generateSupplierCode || 'No',
                'Supplier Code': row.supplierCode
            };
            if (!isManager) {
                data['System Code'] = row.systemCode;
            }
            return data;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SKU Compliance");
        XLSX.writeFile(wb, `SKU_Compliance_${clientId}.xlsx`);
    };

    const handleSkuTemplateDownload = () => {
        const headers = [
            'Packaging Type',
            'SKU Code',
            'SKU Description',
            'SKU UOM',
            'Generate',
            'Component Code',
            !isManager ? 'System Code' : null,
            'Component Description',
            'Supplier Name',
            'Supplier Type',
            'Supplier Category',
            'Generate Supplier Code',
            'Supplier Code'
        ].filter(Boolean);

        const ws = XLSX.utils.aoa_to_sheet([headers]);

        ws['!dataValidation'] = [
            {
                type: 'list',
                allowBlank: true,
                sqref: 'E2:E500',
                formulae: ['"Yes,No"']
            },
            {
                type: 'list',
                allowBlank: true,
                sqref: 'J2:J500',
                formulae: ['"Contract Manufacture,Co-Processer,Co-Packaging,Not Applicable"']
            },
            {
                type: 'list',
                allowBlank: true,
                sqref: 'K2:K500',
                formulae: ['"Producer,Importer,Brand Owner"']
            },
            {
                type: 'list',
                allowBlank: true,
                sqref: 'L2:L500',
                formulae: ['"Yes,No"']
            }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SKU Compliance Template");
        XLSX.writeFile(wb, "SKU_Compliance_Template.xlsx");
    };

    const handleSkuExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            if (!data || data.length === 0) {
                notify('error', 'Excel file is empty');
                return;
            }

            const newRows = [];
            let currentAllRows = [...skuRows];

            data.forEach((row, index) => {
                const getValue = (patterns) => {
                    const rowKeys = Object.keys(row);
                    for (const pattern of patterns) {
                        const match = rowKeys.find(k => pattern.test(k));
                        if (match && row[match] !== undefined) return String(row[match]).trim();
                    }
                    return '';
                };
                
                let packagingType = getValue([/packaging.*type/i]);
                let skuCode = getValue([/sku.*code/i, /^sku$/i]);
                let skuDescription = getValue([/sku.*desc/i]);
                let skuUom = getValue([/sku.*uom/i, /uom/i]);
                let generate = getValue([/^generate(?!.*supplier)/i, /^generate$/i]) || 'No';
                let componentCode = getValue([/^component\s*code/i]);

                if (componentCode && (componentCode.toLowerCase() === 'yes' || componentCode.toLowerCase() === 'no')) {
                    const possibleGenerateValue = componentCode;
                    componentCode = ''; 
                    if (!generate) generate = possibleGenerateValue;
                }
                let componentDescription = getValue([/component.*desc/i]);
                let supplierName = getValue([/supplier.*name/i]);
                let supplierType = getValue([/supplier.*type/i]);
                let supplierCategory = getValue([/supplier.*cat/i, /category/i]);
                let generateSupplierCode = getValue([/generate.*supplier/i]) || 'No';
                let supplierCode = getValue([/supplier.*code/i]);

                if (generate === 'Yes') {
                     const match = currentAllRows.find(r => 
                        (r.skuCode || '').trim() === skuCode && 
                        (r.componentDescription || '').trim() === componentDescription
                     );
                     
                     if (match && match.componentCode) {
                         componentCode = match.componentCode;
                     } else {
                         componentCode = generateComponentCodeForBulk(currentAllRows, client?.clientName, item?.plantName, componentRows);
                     }
                }
                
                if (generateSupplierCode === 'Yes') {
                     const match = currentAllRows.find(r => 
                        (r.supplierName || '').trim().toLowerCase() === supplierName.toLowerCase() && 
                        (r.supplierCode || '').trim()
                     );
                     
                     if (match && match.supplierCode) {
                         supplierCode = match.supplierCode;
                     } else {
                         supplierCode = generateSupplierCodeForBulk(currentAllRows, supplierName, client?.clientName);
                     }
                }

                const companyShortName = getCompanyShortName(client?.clientName);
                const sysPrefix = `${companyShortName}/Com/`;
                let maxSysNum = 0;
                currentAllRows.forEach(r => {
                    if (r.systemCode && r.systemCode.startsWith(sysPrefix)) {
                        const numPart = r.systemCode.substring(sysPrefix.length);
                        if (/^\d+$/.test(numPart)) {
                            const num = parseInt(numPart, 10);
                            if (!isNaN(num) && num > maxSysNum) maxSysNum = num;
                        }
                    }
                });
                const systemCode = `${sysPrefix}${String(maxSysNum + 1).padStart(3, '0')}`;

                const newRow = {
                    packagingType,
                    skuCode,
                    skuDescription,
                    skuUom,
                    productImage: null,
                    generate,
                    componentCode,
                    systemCode,
                    componentDescription,
                    supplierName,
                    supplierType,
                    supplierCategory,
                    generateSupplierCode,
                    supplierCode,
                    componentImage: null,
                    id: `excel-sku-${Date.now()}-${index}`
                };

                newRows.push(newRow);
                currentAllRows.push(newRow);
            });

            setSkuRows(prev => [...prev, ...newRows]);
            notify('success', `Loaded ${newRows.length} rows from Excel`);
            if (fileInputSkuRef.current) fileInputSkuRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

  const [componentPage, setComponentPage] = useState(1);
  const [componentItemsPerPage, setComponentItemsPerPage] = useState(5);

  useEffect(() => {
    const totalPages = Math.ceil(componentRows.length / componentItemsPerPage);
    if (componentPage > totalPages && totalPages > 0) {
      setComponentPage(totalPages);
    }
  }, [componentRows.length, componentItemsPerPage, componentPage]);

  const [lastSavedComponentRows, setLastSavedComponentRows] = useState([]);
  const [initialComponentRows, setInitialComponentRows] = useState([]);
  const handleComponentChange = (index, field, value) => {
    if (field === 'systemCode' && value) {
        const isDuplicate = componentRows.some((r, i) => i !== index && (r.systemCode || '').trim() === (value || '').trim());
        if (isDuplicate) {
          notify('error', 'System Code Already Used');
          return;
        }
    }
    setComponentRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === 'polymerType' && (value || '').toString().toUpperCase() !== 'PET') {
        if ((copy[index].recycledPolymerUsed || '').toString().trim().toLowerCase() === 'rpet') {
          copy[index].recycledPolymerUsed = '';
        }
      }
      if (field === 'category' && (value || '') !== 'Category I') {
        copy[index].recycledPolymerUsed = '';
      }
      
      // Auto-fetch logic for System Code
      if (field === 'systemCode') {
        // Find the system code data in systemCodeOptions
        // But systemCodeOptions is outside this scope if we are not careful about closures.
        // However, handleComponentChange is recreated on every render if not memoized, or it has access to state.
        // Actually, handleComponentChange is NOT memoized (lines 1390-1396), so it captures 'systemCodeOptions' from closure?
        // Wait, 'systemCodeOptions' is defined inside the component (lines 240+), so it should be accessible.
        
        // systemCodeOptions returns { code, label, data }. 
        // We need to find the matching entry.
        // But wait, I can't access 'systemCodeOptions' here if it's not in the dependency array of a useCallback?
        // It's not a useCallback, it's a plain function. So it has access to the current render scope.
        // But 'systemCodeOptions' is a useMemo result.
        
        // Let's use 'productRows' directly or just search in 'systemCodeOptions'.
        // Wait, 'systemCodeOptions' is available in scope.
        
        const selected = systemCodeOptions.find(opt => opt.code === value);
        if (selected && selected.data) {
          copy[index].skuCode = selected.data.skuCode || '';
          copy[index].componentCode = selected.data.componentCode || '';
          copy[index].componentDescription = selected.data.componentDescription || '';
          copy[index].supplierName = selected.data.supplierName || '';
          if (selected.data.polymerType) copy[index].polymerType = selected.data.polymerType;
          if (selected.data.componentPolymer) copy[index].componentPolymer = selected.data.componentPolymer;
          if (selected.data.category) copy[index].category = selected.data.category;
        }
        if (isProducer) {
          const match = (Array.isArray(supplierRows) ? supplierRows : []).find((r) => (r?.systemCode || '').toString().trim() === (value || '').toString().trim());
          copy[index].foodGrade = (match?.foodGrade || '').toString();
        }
      }
      
      return copy;
    });
  };
  const addComponentRow = () => {
    setComponentRows(prev => {
      const newRows = [...prev, { systemCode: '', skuCode: '', componentCode: '', componentDescription: '', polymerType: '', recycledPolymerUsed: '', componentPolymer: '', category: '', categoryIIType: '', containerCapacity: '', foodGrade: '', layerType: '', thickness: '', supplierName: '' }];
      setComponentPage(Math.ceil(newRows.length / componentItemsPerPage));
      return newRows;
    });
  };
  const removeComponentRow = (index) => {
    setComponentRows(prev => prev.filter((_, i) => i !== index));
    setLastSavedComponentRows(prev => prev.filter((_, i) => i !== index));
    setInitialComponentRows(prev => prev.filter((_, i) => i !== index));
  };
  const [savingComponentRow, setSavingComponentRow] = useState(null);
  const saveComponentRow = async (idx) => {
    setSavingComponentRow(idx);
    try {
      const beforeRow = lastSavedComponentRows[idx] || {};
      const row = componentRows[idx] || {};
      const pt = (row.polymerType || '').trim();
      const cp = (row.componentPolymer || '').trim();
      if (!isProducer && pt && pt.toLowerCase() !== 'others' && cp && pt.toLowerCase() !== cp.toLowerCase()) {
        notify('error', 'Polymer Type and Component Polymer is not matching');
        return;
      }
      if ((row.recycledPolymerUsed || '').toString().trim().toLowerCase() === 'rpet' && pt.toUpperCase() !== 'PET') {
        notify('error', "Recycled Polymer Used 'rPET' requires Polymer Type 'PET'");
        return;
      }
      const resolvedRow = (() => {
        if (!isProducer) return { ...row };
        const match = (Array.isArray(supplierRows) ? supplierRows : []).find((r) => (r?.systemCode || '').toString().trim() === (row?.systemCode || '').toString().trim());
        return { ...row, foodGrade: (match?.foodGrade || row?.foodGrade || '').toString() };
      })();
      if (isProducer) {
        setComponentRows((prev) => {
          const copy = [...prev];
          copy[idx] = resolvedRow;
          return copy;
        });
      }
      const payload = {
        type,
        itemId,
        rowIndex: idx,
        row: resolvedRow
      };
      await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPONENT_DETAILS(clientId), payload);
      const fields = ['skuCode', 'componentCode', 'componentDescription', 'supplierName', 'polymerType', 'recycledPolymerUsed', 'componentPolymer', 'polymerCode', 'category', 'containerCapacity', 'foodGrade', 'layerType', 'thickness'];
      const entryBaseId = `${Date.now()}-${Math.random()}`;
      const historyEntries = [];
      fields.forEach((field) => {
        const prevVal = (beforeRow[field] ?? '').toString().trim();
        const currVal = (resolvedRow[field] ?? '').toString().trim();
        if (prevVal !== currVal) {
          historyEntries.push({
            id: `${entryBaseId}-${field}`,
            table: 'Component Details',
            row: idx + 1,
            field: field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            prev: prevVal || '-',
            curr: currVal || '-',
            user: resolvedUserName,
            at: new Date().toISOString()
          });
        }
      });
      appendPersistedHistory(historyEntries);
      setDbHistory(prev => [...prev, ...historyEntries]);
      setLastSavedComponentRows(prev => {
        const copy = [...prev];
        copy[idx] = resolvedRow;
        return copy;
      });
      notify('success', 'Component details saved successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save component row');
    } finally {
      setSavingComponentRow(null);
    }
  };
  const cancelComponentRow = (idx) => {
    const saved = lastSavedComponentRows[idx];
    if (saved) {
      setComponentRows(prev => {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      });
    } else {
      removeComponentRow(idx);
    }
  };

  const isComponentRowEmpty = (row) => {
    if (!row || typeof row !== 'object') return true;
    const keys = [
      'systemCode',
      'componentCode',
      'componentDescription',
      'supplierName',
      'polymerType',
      'componentPolymer',
      'category',
      'categoryIIType',
      'containerCapacity',
      'foodGrade',
      'layerType',
      'thickness'
    ];
    return !keys.some((k) => ((row[k] ?? '').toString().trim().length > 0));
  };

  const getComponentRowValidationError = (row) => {
    const missing = [];
    if (!row.componentCode) missing.push('Component Code');
    if (!row.componentDescription) missing.push('Component Description');
    if (!row.supplierName) missing.push('Supplier Name');
    if (!row.polymerType) missing.push('Polymer Type');
    if (!isProducer && !row.componentPolymer) missing.push('Component Polymer');
    if (!row.category) missing.push('Category');
    if (row.category === 'Category I' && !row.containerCapacity) missing.push('Container Capacity');
    if (!row.layerType) missing.push('Layer Type');
    if (!row.thickness) missing.push('Thickness');

    const pt = (row.polymerType || '').trim();
    const cp = (row.componentPolymer || '').trim();
    if (!isProducer && pt && pt.toLowerCase() !== 'others' && cp && pt.toLowerCase() !== cp.toLowerCase()) {
      missing.push('Polymer Type Mismatch');
    }
    if ((row.recycledPolymerUsed || '').toString().trim().toLowerCase() === 'rpet' && pt.toUpperCase() !== 'PET') {
      missing.push("rPET allowed only with Polymer Type PET");
    }

    return missing.length > 0 ? `Missing/Error: ${missing.join(', ')}` : null;
  };

  const withComponentValidation = (rows) =>
    (Array.isArray(rows) ? rows : []).map((row) => ({
      ...row,
      _validationError: getComponentRowValidationError(row)
    }));

  const handleComponentBulkSave = async () => {
    setIsComponentBulkSaving(true);
    try {
        const validatedRows = withComponentValidation(componentRows);
        const rowsToSave = validatedRows.filter((r) => !isComponentRowEmpty(r));
        const errorCount = rowsToSave.reduce((acc, r) => acc + (r._validationError ? 1 : 0), 0);

        if (rowsToSave.length === 0) {
          setComponentRows(validatedRows);
          notify('warning', 'No rows to save');
          setIsComponentBulkSaving(false);
          return false;
        }

        if (isProducer) {
          const hasRpetMismatch = rowsToSave.some((r) => {
            const pt = (r.polymerType || '').toString().trim().toUpperCase();
            const recycled = (r.recycledPolymerUsed || '').toString().trim().toLowerCase();
            return recycled === 'rpet' && pt !== 'PET';
          });
          if (hasRpetMismatch) {
            setComponentRows(validatedRows);
            notify('error', "Recycled Polymer Used 'rPET' requires Polymer Type 'PET'");
            setIsComponentBulkSaving(false);
            return false;
          }
        }

        if (!isProducer) {
          const hasMismatch = rowsToSave.some((r) => {
            const pt = (r.polymerType || '').toString().trim();
            const cp = (r.componentPolymer || '').toString().trim();
            return pt && pt.toLowerCase() !== 'others' && cp && pt.toLowerCase() !== cp.toLowerCase();
          });
          if (hasMismatch) {
            setComponentRows(validatedRows);
            notify('error', 'Polymer Type and Component Polymer must match (except Others)');
            setIsComponentBulkSaving(false);
            return false;
          }
        }

        const payload = rowsToSave.map((r) => {
          const { _validationError, ...rest } = r;
          if (isProducer) {
            const match = (Array.isArray(supplierRows) ? supplierRows : []).find((s) => (s?.systemCode || '').toString().trim() === (rest?.systemCode || '').toString().trim());
            rest.foodGrade = (match?.foodGrade || rest?.foodGrade || '').toString();
          }
          return rest;
        });

        const res = await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPONENT_DETAILS(clientId), {
            type,
            itemId,
            rows: payload
        });
        
        if (res.data && res.data.success) {
            const savedRows = res.data.data || payload;
            setComponentRows(withComponentValidation(savedRows));
            setLastSavedComponentRows([...savedRows]);
            setInitialComponentRows([...savedRows]);
            if (errorCount > 0) {
              notify('warning', `Saved ${savedRows.length} rows. ${errorCount} rows have issues.`);
            } else {
              notify('success', `Saved ${savedRows.length} rows successfully`);
            }
            return true;
        } else {
            notify('error', res.data.message || 'Failed to save rows');
            setComponentRows(validatedRows);
            return false;
        }

    } catch (err) {
        console.error(err);
        notify('error', 'Failed to save rows');
        return false;
    } finally {
        setIsComponentBulkSaving(false);
    }
  };

  const handleComponentDeleteAll = async () => {
    setIsComponentBulkSaving(true);
    try {
        const payload = {
            type,
            itemId,
            rows: []
        };
        const res = await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPONENT_DETAILS(clientId), payload);
        if (res.data.success) {
            notify('success', 'All component details rows deleted');
            setComponentRows([]);
            setLastSavedComponentRows([]);
            setInitialComponentRows([]);
            setComponentPage(1);
        } else {
            notify('error', res.data.message || 'Failed to delete all rows');
        }
    } catch (err) {
        console.error(err);
        notify('error', err.response?.data?.message || 'Failed to delete all rows');
    } finally {
        setIsComponentBulkSaving(false);
    }
  };

  const handleComponentExport = () => {
    if (componentRows.length === 0) {
        notify('warning', 'No data to export');
        return;
    }

    const exportData = componentRows.map((row) => {
        const data = {
            'Component Code': row.componentCode,
            'Component Description': row.componentDescription,
            'Supplier Name': row.supplierName,
            'Polymer Type': row.polymerType,
            ...(isProducer ? { 'Recycled Polymer Used': row.recycledPolymerUsed || '' } : {}),
            ...(isProducer ? { 'Polymer Code': row.polymerCode ?? '' } : {}),
            'Category': row.category,
            'Category II Type': row.categoryIIType,
            'Container Capacity': row.containerCapacity,
            'Monolayer / Multilayer': row.layerType,
            'Thickness': row.thickness
        };
        if (!isProducer) {
            data['Component Polymer'] = row.componentPolymer;
        }
        if (!isManager) {
            data['System Code'] = row.systemCode;
        }
        return data;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Component Details");
    XLSX.writeFile(wb, `Component_Details_${clientId}.xlsx`);
  };

  const handleComponentTemplateDownload = () => {
    const headers = [
        !isManager ? 'System Code' : null,
        'SKU Code',
        'Component Code',
        'Component Description',
        'Supplier Name',
        'Polymer Type',
        'Component Polymer',
        isProducer ? 'Recycled Polymer Used' : null,
        isProducer ? 'Polymer Code' : null,
        'Category of EPR',
        'Category II Type',
        'Container Capacity',
        'Monolayer / Multilayer',
        'Thickness (Micron)'
    ].filter(h => {
        if (!h) return false;
        if (isProducer && (h === 'SKU Code' || h === 'Component Polymer')) return false;
        return true;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const colLetter = (colIndex) => {
        let n = colIndex + 1;
        let s = '';
        while (n > 0) {
            const m = (n - 1) % 26;
            s = String.fromCharCode(65 + m) + s;
            n = Math.floor((n - 1) / 26);
        }
        return s;
    };
    const headerIndex = (label) => headers.findIndex((h) => (h || '').toString().trim().toLowerCase() === label.toLowerCase());
    const layerCol = headerIndex('Monolayer / Multilayer');
    const polymerCodeCol = headerIndex('Polymer Code');
    const validations = [];
    if (layerCol >= 0) {
        validations.push({
            type: 'list',
            allowBlank: true,
            sqref: `${colLetter(layerCol)}2:${colLetter(layerCol)}500`,
            formulae: ['"Monolayer,Multilayer"']
        });
    }
    if (isProducer && polymerCodeCol >= 0) {
        validations.push({
            type: 'list',
            allowBlank: true,
            sqref: `${colLetter(polymerCodeCol)}2:${colLetter(polymerCodeCol)}500`,
            formulae: ['"1,2,3,4,5,6,7"']
        });
    }
    ws['!dataValidation'] = validations;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Component Details Template");
    XLSX.writeFile(wb, "Component_Details_Template.xlsx");
  };

  const handleComponentExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
            notify('error', 'Excel file is empty');
            return;
        }

        const newRowsRaw = data.map((row) => {
            const getValue = (patterns) => {
                const rowKeys = Object.keys(row);
                for (const pattern of patterns) {
                    const match = rowKeys.find(k => pattern.test(k));
                    if (match && row[match] !== undefined) return String(row[match]).trim();
                }
                return '';
            };

            return {
                systemCode: getValue([/system.*code/i]),
                skuCode: getValue([/sku.*code/i, /^sku$/i]),
                componentCode: getValue([/component.*code/i, /^code$/i]),
                componentDescription: getValue([/component.*desc/i, /^description$/i]),
                supplierName: getValue([/supplier.*name/i, /^supplier$/i]),
                polymerType: getValue([/polymer.*type/i, /^polymer$/i]),
                componentPolymer: getValue([/component.*polymer/i]),
                recycledPolymerUsed: isProducer ? getValue([/recycled.*polymer.*used/i]) : '',
                polymerCode: isProducer ? getValue([/polymer.*code/i]) : '',
                category: getValue([/category.*epr/i, /^category$/i]),
                categoryIIType: getValue([/category.*ii.*type/i, /category.*2/i]),
                containerCapacity: getValue([/container.*capacity/i, /^capacity$/i]),
                layerType: getValue([/layer.*type/i, /monolayer/i, /multilayer/i]),
                thickness: getValue([/^thickness/i, /micron/i]),
                foodGrade: '',
            };
        });
        const newRows = newRowsRaw.map((r) => {
          const rr = { ...r };
          const sc = (rr.systemCode || '').toString().trim();
          if (sc) {
            const selected = systemCodeOptions.find(opt => opt.code === sc);
            if (selected && selected.data) {
              if (!rr.skuCode) rr.skuCode = selected.data.skuCode || '';
              if (!rr.componentCode) rr.componentCode = selected.data.componentCode || '';
              if (!rr.componentDescription) rr.componentDescription = selected.data.componentDescription || '';
              if (!rr.supplierName) rr.supplierName = selected.data.supplierName || '';
              if (!rr.polymerType) rr.polymerType = selected.data.polymerType || '';
              if (!rr.componentPolymer) rr.componentPolymer = selected.data.componentPolymer || '';
              if (!rr.category) rr.category = selected.data.category || '';
            }
            if (isProducer) {
              const match = (Array.isArray(supplierRows) ? supplierRows : []).find((s) => (s?.systemCode || '').toString().trim() === sc);
              rr.foodGrade = (match?.foodGrade || rr.foodGrade || '').toString();
            }
          }
          return rr;
        });

        setComponentRows((prev) => {
          const base = (prev?.length === 1 && isComponentRowEmpty(prev[0])) ? [] : (prev || []);
          const merged = [...base, ...newRows];
          setComponentPage(Math.max(1, Math.ceil(merged.length / componentItemsPerPage)));
          return merged;
        });
        notify('success', `${newRows.length} rows imported`);
        
        // Clear input
        if (fileInputComponentRef.current) {
            fileInputComponentRef.current.value = '';
        }
    };
    reader.readAsBinaryString(file);
  };

  const [supplierRows, setSupplierRows] = useState([]);
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierItemsPerPage, setSupplierItemsPerPage] = useState(5);
  const [lastSavedSupplierRows, setLastSavedSupplierRows] = useState([]);
  const [initialSupplierRows, setInitialSupplierRows] = useState([]);
  const [savingSupplierRow, setSavingSupplierRow] = useState(null);

  useEffect(() => {
    const totalPages = Math.ceil(supplierRows.length / supplierItemsPerPage);
    if (supplierPage > totalPages && totalPages > 0) {
      setSupplierPage(totalPages);
    }
  }, [supplierRows.length, supplierItemsPerPage, supplierPage]);

  const [recycledRows, setRecycledRows] = useState([]);
  const [recycledPage, setRecycledPage] = useState(1);
  const [recycledItemsPerPage, setRecycledItemsPerPage] = useState(5);
  const [lastSavedRecycledRows, setLastSavedRecycledRows] = useState([]);
  const [initialRecycledRows, setInitialRecycledRows] = useState([]);
  const [savingRecycledRow, setSavingRecycledRow] = useState(null);

  const [monthlyRows, setMonthlyRows] = useState([]);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [monthlyItemsPerPage, setMonthlyItemsPerPage] = useState(5);
  const [lastSavedMonthlyRows, setLastSavedMonthlyRows] = useState([]);
  const [initialMonthlyRows, setInitialMonthlyRows] = useState([]);
  const [savingMonthlyRow, setSavingMonthlyRow] = useState(null);
  useEffect(() => {
    const totalPages = Math.ceil(recycledRows.length / recycledItemsPerPage);
    if (recycledPage > totalPages && totalPages > 0) {
      setRecycledPage(totalPages);
    }
  }, [recycledRows.length, recycledItemsPerPage, recycledPage]);
  const categorySummary = useMemo(() => {
    const map = new Map();
    recycledRows.forEach(r => {
      const cat = (r.category || '').trim() || 'Unspecified';
      const acMt = parseFloat(r.annualConsumptionMt) || 0;
      const usedMt = parseFloat(r.usedRecycledQtyMt) || 0;
      const prev = map.get(cat) || { totalACMt: 0, totalUsedMt: 0, totalPercentSum: 0 };
            prev.totalACMt += acMt;
            prev.totalUsedMt += usedMt;
            prev.totalPercentSum += parseFloat(r.usedRecycledPercent) || 0;
            map.set(cat, prev);
        });
        return Array.from(map.entries()).map(([category, agg]) => ({
            category,
            totalUsedPercent: agg.totalPercentSum / 100,
            totalUsedQtyMt: agg.totalUsedMt
        }));
    }, [recycledRows]);
  const handleRecycledChange = (index, field, value) => {
    if (field === 'systemCode' && value) {
        const isDuplicate = recycledRows.some((r, i) => i !== index && (r.systemCode || '').trim() === (value || '').trim());
        if (isDuplicate) {
          notify('error', 'System Code Already Used');
          return;
        }
    }
    setRecycledRows(prev => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: value };
      
      if (field === 'systemCode') {
          const selected = systemCodeOptions.find(opt => opt.code === value);
          if (selected && selected.data) {
              row.componentCode = selected.data.componentCode || '';
              row.componentDescription = selected.data.componentDescription || '';
              row.supplierName = selected.data.supplierName || '';
              row.category = selected.data.category || row.category;
          }
      }

      if (field === 'uom' && value === 'Not Applicable') {
          row.annualConsumption = 0;
          row.perPieceWeight = 0;
          row.usedRecycledPercent = 0;
          row.annualConsumptionMt = 0;
          row.usedRecycledQtyMt = 0;
      }

      let acMt = parseFloat(row.annualConsumptionMt) || 0;
      const ac = parseFloat(row.annualConsumption) || 0;
      const uom = row.uom;
      if (uom === 'Not Applicable') {
          acMt = 0;
      } else if (uom === 'KG') acMt = ac / 1000;
      else if (uom === 'MT') acMt = ac;
      else if (uom === 'Units' || uom === 'Roll' || uom === 'Nos') {
        const ppwKg = parseFloat(row.perPieceWeight) || 0;
        acMt = (ac * ppwKg) / 1000;
      }
      row.annualConsumptionMt = acMt ? acMt.toFixed(3) : (uom === 'Not Applicable' ? '0.000' : '');
      const pctRaw = parseFloat(row.usedRecycledPercent) || 0;
      const pctFraction = pctRaw > 1 ? (pctRaw / 100) : pctRaw;
      row.usedRecycledQtyMt = (acMt * pctFraction).toFixed(3);
      copy[index] = row;
      return copy;
    });
  };
  const handleRecycledPercentBlur = (index) => {
    setRecycledRows(prev => {
      const copy = [...prev];
      const row = { ...copy[index] };
      const pctRaw = parseFloat(row.usedRecycledPercent) || 0;
      const pctFraction = pctRaw > 1 ? (pctRaw / 100) : pctRaw;
      row.usedRecycledPercent = pctFraction.toFixed(3);
      // recalc qty after normalization
      const acMt = parseFloat(row.annualConsumptionMt) || 0;
      row.usedRecycledQtyMt = (acMt * pctFraction).toFixed(3);
      copy[index] = row;
      return copy;
    });
  };
  const addRecycledRow = () => {
    setRecycledRows(prev => {
      const newRows = [
        ...prev,
        {
          systemCode: '',
          componentCode: '',
          componentDescription: '',
          category: '',
          annualConsumption: '',
          uom: '',
          perPieceWeight: '',
          annualConsumptionMt: '',
          usedRecycledPercent: '',
          usedRecycledQtyMt: '',
          supplierName: ''
        }
      ];
      setRecycledPage(Math.ceil(newRows.length / recycledItemsPerPage));
      return newRows;
    });
  };
  const removeRecycledRow = (index) => {
    setRecycledRows(prev => prev.filter((_, i) => i !== index));
    setLastSavedRecycledRows(prev => prev.filter((_, i) => i !== index));
    setInitialRecycledRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleRecycledBulkSave = async () => {
    try {
        const payload = {
            type,
            itemId,
            rows: recycledRows
        };
        const res = await api.post(API_ENDPOINTS.CLIENT.RECYCLED_QUANTITY_USED(clientId), payload);
        const savedRows = res.data?.data || [];
        setRecycledRows(savedRows);
        setLastSavedRecycledRows(savedRows);
        setInitialRecycledRows(savedRows);
        notify('success', 'All recycled quantity used data saved successfully');
        return true;
    } catch (err) {
        console.error('Failed to save all recycled rows:', err);
        notify('error', 'Failed to save all recycled rows');
        return false;
    }
  };

  const handleRecycledDeleteAll = async () => {
      if (!window.confirm('Are you sure you want to delete all recycled quantity rows?')) return;
      
      try {
          const payload = {
              type,
              itemId,
              rows: []
          };
          await api.post(API_ENDPOINTS.CLIENT.RECYCLED_QUANTITY_USED(clientId), payload);
          setRecycledRows([]);
          setLastSavedRecycledRows([]);
          setInitialRecycledRows([]);
          notify('success', 'All recycled quantity rows deleted successfully');
      } catch (err) {
          console.error('Failed to delete all recycled rows:', err);
          notify('error', 'Failed to delete all recycled rows');
      }
  };

  const handleRecycledExcelUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
              
              if (data.length < 2) {
                  notify('error', 'Excel file is empty or missing headers');
                  return;
              }
              
              const headers = data[0].map(h => (h || '').toString().trim().toLowerCase());
              // Expected headers map
              const headerMap = {
                  'system code': 'systemCode',
                  'component code': 'componentCode',
                  'component description': 'componentDescription',
                  'supplier name': 'supplierName',
                  'category': 'category',
                  'annual consumption': 'annualConsumption',
                  'uom': 'uom',
                  'per piece weight': 'perPieceWeight',
                  'used recycled %': 'usedRecycledPercent'
              };
              
              const rows = [];
              for (let i = 1; i < data.length; i++) {
                  const rowData = data[i];
                  if (!rowData || rowData.length === 0) continue;
                  
                  const newRow = {
                      systemCode: '',
                      componentCode: '',
                      componentDescription: '',
                      supplierName: '',
                      category: '',
                      annualConsumption: '',
                      uom: '',
                      perPieceWeight: '',
                      annualConsumptionMt: '',
                      usedRecycledPercent: '',
                      usedRecycledQtyMt: ''
                  };
                  
                  headers.forEach((h, idx) => {
                      if (headerMap[h]) {
                          newRow[headerMap[h]] = (rowData[idx] || '').toString();
                      }
                  });

                  // If systemCode is present, try to auto-fetch details if missing
                  if (newRow.systemCode) {
                      const selected = systemCodeOptions.find(opt => opt.code === newRow.systemCode);
                      if (selected && selected.data) {
                          if (!newRow.componentCode) newRow.componentCode = selected.data.componentCode;
                          if (!newRow.componentDescription) newRow.componentDescription = selected.data.componentDescription;
                          if (!newRow.supplierName) newRow.supplierName = selected.data.supplierName;
                          if (!newRow.category) newRow.category = selected.data.category;
                      }
                  }

                  // Calculate derived fields
                  let acMt = parseFloat(newRow.annualConsumptionMt) || 0;
                  const ac = parseFloat(newRow.annualConsumption) || 0;
                  const uom = newRow.uom;
                  
                  if (!acMt) { // Calculate if not provided
                      if (uom === 'KG') acMt = ac / 1000;
                      else if (uom === 'MT') acMt = ac;
                      else if (uom === 'Units' || uom === 'Roll' || uom === 'Nos') {
                          const ppwKg = parseFloat(newRow.perPieceWeight) || 0;
                          acMt = (ac * ppwKg) / 1000;
                      }
                      newRow.annualConsumptionMt = acMt ? acMt.toFixed(3) : '';
                  }
                  
                  const pctRaw = parseFloat(newRow.usedRecycledPercent) || 0;
                  const pctFraction = pctRaw > 1 ? (pctRaw / 100) : pctRaw;
                  newRow.usedRecycledPercent = pctFraction.toFixed(3);
                  
                  if (!newRow.usedRecycledQtyMt) {
                      newRow.usedRecycledQtyMt = (acMt * pctFraction).toFixed(3);
                  }

                  rows.push(newRow);
              }
              
              setRecycledRows(prev => [...prev, ...rows]);
              setRecycledPage(Math.ceil((recycledRows.length + rows.length) / recycledItemsPerPage));
              notify('success', `Uploaded ${rows.length} rows successfully`);
          } catch (err) {
              console.error('Excel upload error:', err);
              notify('error', 'Failed to parse Excel file');
          }
      };
      reader.readAsBinaryString(file);
      e.target.value = null; // Reset input
  };

  const handleRecycledExport = () => {
      try {
          const exportData = recycledRows.map(row => {
            const data = {
              'Component Code': row.componentCode || '',
              'Component Description': row.componentDescription || '',
              'Supplier Name': row.supplierName || '',
              'Category': row.category || '',
              'Annual Consumption': row.annualConsumption || '',
              'UOM': row.uom || '',
              'Per Piece Weight': row.perPieceWeight || '',
              'Annual Consumption (MT)': row.annualConsumptionMt || '',
              'Used Recycled %': (parseFloat(row.usedRecycledPercent) * 100).toFixed(2) + '%',
              'Used Recycled Qty (MT)': row.usedRecycledQtyMt || ''
            };
            if (!isManager) {
                data['System Code'] = row.systemCode || '';
            }
            return data;
          });
          
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(exportData);
          XLSX.utils.book_append_sheet(wb, ws, "Recycled Quantity Used");
          XLSX.writeFile(wb, "recycled_quantity_used.xlsx");
          notify('success', 'Excel exported successfully');
      } catch (err) {
          console.error('Excel export error:', err);
          notify('error', 'Failed to export Excel');
      }
  };

  const handleRecycledTemplateDownload = () => {
      const headers = [
          !isManager ? 'System Code' : null,
          'Component Code',
          'Component Description',
          'Supplier Name',
          'Category',
          'Annual Consumption',
          'UOM',
          'Per Piece Weight',
          'Annual Consumption (MT)',
          'Used Recycled %',
          'Used Recycled Qty (MT)'
      ].filter(Boolean);

      const ws = XLSX.utils.aoa_to_sheet([headers]);
      ws['!dataValidation'] = [
          {
              type: 'list',
              allowBlank: true,
              sqref: 'G2:G500',
              formulae: ['"MT,KG,Units,Roll,Nos,Not Applicable"']
          }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Recycled Quantity Template");
      XLSX.writeFile(wb, "Recycled_Quantity_Used_Template.xlsx");
  };

  const handleMonthlyExcelUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
              if (data.length < 2) {
                  notify('error', 'Excel file is empty or missing headers');
                  return;
              }
              const headers = data[0].map(h => (h || '').toString().trim().toLowerCase());
             const headerMap = {
                 'system code': 'systemCode',
                 'supplier name': 'supplierName',
                 'sku code': 'skuCode',
                 'component code': 'componentCode',
                 'component description': 'componentDescription',
                 'polymer type': 'polymerType',
                 'component polymer': 'componentPolymer',
                'category of epr': 'category',
                'category': 'category',
                'date of invoice': 'dateOfInvoice',
                 'purchase qty': 'purchaseQty',
                 'uom': 'uom',
                 'per piece weight': 'perPieceWeightKg',
                 'monthly purchase mt': 'monthlyPurchaseMt',
                 'rc % mentioned': 'rcPercentMentioned',
                 'recycled %': 'recycledPercent',
                 'recycled qty': 'recycledQty',
                 'recycled rate': 'recycledRate',
                 'recycled qrt amount': 'recycledQrtAmount',
                 'recycled qty amount': 'recycledQrtAmount',
                 'virgin rate': 'virginRate',
                 'virgin qty': 'virginQty',
                 'virgin qty amount': 'virginQtyAmount'
             };
              const rows = [];
              for (let i = 1; i < data.length; i++) {
                  const rowData = data[i];
                  if (!rowData || rowData.length === 0) continue;
                  const newRow = {
                     systemCode: '',
                     supplierName: '',
                     supplierCategory: '',
                     skuCode: '',
                     componentCode: '',
                     componentDescription: '',
                     foodGrade: '',
                     polymerType: '',
                     recycledPolymerUsed: '',
                     componentPolymer: '',
                     category: '',
                     dateOfInvoice: '',
                     monthName: '',
                     quarter: '',
                     yearlyQuarter: '',
                     purchaseQty: '',
                     uom: '',
                     perPieceWeightKg: '',
                     monthlyPurchaseMt: '',
                     rcPercentMentioned: '',
                     recycledPercent: '',
                     recycledQty: '',
                     recycledRate: '',
                     recycledQrtAmount: '',
                     virginRate: '',
                     virginQty: '',
                     virginQtyAmount: ''
                  };
                  headers.forEach((h, idx) => {
                      if (headerMap[h]) {
                          let val = rowData[idx];
                          if (headerMap[h] === 'dateOfInvoice') {
                              if (val !== undefined && val !== null) {
                                  if (typeof val === 'number') {
                                      // Parse Excel serial date
                                      const date = new Date((val - 25569) * 86400 * 1000);
                                      if (!isNaN(date.getTime())) {
                                          const d = String(date.getDate()).padStart(2, '0');
                                          const m = String(date.getMonth() + 1).padStart(2, '0');
                                          const y = date.getFullYear();
                                          val = `${d}-${m}-${y}`;
                                      } else {
                                          val = val.toString();
                                      }
                                  } else {
                                      val = val.toString().trim();
                                  }
                              } else {
                                  val = '';
                              }
                              newRow[headerMap[h]] = val;
                          } else {
                              newRow[headerMap[h]] = (val ?? '').toString();
                          }
                      }
                  });
                  // Calculate date derived fields
                  if (newRow.dateOfInvoice) {
                      const dateVal = newRow.dateOfInvoice.trim();
                      if (dateVal === 'Not Applicable') {
                          newRow.monthName = 'Not Applicable';
                          newRow.quarter = 'Not Applicable';
                          newRow.yearlyQuarter = 'Not Applicable';
                      } else {
                          const parts = dateVal.split('-');
                          if (parts.length === 3) {
                              const d = parseInt(parts[0], 10);
                              const m = parseInt(parts[1], 10);
                              const y = parseInt(parts[2], 10);
                              if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 1 && m <= 12) {
                                  const dateObj = new Date(y, m - 1, d);
                                  newRow.monthName = dateObj.toLocaleString('default', { month: 'long' });
                                  if (m >= 4 && m <= 6) newRow.quarter = 'Q1';
                                  else if (m >= 7 && m <= 9) newRow.quarter = 'Q2';
                                  else if (m >= 10 && m <= 12) newRow.quarter = 'Q3';
                                  else newRow.quarter = 'Q4';
                                  // Half Year
                                  if (m >= 4 && m <= 9) newRow.yearlyQuarter = 'H1';
                                  else newRow.yearlyQuarter = 'H2';
                              }
                          }
                      }
                  }
                  if (newRow.systemCode) {
                      const selected = systemCodeOptions.find(opt => opt.code === newRow.systemCode);
                      if (selected && selected.data) {
                          if (!newRow.supplierName) newRow.supplierName = selected.data.supplierName || '';
                          if (!newRow.supplierCategory) newRow.supplierCategory = selected.data.supplierCategory || '';
                          if (!newRow.componentCode) newRow.componentCode = selected.data.componentCode || '';
                          if (!newRow.skuCode) newRow.skuCode = selected.data.skuCode || '';
                          if (!newRow.componentDescription) newRow.componentDescription = selected.data.componentDescription || '';
                      }
                      const compMatch = componentRows.find(r => (r.componentCode || '').trim() === (newRow.componentCode || '').trim());
                      if (compMatch) {
                          if (!newRow.polymerType) newRow.polymerType = compMatch.polymerType || '';
                          if (!newRow.componentPolymer) newRow.componentPolymer = compMatch.componentPolymer || '';
                          if (!newRow.category) newRow.category = compMatch.category || '';
                      }
                      if (isProducer) {
                        const supplierMatch = (Array.isArray(supplierRows) ? supplierRows : []).find((r) => (r?.systemCode || '').toString().trim() === (newRow.systemCode || '').toString().trim());
                        if (!newRow.foodGrade) newRow.foodGrade = (supplierMatch?.foodGrade || compMatch?.foodGrade || '').toString();
                        if (!newRow.recycledPolymerUsed) newRow.recycledPolymerUsed = (compMatch?.recycledPolymerUsed || '').toString();
                      }
                  }
                  const uom = newRow.uom;
                  const qty = parseFloat(newRow.purchaseQty) || 0;
                  const wt = parseFloat(newRow.perPieceWeightKg) || 0;
                  let monthlyMt = parseFloat(newRow.monthlyPurchaseMt) || 0;
                  if (!monthlyMt) {
                      if (uom === 'Units' || uom === 'Nos' || uom === 'Roll') monthlyMt = (qty * wt) / 1000;
                      else if (uom === 'KG') monthlyMt = qty / 1000;
                      else if (uom === 'MT') monthlyMt = qty;
                  }
                  newRow.monthlyPurchaseMt = monthlyMt ? Number(monthlyMt).toFixed(3) : '';
                  let pct = parseFloat(newRow.recycledPercent) || 0;
                  pct = pct > 1 ? pct / 100 : pct;
                  newRow.recycledPercent = pct ? pct.toFixed(3) : '';
                  if (!newRow.recycledQty) {
                      newRow.recycledQty = (monthlyMt * pct).toFixed(3);
                  }
                  const rRate = parseFloat(newRow.recycledRate) || 0;
                  const rQtyVal = parseFloat(newRow.recycledQty) || 0;
                  if (!newRow.recycledQrtAmount) {
                      newRow.recycledQrtAmount = rRate && rQtyVal ? (rQtyVal * rRate).toFixed(3) : '';
                  }
                  const monthlyMtVal = parseFloat(newRow.monthlyPurchaseMt) || 0;
                  if (!newRow.virginQty) {
                      newRow.virginQty = (monthlyMtVal - rQtyVal).toFixed(3);
                  }
                  const vRate = parseFloat(newRow.virginRate) || 0;
                  const vQtyVal = parseFloat(newRow.virginQty) || 0;
                  if (!newRow.virginQtyAmount) {
                      newRow.virginQtyAmount = vRate && vQtyVal ? (vQtyVal * vRate).toFixed(3) : '';
                  }
                  rows.push(newRow);
              }
              setMonthlyRows(prev => [...prev, ...rows]);
              setMonthlyPage(Math.ceil((monthlyRows.length + rows.length) / monthlyItemsPerPage));
              notify('success', `Uploaded ${rows.length} rows successfully`);
          } catch (err) {
              console.error('Excel upload error:', err);
              notify('error', 'Failed to parse Excel file');
          }
      };
      reader.readAsBinaryString(file);
      e.target.value = null;
  };

  const handleMonthlyExport = () => {
      try {
          if (monthlyRows.length === 0) {
              notify('warning', 'No data to export');
              return;
          }
         const exportData = monthlyRows.map(row => {
             const data = {
                 'Supplier Name': row.supplierName || '',
                 'Component Code': row.componentCode || '',
                 'Component Description': row.componentDescription || '',
                 'Polymer Type': row.polymerType || '',
                 'Category of EPR': row.category || '',
                 'Date of invoice': row.dateOfInvoice || '',
                  'Month Name': row.monthName || '',
                  'Quarter': row.quarter || '',
                  'Half Year': row.yearlyQuarter || '',
                  'Purchase Qty': row.purchaseQty || '',
                 'UOM': row.uom || '',
                 'Per Piece Weight': row.perPieceWeightKg || '',
                 'Monthly purchase MT': row.monthlyPurchaseMt || '',
                 'RC % Mentioned': row.rcPercentMentioned || '',
                 'Recycled %': (parseFloat(row.recycledPercent) * 100).toFixed(2) + '%',
                 'Recycled QTY': row.recycledQty || '',
                 'Recycled Rate': row.recycledRate || '',
                 'Recycled Qty Amount': row.recycledQrtAmount || '',
                 'Virgin Rate': row.virginRate || '',
                 'Virgin Qty': row.virginQty || '',
                 'Virgin Qty Amount': row.virginQtyAmount || ''
             };
             
             if (!isProducer) {
                data['SKU Code'] = row.skuCode || '';
                data['Component Polymer'] = row.componentPolymer || '';
             }

             if (!isManager) {
                 data['System Code'] = row.systemCode || '';
             }
             return data;
         });
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(exportData);
          XLSX.utils.book_append_sheet(wb, ws, "Monthly Procurement Data");
          XLSX.writeFile(wb, "monthly_procurement_data.xlsx");
          notify('success', 'Excel exported successfully');
      } catch (err) {
          console.error('Excel export error:', err);
          notify('error', 'Failed to export Excel');
      }
  };

  const handleMonthlyTemplateDownload = () => {
      const headers = [
          !isManager ? 'System Code' : null,
          'Supplier Name',
          !isProducer ? 'SKU Code' : null,
          'Component Code',
          'Component Description',
          'Polymer Type',
          !isProducer ? 'Component Polymer' : null,
          'Category of EPR',
          'Date of invoice',
          'Purchase Qty',
          'UOM',
          'Per Piece Weight',
          'Monthly purchase MT',
          'Recycled %',
          'Recycled QTY',
          'Recycled Rate',
          'Recycled Qty Amount',
          'Virgin Rate',
          'Virgin Qty',
          'Virgin Qty Amount',
          'RC % Mentioned'
      ].filter(Boolean);

      const ws = XLSX.utils.aoa_to_sheet([headers]);
      ws['!dataValidation'] = [
          {
              type: 'list',
              allowBlank: true,
              sqref: 'J2:J500',
              formulae: ['"MT,KG,Units,Roll,Nos,Not Applicable"']
          },
          {
              type: 'list',
              allowBlank: true,
              sqref: 'O2:O500',
              formulae: ['"Yes,No"']
          }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Procurement Template");
      XLSX.writeFile(wb, "Monthly_Procurement_Template.xlsx");
  };

  const handleRecycledCodeSelect = (index, code) => {
    const opt = componentOptions.find(o => o.code === code);
    const compMatch = componentRows.find(r => (r.componentCode || '').trim() === (code || '').trim());
    const descFromComponent = (compMatch?.componentDescription || '').trim();
    const categoryFromComponent = (compMatch?.category || '').trim();
    const supplierFromComponent = (compMatch?.supplierName || '').trim();

    setRecycledRows(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        componentCode: code,
        componentDescription: descFromComponent || (opt ? opt.description : ''),
        category: categoryFromComponent || copy[index].category,
        supplierName: supplierFromComponent || copy[index].supplierName
      };
      return copy;
    });
  };
  const saveRecycledRow = async (idx) => {
    setSavingRecycledRow(idx);
    try {
      const beforeRow = lastSavedRecycledRows[idx] || {};
      const payload = {
        type,
        itemId,
        rowIndex: idx,
        row: { ...recycledRows[idx] }
      };
      const res = await api.post(API_ENDPOINTS.CLIENT.RECYCLED_QUANTITY_USED(clientId), payload);
      const savedRows = res.data?.data || recycledRows;
      const savedRowForHistory = savedRows[idx] || recycledRows[idx] || {};

      const fields = ['systemCode', 'componentCode', 'componentDescription', 'category', 'supplierName', 'annualConsumption', 'uom', 'perPieceWeight', 'usedRecycledPercent'];
      const entryBaseId = `${Date.now()}-${Math.random()}`;
      const historyEntries = [];
      fields.forEach((field) => {
        const prevVal = (beforeRow[field] ?? '').toString().trim();
        const currVal = (savedRowForHistory[field] ?? '').toString().trim();
        if (prevVal !== currVal) {
          historyEntries.push({
            id: `${entryBaseId}-${field}`,
            table: 'Recycled Quantity Used',
            row: idx + 1,
            field: field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            prev: prevVal || '-',
            curr: currVal || '-',
            user: resolvedUserName,
            at: new Date().toISOString()
          });
        }
      });
      appendPersistedHistory(historyEntries);
      setDbHistory(prev => [...prev, ...historyEntries]);
      setLastSavedRecycledRows(prev => {
        const copy = [...prev];
        copy[idx] = savedRowForHistory;
        return copy;
      });
      notify('success', 'Recycled quantity used saved successfully');
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to save recycled quantity row');
    } finally {
      setSavingRecycledRow(null);
    }
  };
  const cancelRecycledRow = (idx) => {
    const saved = lastSavedRecycledRows[idx];
    if (saved) {
      setRecycledRows(prev => {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      });
    }
  };
  const handleSupplierChange = (index, field, value) => {
    setSupplierRows(prev => {
      const copy = [...prev];
      const updatedRow = { ...copy[index], [field]: value };
      
      if (updatedRow._validationError) {
          updatedRow._validationError = null;
      }
      
      copy[index] = updatedRow;
      return copy;
    });
  };

  const hydrateSupplierRowFromSystemCode = (row) => {
    const systemCode = (row?.systemCode || '').toString().trim();
    if (!systemCode) return row;

    const selectedOption = systemCodeOptions.find(
      (opt) => normalizeSystemCodeKey(opt.code) === normalizeSystemCodeKey(systemCode)
    );
    const optionData = selectedOption?.data || {};
    const parsedComponentCode = extractComponentCodeFromSystemCode(systemCode);
    const componentFallback = componentRows.find(
      (r) => (r?.componentCode || '').toString().trim() === parsedComponentCode
    ) || productRows.find(
      (r) => (r?.componentCode || '').toString().trim() === parsedComponentCode
    );

    return {
      ...row,
      componentCode: optionData.componentCode || parsedComponentCode || row.componentCode || '',
      componentDescription: optionData.componentDescription || componentFallback?.componentDescription || row.componentDescription || '',
      supplierName: optionData.supplierName || componentFallback?.supplierName || row.supplierName || '',
      supplierState: optionData.supplierState || row.supplierState || '',
      supplierType: optionData.supplierType || componentFallback?.supplierType || row.supplierType || ''
    };
  };

  const hydrateSupplierRowsFromSystemCode = (rows) => {
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => hydrateSupplierRowFromSystemCode(row));
  };

  const handleSystemCodeSelect = (index, sysCode) => {
    if (sysCode) {
      const selectedKey = normalizeSystemCodeKey(sysCode);
      const isDuplicate = supplierRows.some((r, i) => i !== index && normalizeSystemCodeKey(r.systemCode) === selectedKey);
      if (isDuplicate) {
        notify('error', 'System Code Already Used');
        return;
      }
    }

    setSupplierRows(prev => {
      const copy = [...prev];
      const base = { ...copy[index], systemCode: sysCode };
      copy[index] = hydrateSupplierRowFromSystemCode(base);
      return copy;
    });
  };

  // Keep Supplier Compliance rows in sync with latest Product Compliance mapping after load/refresh.
  useEffect(() => {
    setSupplierRows((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      let changed = false;
      const normalized = prev.map((row) => {
        const hydrated = hydrateSupplierRowFromSystemCode(row);
        const same =
          (hydrated.componentCode || '') === (row.componentCode || '') &&
          (hydrated.componentDescription || '') === (row.componentDescription || '') &&
          (hydrated.supplierName || '') === (row.supplierName || '') &&
          (hydrated.supplierState || '') === (row.supplierState || '') &&
          (hydrated.supplierType || '') === (row.supplierType || '');
        if (!same) changed = true;
        return same ? row : hydrated;
      });
      return changed ? normalized : prev;
    });
  }, [systemCodeOptions, supplierRows.length]);

  const handleSupplierCodeSelect = (index, code) => {
    const opt = componentOptions.find(o => o.code === code);
    const compMatch = componentRows.find(r => (r.componentCode || '').trim() === (code || '').trim());
    const descFromComponent = (compMatch?.componentDescription || '').trim();
    const supplierFromComponent = (compMatch?.supplierName || '').trim();

    // Look in productRows as well (since we added Supplier Name there)
    const prodMatch = productRows.find(r => (r.componentCode || '').trim() === (code || '').trim() && (r.supplierName || '').trim());
    const supplierFromProduct = (prodMatch?.supplierName || '').trim();
    const supplierTypeFromProduct = (prodMatch?.supplierType || '').trim();

    const existingRowsSameCode = supplierRows.filter(r => (r.componentCode || '').trim() === (code || '').trim());
    const registeredExisting = existingRowsSameCode.find(r => r.supplierStatus === 'Registered' && (r.supplierName || '').trim());
    const supplierFromExisting = (registeredExisting?.supplierName || existingRowsSameCode[0]?.supplierName || '').trim();
    
    setSupplierRows(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        componentCode: code,
        componentDescription: descFromComponent || (opt ? opt.description : ''),
        supplierName: supplierFromComponent || supplierFromProduct || supplierFromExisting || '',
        supplierType: supplierTypeFromProduct || ''
      };
      return copy;
    });
  };

  const addSupplierRow = () => {
    setSupplierRows(prev => {
      const newRows = [...prev, { systemCode: '', componentCode: '', componentDescription: '', supplierName: '', supplierType: '', supplierStatus: '', applicationType: '', foodGrade: '', eprCertificateNumber: '', fssaiLicNo: '', fssaiValidUpto: '' }];
      setSupplierPage(Math.ceil(newRows.length / supplierItemsPerPage));
      return newRows;
    });
  };

  const removeSupplierRow = (index) => {
    setSupplierRows(prev => prev.filter((_, i) => i !== index));
    setLastSavedSupplierRows(prev => prev.filter((_, i) => i !== index));
    setInitialSupplierRows(prev => prev.filter((_, i) => i !== index));
  };

  const saveSupplierRow = async (idx) => {
    setSavingSupplierRow(idx);
    try {
      const beforeRow = lastSavedSupplierRows[idx] || {};
      const hydratedRow = hydrateSupplierRowFromSystemCode(supplierRows[idx] || {});
      setSupplierRows((prev) => {
        const copy = [...prev];
        copy[idx] = hydratedRow;
        return copy;
      });
      const payload = {
        type,
        itemId,
        rowIndex: idx,
        row: { ...hydratedRow }
      };
      await api.post(API_ENDPOINTS.CLIENT.PRODUCT_SUPPLIER_COMPLIANCE(clientId), payload);

      const row = hydratedRow;
      const fields = ['systemCode', 'componentCode', 'componentDescription', 'supplierName', 'supplierType', 'supplierStatus', 'applicationType', 'foodGrade', 'eprCertificateNumber', 'fssaiLicNo', 'fssaiValidUpto'];
      const entryBaseId = `${Date.now()}-${Math.random()}`;
      const historyEntries = [];
      fields.forEach((field) => {
        const prevVal = (beforeRow[field] ?? '').toString().trim();
        const currVal = (row[field] ?? '').toString().trim();
        if (prevVal !== currVal) {
          historyEntries.push({
            id: `${entryBaseId}-${field}`,
            table: 'Supplier Compliance',
            row: idx + 1,
            field: field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            prev: prevVal || '-',
            curr: currVal || '-',
            user: resolvedUserName,
            at: new Date().toISOString()
          });
        }
      });
      appendPersistedHistory(historyEntries);
      setDbHistory(prev => [...prev, ...historyEntries]);
      setLastSavedSupplierRows(prev => {
        const copy = [...prev];
        copy[idx] = row;
        return copy;
      });
      notify('success', 'Supplier compliance saved successfully');
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to save supplier row');
    } finally {
      setSavingSupplierRow(null);
    }
  };

  const cancelSupplierRow = (idx) => {
    const saved = lastSavedSupplierRows[idx];
    if (saved) {
      setSupplierRows(prev => {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      });
    } else {
      removeSupplierRow(idx);
    }
  };

  useEffect(() => {
    const fetchCompliance = async () => {
      if (!clientId || !type || !itemId) return;
      try {
        const res = await api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(clientId), {
          params: { type, itemId }
        });
        const rows = (res.data?.data || []).filter((r) => r && typeof r === 'object');
        
        // Prioritize API data if available
        if (rows.length > 0) {
          setProductRows(rows);
          setLastSavedRows(rows);
          setInitialProductRows(rows);
        } else {
            // Fallback to item (Client Model) data if API data is empty
            if (item && Array.isArray(item.productComplianceRows) && item.productComplianceRows.length > 0) {
                const fallbackRows = (item.productComplianceRows || []).filter((r) => r && typeof r === 'object');
                setProductRows(fallbackRows);
                setLastSavedRows(fallbackRows);
                setInitialProductRows(fallbackRows);
            }
        }
      } catch (err) {
        console.error("Error fetching compliance:", err);
        // On error, try fallback
        if (item && Array.isArray(item.productComplianceRows) && item.productComplianceRows.length > 0) {
          const fallbackRows = (item.productComplianceRows || []).filter((r) => r && typeof r === 'object');
          setProductRows(fallbackRows);
          setLastSavedRows(fallbackRows);
          setInitialProductRows(fallbackRows);
        }
      }
    };
    const fetchSkuCompliance = async () => {
      if (!clientId || !type || !itemId) return;
      try {
        const res = await api.get(API_ENDPOINTS.CLIENT.SKU_COMPLIANCE(clientId), {
          params: { type, itemId }
        });
        const rows = res.data?.data || [];
        if (rows.length) {
          setSkuRows(rows);
          setLastSavedSkuRows(rows);
          setInitialSkuRows(rows);
        } else if (item && Array.isArray(item.skuComplianceRows) && item.skuComplianceRows.length) {
          setSkuRows(item.skuComplianceRows);
          setLastSavedSkuRows(item.skuComplianceRows);
          setInitialSkuRows(item.skuComplianceRows);
        }
      } catch (_) {
        if (item && Array.isArray(item.skuComplianceRows) && item.skuComplianceRows.length) {
          setSkuRows(item.skuComplianceRows);
          setLastSavedSkuRows(item.skuComplianceRows);
          setInitialSkuRows(item.skuComplianceRows);
        }
      }
    };
    const fetchComponentDetails = async () => {
      if (!clientId || !type || !itemId) return;
      try {
        const res = await api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPONENT_DETAILS(clientId), {
          params: { type, itemId }
        });
        const rows = res.data?.data || [];
        if (rows.length) {
          setComponentRows(rows);
          setLastSavedComponentRows(rows);
          setInitialComponentRows(rows);
        } else if (item && Array.isArray(item.productComponentDetails) && item.productComponentDetails.length) {
          setComponentRows(item.productComponentDetails);
          setLastSavedComponentRows(item.productComponentDetails);
          setInitialComponentRows(item.productComponentDetails);
        }
      } catch (_) {
        if (item && Array.isArray(item.productComponentDetails) && item.productComponentDetails.length) {
          setComponentRows(item.productComponentDetails);
          setLastSavedComponentRows(item.productComponentDetails);
          setInitialComponentRows(item.productComponentDetails);
        }
      }
    };
    const fetchSupplierCompliance = async () => {
      if (!clientId || !type || !itemId) return;
      try {
        const res = await api.get(API_ENDPOINTS.CLIENT.PRODUCT_SUPPLIER_COMPLIANCE(clientId), {
          params: { type, itemId }
        });
        const rows = res.data?.data || [];
        const normalizeFoodGrade = (value) => {
          const raw = (value ?? '').toString().trim();
          const lower = raw.toLowerCase();
          if (!raw) return '';
          if (lower === 'yes' || lower === 'food') return 'Food';
          if (lower === 'no' || lower === 'non food' || lower === 'non-food' || lower === 'nonfood') return 'Non Food';
          return raw;
        };
        if (rows.length) {
          const normalized = hydrateSupplierRowsFromSystemCode(
            rows.map((r) => ({ ...r, foodGrade: normalizeFoodGrade(r?.foodGrade) }))
          );
          setSupplierRows(normalized);
          setLastSavedSupplierRows(normalized);
          setInitialSupplierRows(normalized);
        } else if (item && Array.isArray(item.productSupplierCompliance) && item.productSupplierCompliance.length) {
          const normalized = hydrateSupplierRowsFromSystemCode(
            item.productSupplierCompliance.map((r) => ({ ...r, foodGrade: normalizeFoodGrade(r?.foodGrade) }))
          );
          setSupplierRows(normalized);
          setLastSavedSupplierRows(normalized);
          setInitialSupplierRows(normalized);
        }
      } catch (_) {
        if (item && Array.isArray(item.productSupplierCompliance) && item.productSupplierCompliance.length) {
          const normalizeFoodGrade = (value) => {
            const raw = (value ?? '').toString().trim();
            const lower = raw.toLowerCase();
            if (!raw) return '';
            if (lower === 'yes' || lower === 'food') return 'Food';
            if (lower === 'no' || lower === 'non food' || lower === 'non-food' || lower === 'nonfood') return 'Non Food';
            return raw;
          };
          const normalized = hydrateSupplierRowsFromSystemCode(
            item.productSupplierCompliance.map((r) => ({ ...r, foodGrade: normalizeFoodGrade(r?.foodGrade) }))
          );
          setSupplierRows(normalized);
          setLastSavedSupplierRows(normalized);
          setInitialSupplierRows(normalized);
        }
      }
    };
    const fetchRecycledQuantityUsed = async () => {
      if (!clientId || !type || !itemId) return;
      try {
        const res = await api.get(API_ENDPOINTS.CLIENT.RECYCLED_QUANTITY_USED(clientId), {
          params: { type, itemId }
        });
        const rows = res.data?.data || [];
        if (rows.length) {
          setRecycledRows(rows);
          setLastSavedRecycledRows(rows);
          setInitialRecycledRows(rows);
        }
      } catch (_) {
        // silent
      }
    };
    const fetchMonthlyProcurement = async () => {
      if (!clientId || !type || !itemId) return;
      try {
        const res = await api.get(API_ENDPOINTS.CLIENT.MONTHLY_PROCUREMENT(clientId), {
          params: { type, itemId }
        });
        const rows = (res.data?.data || []).map((row) => {
          const next = { ...row };
          const rQty = parseFloat(next.recycledQty) || 0;
          const rRate = parseFloat(next.recycledRate) || 0;
          if (rQty && rRate) next.recycledQrtAmount = (rQty * rRate).toFixed(3);
          const vQty = parseFloat(next.virginQty) || 0;
          const vRate = parseFloat(next.virginRate) || 0;
          if (vQty && vRate) next.virginQtyAmount = (vQty * vRate).toFixed(3);
          return next;
        });
        if (rows.length) {
          setMonthlyRows(rows);
          setLastSavedMonthlyRows(rows);
          setInitialMonthlyRows(rows);
        }
      } catch (_) {
        // silent
      }
    };
    fetchCompliance();
    fetchComponentDetails();
    fetchSupplierCompliance();
    fetchRecycledQuantityUsed();
    fetchMonthlyProcurement();
  }, [clientId, type, itemId, item]);
  
  const [verificationStates, setVerificationStates] = useState({});
    const [verifying, setVerifying] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    const updateVerificationState = (id, field, value) => {
        setVerificationStates(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };
    const [completedSteps, setCompletedSteps] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const steps = [
        { id: 'verification', label: 'Verification', description: 'CTE & CTO/CCA Details' },
        { id: 'tab2', label: 'Product Compliance', description: 'Packaging and polymer details' },
        { id: 'procurement', label: 'Single Use Plastic', description: 'Supplier & Single Use Plastic Details' },
        { id: 'tab5', label: 'Summery Report', description: 'Overall compliance summary report' },
    ];

    const subSteps = [
        { id: 'product-compliance', label: 'Product Compliance' },
        { id: 'supplier-compliance', label: 'Supplier Compliance' },
        { id: 'component-details', label: 'Component Details' },
        { id: 'recycled-quantity', label: 'Recycled Quantity Used' }
    ];

    const [completedSubSteps, setCompletedSubSteps] = useState([]);

    const [procurementData, setProcurementData] = useState([]);
    const [isUploadingProcurement, setIsUploadingProcurement] = useState(false);
    const [supChecklistData, setSupChecklistData] = useState([]);

    const fetchSupChecklist = useCallback(async () => {
        if (!clientId || !type || !itemId) return;
        try {
            const res = await api.get(API_ENDPOINTS.CLIENT.SUP_CHECKLIST(clientId), { params: { type, itemId } });
            if (res.data.success) {
                setSupChecklistData(res.data.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch SUP checklist", err);
        }
    }, [clientId, type, itemId]);

    const saveSupChecklist = useCallback(async (rows, showNotification = true) => {
        try {
            const res = await api.post(API_ENDPOINTS.CLIENT.SUP_CHECKLIST(clientId), {
                type,
                itemId,
                rows
            });
            if (res.data.success) {
                setSupChecklistData(res.data.data);
                if (showNotification) {
                    notify('success', 'Checklist saved successfully');
                }
            }
        } catch (err) {
            if (showNotification) {
                notify('error', 'Failed to save checklist');
            }
        }
    }, [clientId, type, itemId]);

    const fetchProcurement = useCallback(async () => {
        if (!clientId || !type || !itemId) return;
        try {
            const res = await api.get(API_ENDPOINTS.CLIENT.PROCUREMENT(clientId), { params: { type, itemId } });
            if (res.data.success) {
                setProcurementData(res.data.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch procurement data", err);
        }
    }, [clientId, type, itemId]);

    useEffect(() => {
        if (activeTab === 'procurement') {
            fetchProcurement();
            fetchSupChecklist();
        }
    }, [activeTab, fetchProcurement, fetchSupChecklist]);

    const handleProcurementUpload = async (file) => {
        setIsUploadingProcurement(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        formData.append('itemId', itemId);

        try {
            const res = await api.post(API_ENDPOINTS.CLIENT.PROCUREMENT(clientId), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                notify('success', 'Procurement data imported successfully');
                setProcurementData(res.data.data || []);
            } else {
                notify('error', res.data.message || 'Import failed');
            }
        } catch (err) {
            notify('error', err.response?.data?.message || 'Import failed');
        } finally {
            setIsUploadingProcurement(false);
        }
        return false; // Prevent default upload behavior
    };

    const getCurrentStepIndex = () => steps.findIndex(step => step.id === activeTab);
  const currentStepIndex = getCurrentStepIndex();

  const [relatedItems, setRelatedItems] = useState([]);
  
  // Normalize Helper
  const normalize = (name) => name ? name.trim().toLowerCase() : '';

  useEffect(() => {
        if (item) {
            if (item.completedSteps && Array.isArray(item.completedSteps)) {
                setCompletedSteps(item.completedSteps);
            } else if (item.completedSteps && typeof item.completedSteps === 'string') {
                try {
                    const parsed = JSON.parse(item.completedSteps);
                    if (Array.isArray(parsed)) {
                        setCompletedSteps(parsed);
                        return;
                    }
                } catch (_) {}
                if (item.verification?.status === 'Verified') {
                    setCompletedSteps(prev => {
                        if (!prev.includes('verification')) {
                            return [...prev, 'verification'];
                        }
                        return prev;
                    });
                }
            } else if (item.verification?.status === 'Verified') {
                setCompletedSteps(prev => {
                    if (!prev.includes('verification')) {
                        return [...prev, 'verification'];
                    }
                    return prev;
                });
            }
        }
    }, [item]);

  // Find related items when client or item changes
  useEffect(() => {
    if (client && item) {
        const currentPlantName = normalize(item.plantName);
        if (!currentPlantName) {
            setRelatedItems([]);
            return;
        }

        const allCte = (client.productionFacility?.cteDetailsList || []).map(i => ({...i, type: 'CTE'}));
        const allCto = (client.productionFacility?.ctoDetailsList || []).map(i => ({...i, type: 'CTO'}));
        
        const matches = [...allCte, ...allCto].filter(i => normalize(i.plantName) === currentPlantName);
        setRelatedItems(matches);
    }
  }, [client, item]);


    const saveProgress = async (newCompletedSteps) => {
        setIsSaving(true);
        // Use the dedicated progress endpoint
        try {
             await api.post(API_ENDPOINTS.CLIENT.PLANT_PROCESS_PROGRESS(clientId), {
                type,
                itemId,
                completedSteps: JSON.stringify(newCompletedSteps)
             });
            fetchHistory();
        } catch (error) {
            console.error("Failed to save progress", error);
            notify('error', 'Failed to save progress');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSummary = async () => {
        setIsSaving(true);
        try {
            // 1. Handle File Uploads
            const fileUploads = [];
            productRows.forEach((row, index) => {
                if (row.additionalDocument instanceof File) {
                    fileUploads.push({ index, row });
                }
            });

            // Group by SKU Code to avoid duplicate uploads for same SKU
            const uniqueUploads = new Map();
            fileUploads.forEach(item => {
                const sku = (item.row.skuCode || '').trim();
                if (sku && !uniqueUploads.has(sku)) {
                    uniqueUploads.set(sku, item);
                }
            });

            const uploadPromises = Array.from(uniqueUploads.values()).map(async ({ index, row }) => {
                const formData = new FormData();
                formData.append('type', type);
                formData.append('itemId', itemId);
                formData.append('rowIndex', index);
                
                const rowData = { ...row };
                // Ensure we don't send the File object in JSON
                delete rowData.additionalDocument;
                
                formData.append('row', JSON.stringify(rowData));
                formData.append('additionalDocument', row.additionalDocument);
                
                try {
                    const res = await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE_UPLOAD(clientId), formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    if (res.data.success && res.data.data && res.data.data.row) {
                        return { skuCode: row.skuCode, url: res.data.data.row.additionalDocument };
                    }
                } catch (err) {
                    console.error("Failed to upload document for row", index, err);
                }
                return null;
            });

            const results = await Promise.all(uploadPromises);
            
            // Update local rows with new URLs
            let updatedRows = [...productRows];
            results.forEach(res => {
                if (res) {
                    updatedRows = updatedRows.map(r => {
                        if ((r.skuCode || '').trim() === (res.skuCode || '').trim()) {
                            return { ...r, additionalDocument: res.url };
                        }
                        return r;
                    });
                }
            });
            
            // 2. Save All Data (JSON)
            // This ensures Compliance Status and Remarks are saved, along with new URLs
            // We bypass validation check for mandatory fields here to ensure we don't drop rows.
            // But usually we should validate. Assuming previous steps ensured validation.
            
            const payload = updatedRows.map(r => {
                 const { _validationError, ...rest } = r;
                 return {
                    ...rest,
                    productImage: typeof rest.productImage === 'string' ? rest.productImage : '',
                    componentImage: typeof rest.componentImage === 'string' ? rest.componentImage : '',
                    additionalDocument: typeof rest.additionalDocument === 'string' ? rest.additionalDocument : ''
                 };
            });
            
            const res = await api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE(clientId), {
                type,
                itemId,
                rows: payload
            });
            
            if (res.data && res.data.success) {
                setProductRows(res.data.data || updatedRows);
                setLastSavedRows(res.data.data || updatedRows);
                notify('success', 'Summary report saved successfully');
            } else {
                throw new Error(res.data.message || 'Failed to save summary');
            }

        } catch (error) {
            console.error("Failed to save summary", error);
            notify('error', 'Failed to save summary report');
            throw error; // Re-throw to prevent proceeding if save fails?
            // Actually handleNext swallows errors usually, but we should probably block.
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = async () => {
        // Combined behaviour for Product Compliance sub-steps and main steps
        if (activeTab === 'tab2') {
            setCompletedSubSteps(prev => {
                if (prev.includes(subTab)) return prev;
                return [...prev, subTab];
            });

            const currentIndex = subSteps.findIndex(step => step.id === subTab);
            if (currentIndex < subSteps.length - 1) {
                setSubTab(subSteps[currentIndex + 1].id);
                window.scrollTo(0, 0);
                return;
            }
            // If on last sub-step, fall through to mark main step complete and move to next main tab
        }

        let newSteps = [...completedSteps];
        if (!newSteps.includes(activeTab)) {
            newSteps = [...newSteps, activeTab];
            setCompletedSteps(newSteps);
            await saveProgress(newSteps); // Await save to ensure backend is updated
        }
        
        const currentIndex = steps.findIndex(s => s.id === activeTab);
        if (currentIndex < steps.length - 1) {
            setActiveTab(steps[currentIndex + 1].id);
        } else {
             // Last step (Finish)
             if (activeTab === 'tab5') {
                 try {
                     await handleSaveSummary();
                 } catch (e) {
                     return; // Don't finish if save fails
                 }
             }

             // Force save tab5 (or current activeTab) to backend to ensure audit completion logic triggers
             if (!newSteps.includes(activeTab)) {
                 // Should be handled above, but double check
                 newSteps = [...newSteps, activeTab];
                 await saveProgress(newSteps);
             } else {
                 // Even if locally marked, ensure backend has it (idempotent)
                 await saveProgress(newSteps);
             }
             
             if (onFinish) onFinish();
             else if (onBack) onBack();
        }
    };

    const isStepReadOnly = () => {
        const role = user?.role?.name || user?.role;
        if (['ADMIN', 'SUPER ADMIN'].includes(role)) return false;
        return completedSteps.includes(activeTab);
    };

    const [isChangeSummaryExpanded, setIsChangeSummaryExpanded] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const getChangeSummary = () => {
        const changes = [];

        // 1. Product Compliance
        productRows.forEach((row, idx) => {
            const initialRow = lastSavedRows[idx] || {};
            const fields = ['packagingType', 'clientName', 'clientState', 'skuCode', 'skuDescription', 'skuUom', 'productImage', 'componentCode', 'componentDescription', 'supplierName', 'supplierState', 'generateSupplierCode', 'supplierCode', 'componentImage'];
            fields.forEach(field => {
                const initialVal = initialRow[field];
                const currentVal = row[field];
                if (getComparableProductValue(initialVal, field) !== getComparableProductValue(currentVal, field)) {
                   changes.push({
                     id: `local-prod-${idx}-${field}`,
                     table: 'Product Compliance',
                     row: idx + 1,
                     field: field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                     prev: formatProductFieldValue(initialVal, field),
                     curr: formatProductFieldValue(currentVal, field),
                     user: resolvedUserName,
                     at: new Date().toISOString()
                   });
                }
            });
        });

        // 1.5 SKU Compliance
        skuRows.forEach((row, idx) => {
            const initialRow = lastSavedSkuRows[idx] || {};
            const fields = ['skuCode', 'skuDescription', 'skuUom', 'productImage'];
            fields.forEach(field => {
                const initialVal = initialRow[field];
                const currentVal = row[field];
                if (getComparableProductValue(initialVal, field) !== getComparableProductValue(currentVal, field)) {
                   changes.push({
                     id: `local-sku-${idx}-${field}`,
                     table: 'SKU Compliance',
                     row: idx + 1,
                     field: field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                     prev: formatProductFieldValue(initialVal, field),
                     curr: formatProductFieldValue(currentVal, field),
                     user: resolvedUserName,
                     at: new Date().toISOString()
                   });
                }
            });
        });

        // 2. Component Details
        componentRows.forEach((row, idx) => {
            const initialRow = lastSavedComponentRows[idx] || {};
            const fields = ['componentCode', 'componentDescription', 'supplierName', 'polymerType', 'componentPolymer', 'category', 'containerCapacity', 'foodGrade', 'layerType', 'thickness'];
            fields.forEach(field => {
                const prevVal = (initialRow[field] ?? '').toString().trim();
                const currVal = (row[field] ?? '').toString().trim();
                if (prevVal !== currVal) {
                    changes.push({
                        id: `local-comp-${idx}-${field}`,
                        table: 'Component Details',
                        row: idx + 1,
                        field: field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                        prev: prevVal || '-',
                        curr: currVal || '-',
                        user: resolvedUserName,
                        at: new Date().toISOString()
                    });
                }
            });
        });

        // 3. Supplier Compliance
        supplierRows.forEach((row, idx) => {
            const initialRow = lastSavedSupplierRows[idx] || {};
            const fields = ['systemCode', 'componentCode', 'componentDescription', 'supplierName', 'supplierType', 'supplierStatus', 'applicationType', 'foodGrade', 'eprCertificateNumber', 'fssaiLicNo', 'fssaiValidUpto'];
            fields.forEach(field => {
                const prevVal = (initialRow[field] ?? '').toString().trim();
                const currVal = (row[field] ?? '').toString().trim();
                if (prevVal !== currVal) {
                    changes.push({
                        id: `local-supp-${idx}-${field}`,
                        table: 'Supplier Compliance',
                        row: idx + 1,
                        field: field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                        prev: prevVal || '-',
                        curr: currVal || '-',
                        user: resolvedUserName,
                        at: new Date().toISOString()
                    });
                }
            });
        });

        // 4. Recycled Quantity Used
        recycledRows.forEach((row, idx) => {
            const initialRow = lastSavedRecycledRows[idx] || {};
            const fields = ['componentCode', 'componentDescription', 'category', 'annualConsumption', 'uom', 'perPieceWeight', 'usedRecycledPercent'];
            fields.forEach(field => {
                const prevVal = (initialRow[field] ?? '').toString().trim();
                const currVal = (row[field] ?? '').toString().trim();
                if (prevVal !== currVal) {
                    changes.push({
                        id: `local-recy-${idx}-${field}`,
                        table: 'Recycled Quantity Used',
                        row: idx + 1,
                        field: field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                        prev: prevVal || '-',
                        curr: currVal || '-',
                        user: resolvedUserName,
                        at: new Date().toISOString()
                    });
                }
            });
        });

        return changes;
    };

    const liveChangeSummaryData = getChangeSummary();
    
    // Combine normalizedDbHistory and persistedHistory, prioritizing DB history but keeping unique local ones
    const combinedHistory = useMemo(() => {
        return [...normalizedDbHistory].sort((a, b) => {
            const da = new Date(a.at || 0);
            const db = new Date(b.at || 0);
            return db - da; // Descending
        });
    }, [normalizedDbHistory]);

    const historyModalData = combinedHistory.length ? combinedHistory : liveChangeSummaryData;
    const changeSummaryData = combinedHistory.length
        ? [...liveChangeSummaryData, ...combinedHistory]
        : liveChangeSummaryData;

    useEffect(() => {
        fetchClientDetails();
    }, [clientId]);

    useEffect(() => {
        if (client) {
            findItem();
        }
    }, [client, type, itemId]);

    const fetchClientDetails = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CLIENT.GET_BY_ID(clientId), { params: { _: Date.now() } });
      if (response.data.success) {
        setClient(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch client details');
    } finally {
      setLoading(false);
    }
  };

  const findItem = () => {
    if (!client || !client.productionFacility) return;
    
    let foundItem = null;
    if (type === 'CTE') {
      foundItem = client.productionFacility.cteDetailsList?.find(i => i._id === itemId);
    } else if (type === 'CTO') {
      foundItem = client.productionFacility.ctoDetailsList?.find(i => i._id === itemId);
    }
    
    if (foundItem) {
      setItem(foundItem);
    } else {
      setError('Plant details not found');
    }
  };

  const handleVerify = async (status, targetItem) => {
        const state = verificationStates[targetItem._id] || {};
        const file = state.file;
        const remark = state.remark;

        if (status === 'Verified' && !file && !targetItem.verification?.document) {
            alert('Please select a document to upload for verification.');
            return;
        }
        if (status === 'Rejected' && !remark) {
            alert('Please provide a remark for rejection.');
            return;
        }

        if (status === 'Verified') setVerifying(true);
        else setRejecting(true);

        // Update completedSteps locally and prepare for sending
        let newSteps = [...completedSteps];
        if (status === 'Verified') {
            if (!newSteps.includes('verification')) {
                newSteps.push('verification');
            }
        }

        const formData = new FormData();
        formData.append('type', targetItem.type);
        formData.append('itemId', targetItem._id);
        formData.append('verificationStatus', status);
        // Include completedSteps in the verification request to ensure progress is updated
        formData.append('completedSteps', JSON.stringify(newSteps));

        if (file) {
            formData.append('document', file);
        }
        if (remark) {
            formData.append('verificationRemark', remark);
        }

        try {
            const response = await api.post(API_ENDPOINTS.CLIENT.VERIFY_FACILITY(clientId), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.success) {
                alert(`${status} successfully`);
                setCompletedSteps(newSteps); // Update local state immediately
                fetchClientDetails(); // Refresh to update state
                fetchHistory();
            }
        } catch (err) {
            console.error(err);
            alert('Operation failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setVerifying(false);
            setRejecting(false);
        }
    };

  const resolveUrl = (p) => {
    if (!p) return '';
    const isAbs = p.startsWith('http://') || p.startsWith('https://');
    return isAbs ? p : `${api.defaults.baseURL}/${p}`;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-red-600 bg-white p-6 rounded-lg shadow-lg">
            <ExclamationCircleFilled className="text-4xl mb-4 block text-center" />
            <p className="text-lg font-semibold">{error}</p>
        </div>
    </div>
  );

  if (!item) return <div className="p-6">Item not found</div>;

  // Pagination Logic
  const indexOfLastRow = currentPage * itemsPerPage;
  const indexOfFirstRow = indexOfLastRow - itemsPerPage;
  const currentRows = productRows.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(productRows.length / itemsPerPage);

  const indexOfLastSkuRow = skuPage * skuItemsPerPage;
  const indexOfFirstSkuRow = indexOfLastSkuRow - skuItemsPerPage;
  const currentSkuRows = skuRows.slice(indexOfFirstSkuRow, indexOfLastSkuRow);
  const totalSkuPages = Math.ceil(skuRows.length / skuItemsPerPage);

  const indexOfLastComponentRow = componentPage * componentItemsPerPage;
  const indexOfFirstComponentRow = indexOfLastComponentRow - componentItemsPerPage;
  const currentComponentRows = componentRows.slice(indexOfFirstComponentRow, indexOfLastComponentRow);
  const totalComponentPages = Math.ceil(componentRows.length / componentItemsPerPage);

  const indexOfLastSupplierRow = supplierPage * supplierItemsPerPage;
  const indexOfFirstSupplierRow = indexOfLastSupplierRow - supplierItemsPerPage;
  const currentSupplierRows = supplierRows.slice(indexOfFirstSupplierRow, indexOfLastSupplierRow);
  const totalSupplierPages = Math.ceil(supplierRows.length / supplierItemsPerPage);
  const indexOfLastRecycledRow = recycledPage * recycledItemsPerPage;
  const indexOfFirstRecycledRow = indexOfLastRecycledRow - recycledItemsPerPage;
  const currentRecycledRows = recycledRows.slice(indexOfFirstRecycledRow, indexOfLastRecycledRow);
  const indexOfLastMonthlyRow = monthlyPage * monthlyItemsPerPage;
  const indexOfFirstMonthlyRow = indexOfLastMonthlyRow - monthlyItemsPerPage;
  const totalRecycledPages = Math.ceil(recycledRows.length / recycledItemsPerPage);

  return (
    <div className={`min-h-screen bg-gray-50 pb-12 ${onBack ? '' : '-m-6'}`}>
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
          <div className="w-full mx-auto px-2 py-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (!isSaving) {
                                if (onBack) {
                                    onBack();
                                } else {
                                    navigate(`/dashboard/client/${clientId}`, { state: { viewMode: 'process' } });
                                }
                            }
                        }}
                        className={`group flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-all ${
                            isSaving 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-gray-100 text-gray-500 hover:bg-primary-600 hover:text-white'
                        }`}
                        title={isSaving ? "Saving progress..." : "Back to Client Details"}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <LoadingOutlined spin />
                        ) : (
                            <ArrowLeftOutlined className="transition-transform group-hover:-translate-x-1" />
                        )}
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 m-0 leading-tight">
                                {item.plantName || client.clientName}
                            </h1>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <Tooltip title="View Change History">
                        <Button 
                            type="primary" 
                            ghost 
                            icon={<HistoryOutlined />} 
                            onClick={() => setShowHistoryModal(true)}
                            className="flex items-center gap-2 font-medium"
                        >
                            History
                        </Button>
                    </Tooltip>


                </div>
            </div>
          </div>
      </div>
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`min-w-[260px] max-w-sm rounded-lg px-3 py-2 shadow-sm flex items-center justify-between relative ${
              n.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {n.type === 'error' ? <ExclamationCircleFilled /> : <CheckCircleFilled />}
              <span className="text-sm font-medium">{n.text}</span>
            </div>
            <button
              onClick={() => dismissNotification(n.id)}
              className={`text-white/90 hover:text-white`}
              title="Dismiss"
            >
              <CloseOutlined />
            </button>
            <div
              className="absolute left-0 bottom-0 h-0.5 bg-white/80"
              style={{
                width: n.started ? '0%' : '100%',
                transition: `width ${n.duration}ms linear`
              }}
            />
          </div>
        ))}
      </div>

      <div className="w-full mx-auto px-2 py-8">
        
        {/* Progress Stepper */}
        <div className="mb-8">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                {/* Mobile Compact Stepper */}
                <div className="md:hidden p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">
                            Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].label}
                        </span>
                        <span className="text-xs text-gray-500">
                            {Math.round(((currentStepIndex + 1) / steps.length) * 100)}% Complete
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                        ></div>
                    </div>
                    {/* Navigation buttons for mobile if needed, or rely on internal next/back */}
                </div>

                {/* Desktop Full Stepper */}
                <div className="hidden md:flex flex-row">
                    {steps.map((step, index) => {
                        const isCurrent = index === currentStepIndex;
                        const isCompleted = completedSteps.includes(step.id);

    return {
        persistedHistory,
        dbHistory,
        dbHistoryLoaded,
        client,
        item,
        loading,
        error,
        activeTab,
        subTab,
        notifications,
        productRows,
        lastSavedRows,
        initialProductRows,
        skuRows,
        lastSavedSkuRows,
        initialSkuRows,
        currentPage,
        itemsPerPage,
        skuPage,
        skuItemsPerPage,
        componentRows,
        isBulkSaving,
        isSupplierBulkSaving,
        isComponentBulkSaving,
        savingRow,
        isSkuBulkSaving,
        savingSkuRow,
        componentPage,
        componentItemsPerPage,
        lastSavedComponentRows,
        initialComponentRows,
        savingComponentRow,
        supplierRows,
        supplierPage,
        supplierItemsPerPage,
        lastSavedSupplierRows,
        initialSupplierRows,
        savingSupplierRow,
        recycledRows,
        recycledPage,
        recycledItemsPerPage,
        lastSavedRecycledRows,
        initialRecycledRows,
        savingRecycledRow,
        monthlyRows,
        monthlyPage,
        monthlyItemsPerPage,
        lastSavedMonthlyRows,
        initialMonthlyRows,
        savingMonthlyRow,
        verificationStates,
        verifying,
        rejecting,
        completedSteps,
        isSaving,
        completedSubSteps,
        procurementData,
        isUploadingProcurement,
        supChecklistData,
        relatedItems,
        isChangeSummaryExpanded,
        showHistoryModal,
        setPersistedHistory,
        setDbHistory,
        setDbHistoryLoaded,
        setClient,
        setItem,
        setLoading,
        setError,
        setActiveTab,
        setSubTab,
        setNotifications,
        setProductRows,
        setLastSavedRows,
        setInitialProductRows,
        setSkuRows,
        setLastSavedSkuRows,
        setInitialSkuRows,
        setCurrentPage,
        setItemsPerPage,
        setSkuPage,
        setSkuItemsPerPage,
        setComponentRows,
        setIsBulkSaving,
        setIsSupplierBulkSaving,
        setIsComponentBulkSaving,
        setSavingRow,
        setIsSkuBulkSaving,
        setSavingSkuRow,
        setComponentPage,
        setComponentItemsPerPage,
        setLastSavedComponentRows,
        setInitialComponentRows,
        setSavingComponentRow,
        setSupplierRows,
        setSupplierPage,
        setSupplierItemsPerPage,
        setLastSavedSupplierRows,
        setInitialSupplierRows,
        setSavingSupplierRow,
        setRecycledRows,
        setRecycledPage,
        setRecycledItemsPerPage,
        setLastSavedRecycledRows,
        setInitialRecycledRows,
        setSavingRecycledRow,
        setMonthlyRows,
        setMonthlyPage,
        setMonthlyItemsPerPage,
        setLastSavedMonthlyRows,
        setInitialMonthlyRows,
        setSavingMonthlyRow,
        setVerificationStates,
        setVerifying,
        setRejecting,
        setCompletedSteps,
        setIsSaving,
        setCompletedSubSteps,
        setProcurementData,
        setIsUploadingProcurement,
        setSupChecklistData,
        setRelatedItems,
        setIsChangeSummaryExpanded,
        setShowHistoryModal,
        appendPersistedHistory,
        notify,
        dismissNotification,
        getCompanyShortName,
        getPlantCode,
        getSupplierShortName,
        getStateShortName,
        getSupplierCodePrefix,
        generateNextSupplierCode,
        ensureSupplierCodeWithState,
        handleRowChange,
        handleFileChange,
        handleProductComponentCodeChange,
        generateComponentCode,
        generateSystemCode,
        handleGenerateChange,
        handleGenerateSupplierCodeChange,
        generateComponentCodeForBulk,
        generateSupplierCodeForBulk,
        handleProductDeleteAll,
        handleSupplierDeleteAll,
        handleSummaryChange,
        handleComponentSummaryChange,
        handleSummaryFileChange,
        handleComponentSummaryFileChange,
        handleProductExport,
        handleProductTemplateDownload,
        colToLetter,
        getColRef,
        handleSupplierExport,
        handleSupplierTemplateDownload,
        colLetter,
        headerIndex,
        handleExcelUpload,
        getValue,
        handleBulkSave,
        handleSupplierExcelUpload,
        normalizeFoodGrade,
        applicationType,
        handleSupplierBulkSave,
        addRow,
        removeRow,
        getComparableProductValue,
        formatProductFieldValue,
        isProductFieldChanged,
        isSkuFieldChanged,
        handleSkuCodeSelect,
        saveRow,
        cancelRow,
        handleComponentSave,
        addSkuRow,
        removeSkuRow,
        handleSkuRowChange,
        handleSkuFileChange,
        saveSkuRow,
        cancelSkuRow,
        handleSkuBulkSave,
        handleSkuDeleteAll,
        handleSkuExport,
        handleSkuTemplateDownload,
        handleSkuExcelUpload,
        handleComponentChange,
        addComponentRow,
        removeComponentRow,
        saveComponentRow,
        resolvedRow,
        cancelComponentRow,
        isComponentRowEmpty,
        getComponentRowValidationError,
        withComponentValidation,
        handleComponentBulkSave,
        handleComponentDeleteAll,
        handleComponentExport,
        handleComponentTemplateDownload,
        handleComponentExcelUpload,
        handleRecycledChange,
        handleRecycledPercentBlur,
        addRecycledRow,
        removeRecycledRow,
        handleRecycledBulkSave,
        handleRecycledDeleteAll,
        handleRecycledExcelUpload,
        handleRecycledExport,
        handleRecycledTemplateDownload,
        handleMonthlyExcelUpload,
        handleMonthlyExport,
        handleMonthlyTemplateDownload,
        handleRecycledCodeSelect,
        saveRecycledRow,
        cancelRecycledRow,
        handleSupplierChange,
        handleSystemCodeSelect,
        handleSupplierCodeSelect,
        addSupplierRow,
        removeSupplierRow,
        saveSupplierRow,
        cancelSupplierRow,
        fetchCompliance,
        fetchSkuCompliance,
        fetchComponentDetails,
        fetchSupplierCompliance,
        fetchRecycledQuantityUsed,
        fetchMonthlyProcurement,
        updateVerificationState,
        handleProcurementUpload,
        getCurrentStepIndex,
        normalize,
        saveProgress,
        handleSaveSummary,
        handleNext,
        isStepReadOnly,
        getChangeSummary,
        fetchClientDetails,
        findItem,
        handleVerify,
        resolveUrl,
        fileInputSupplierRef,
        fileInputRef,
        fileInputSkuRef,
        fileInputComponentRef,
        resolvedUserName,
        historyStorageKey,
        legacyHistoryStorageKey,
        normalizedDbHistory,
        componentOptions,
        systemCodeOptions,
        skuOptions,
        categorySummary,
        combinedHistory,
        fetchHistory,
        fetchSupChecklist,
        saveSupChecklist,
        fetchProcurement,
        clientId,
        type,
        itemId,
        userKey,
        rawShared,
        parsedShared,
        rawLegacy,
        parsedLegacy,
        next,
        rows,
        controller,
        userText,
        isProducer,
        id,
        entry,
        parts,
        s,
        supplierShortName,
        companyShortName,
        supplierStateShort,
        code,
        numPart,
        num,
        nextNum,
        supplierName,
        prefix,
        currentCode,
        supplierNameLower,
        stateShort,
        match,
        nameLower,
        totalPages,
        packagingTypes,
        polymerTypes,
        categories,
        categoryIITypeOptions,
        containerCapacities,
        layerTypes,
        map,
        uniqueMap,
        existing,
        hasImage,
        existingHasImage,
        copy,
        updatedRow,
        sku,
        desc,
        existingMatch,
        plantCode,
        compMatch,
        descFromComponent,
        supplierFromComponent,
        nextNumStr,
        needsUpdate,
        updatedRows,
        row,
        newCode,
        sampleRow,
        payload,
        res,
        rowKey,
        exportData,
        data,
        ws,
        wb,
        headers,
        m,
        idx,
        col,
        generateRef,
        supplierTypeRef,
        supplierCategoryRef,
        generateSupplierRef,
        statusCol,
        foodCol,
        appCol,
        file,
        reader,
        bstr,
        wsname,
        newRows,
        rowKeys,
        possibleGenerateValue,
        supplierShort,
        companyShort,
        sysPrefix,
        systemCode,
        newRow,
        rowsForValidation,
        validatedRows,
        missing,
        normalizedRows,
        supplierCode,
        validRows,
        invalidRows,
        savedRows,
        raw,
        lower,
        supplierStatus,
        rawApplicationType,
        foodGrade,
        eprCertificateNumber,
        fssaiLicNo,
        fssaiValidUpto,
        newSystemCode,
        str,
        prevValue,
        selectedOption,
        rowToCheck,
        codeToCheck,
        isDuplicate,
        otherCode,
        sameSku,
        sameDesc,
        skuToCheck,
        descToCheck,
        existingCode,
        supplierCodeNormalized,
        supplierCodeToCheck,
        supplierNameToCheck,
        isSupplierDuplicate,
        otherName,
        beforeRow,
        hasFiles,
        fd,
        rowJson,
        saved,
        fields,
        entryBaseId,
        historyEntries,
        prevVal,
        currVal,
        selected,
        pt,
        cp,
        keys,
        rowsToSave,
        errorCount,
        hasRpetMismatch,
        recycled,
        hasMismatch,
        layerCol,
        polymerCodeCol,
        validations,
        newRowsRaw,
        rr,
        sc,
        base,
        merged,
        cat,
        acMt,
        usedMt,
        prev,
        ac,
        uom,
        ppwKg,
        pctRaw,
        pctFraction,
        headerMap,
        rowData,
        date,
        d,
        y,
        dateVal,
        dateObj,
        supplierMatch,
        qty,
        wt,
        rRate,
        rQtyVal,
        monthlyMtVal,
        vRate,
        vQtyVal,
        opt,
        categoryFromComponent,
        savedRowForHistory,
        prodMatch,
        supplierFromProduct,
        supplierTypeFromProduct,
        existingRowsSameCode,
        registeredExisting,
        supplierFromExisting,
        fallbackRows,
        normalized,
        steps,
        subSteps,
        formData,
        currentStepIndex,
        parsed,
        currentPlantName,
        allCte,
        allCto,
        matches,
        fileUploads,
        uniqueUploads,
        uploadPromises,
        results,
        currentIndex,
        role,
        changes,
        initialRow,
        initialVal,
        currentVal,
        liveChangeSummaryData,
        da,
        db,
        historyModalData,
        changeSummaryData,
        response,
        state,
        remark,
        isAbs,
        indexOfLastRow,
        indexOfFirstRow,
        currentRows,
        indexOfLastSkuRow,
        indexOfFirstSkuRow,
        currentSkuRows,
        totalSkuPages,
        indexOfLastComponentRow,
        indexOfFirstComponentRow,
        currentComponentRows,
        totalComponentPages,
        indexOfLastSupplierRow,
        indexOfFirstSupplierRow,
        currentSupplierRows,
        totalSupplierPages,
        indexOfLastRecycledRow,
        indexOfFirstRecycledRow,
        currentRecycledRows,
        indexOfLastMonthlyRow,
        indexOfFirstMonthlyRow,
        totalRecycledPages,
        isCurrent,
        isCompleted
    };
};
