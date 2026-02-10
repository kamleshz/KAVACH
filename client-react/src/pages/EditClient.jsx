import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import DocumentViewerModal from '../components/DocumentViewerModal';

const EditClient = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [client, setClient] = useState(null);
  const [allowSubmit, setAllowSubmit] = useState(false);
  
  // Document Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerName, setViewerName] = useState('');

  const [cteRows, setCteRows] = useState([]);
  const [ctoRows, setCtoRows] = useState([]);
  const [isAddingCte, setIsAddingCte] = useState(false);
  const [isAddingCto, setIsAddingCto] = useState(false);
  const [editingCteIndex, setEditingCteIndex] = useState(null);
  const [editingCtoIndex, setEditingCtoIndex] = useState(null);
  const [currentCteRow, setCurrentCteRow] = useState({
    plantName: '',
    consentNo: '',
    category: '',
    issuedDate: '',
    validUpto: '',
    plantLocation: '',
    plantAddress: '',
    factoryHeadName: '',
    factoryHeadDesignation: '',
    factoryHeadMobile: '',
    factoryHeadEmail: '',
    contactPersonName: '',
    contactPersonDesignation: '',
    contactPersonMobile: '',
    contactPersonEmail: '',
    documentFile: ''
  });
  const [currentCtoRow, setCurrentCtoRow] = useState({
    plantName: '',
    consentOrderNo: '',
    dateOfIssue: '',
    validUpto: '',
    plantLocation: '',
    plantAddress: '',
    factoryHeadName: '',
    factoryHeadDesignation: '',
    factoryHeadMobile: '',
    factoryHeadEmail: '',
    contactPersonName: '',
    contactPersonDesignation: '',
    contactPersonMobile: '',
    contactPersonEmail: '',
    documentFile: ''
  });

  // CTE Production State
  const [cteProductionRows, setCteProductionRows] = useState([]);
  const [isAddingCteProduction, setIsAddingCteProduction] = useState(false);
  const [editingCteProductionIndex, setEditingCteProductionIndex] = useState(null);
  const [currentCteProductionRow, setCurrentCteProductionRow] = useState({ plantName: '', productName: '', maxCapacityPerYear: '', uom: '' });

  // CTO Products State
  const [ctoProductRows, setCtoProductRows] = useState([]);
  const [isAddingCtoProduct, setIsAddingCtoProduct] = useState(false);
  const [editingCtoProductIndex, setEditingCtoProductIndex] = useState(null);
  const [currentCtoProductRow, setCurrentCtoProductRow] = useState({ plantName: '', productName: '', quantity: '', uom: '' });

  // MSME State
  const [msmeRows, setMsmeRows] = useState([]);
  const [isAddingMsme, setIsAddingMsme] = useState(false);
  const [editingMsmeIndex, setEditingMsmeIndex] = useState(null);
  const [currentMsmeRow, setCurrentMsmeRow] = useState({
    classificationYear: '',
    status: '',
    majorActivity: '',
    udyamNumber: '',
    turnover: '',
    certificateFile: null
  });

  const [formData, setFormData] = useState({
    clientName: '',
    tradeName: '',
    companyGroupName: '',
    financialYear: '',
    entityType: '',
    contactPersonName: '',
    contactPersonEmail: '',
    contactPersonMobile: '',
    contactPersonDesignation: '',
    pan: '',
    cin: '',
    gst: '',
    udyamRegistration: '',
    registeredAddress: '',
    facilityName: '',
    state: '',
    city: '',
    facilityAddress: '',
    cto: '',
    cte: '',
    notes: '',
    // Authorised Person
    authorisedPersonName: '',
    authorisedPersonNumber: '',
    authorisedPersonEmail: '',
    // Coordinating Person
    coordinatingPersonName: '',
    coordinatingPersonNumber: '',
    coordinatingPersonEmail: '',
    
    // Compliance Contact (Certificate)
    compAuthName: '',
    compAuthNum: '',
    compAuthEmail: '',
    compCoordName: '',
    compCoordNum: '',
    compCoordEmail: '',

    // MSME Contact (MSME Details)
    msmeAuthName: '',
    msmeAuthNum: '',
    msmeAuthEmail: '',
    msmeCoordName: '',
    msmeCoordNum: '',
    msmeCoordEmail: '',
  });

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const getLatestDoc = (docs, type) => {
    const arr = Array.isArray(docs) ? docs : [];
    const matches = arr.filter((d) => d && d.documentType === type);
    matches.sort((a, b) => {
      const at = a?.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const bt = b?.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      if (bt !== at) return bt - at;
      const aid = String(a?._id || "");
      const bid = String(b?._id || "");
      return bid.localeCompare(aid);
    });
    return matches[0] || null;
  };

  const fetchClientData = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CLIENT.GET_BY_ID(id), { params: { _: Date.now() } });
      if (response.data.success) {
        const client = response.data.data;
        setClient(client);
        
        // Extract certificate details
        const gstDoc = getLatestDoc(client.documents, 'GST');
        const panDoc = getLatestDoc(client.documents, 'PAN');
        const cinDoc = getLatestDoc(client.documents, 'CIN');
        const factoryLicenseDoc = getLatestDoc(client.documents, 'Factory License');
        const eprCertificateDoc = getLatestDoc(client.documents, 'EPR Certificate');

        setFormData({
          clientName: client.clientName || '',
          tradeName: client.tradeName || '',
          companyGroupName: client.companyGroupName || '',
          financialYear: client.financialYear || '',
          entityType: client.entityType || '',
          contactPersonName: client.contactPerson?.name || '',
          contactPersonEmail: client.contactPerson?.email || '',
          contactPersonMobile: client.contactPerson?.mobile || '',
          contactPersonDesignation: client.contactPerson?.designation || '',
          pan: client.companyDetails?.pan || '',
          cin: client.companyDetails?.cin || '',
          gst: client.companyDetails?.gst || '',
          udyamRegistration: client.companyDetails?.udyamRegistration || '',
          registeredAddress: client.companyDetails?.registeredAddress || '',
          facilityName: client.productionFacility?.facilityName || '',
          state: client.productionFacility?.state || '',
          city: client.productionFacility?.city || '',
          facilityAddress: client.productionFacility?.address || '',
          cto: client.productionFacility?.cto || '',
          cte: client.productionFacility?.cte || '',
          
          // Authorised Person
          authorisedPersonName: client.authorisedPerson?.name || '',
          authorisedPersonNumber: client.authorisedPerson?.number || '',
          authorisedPersonEmail: client.authorisedPerson?.email || '',
          
          // Coordinating Person
          coordinatingPersonName: client.coordinatingPerson?.name || '',
          coordinatingPersonNumber: client.coordinatingPerson?.number || '',
          coordinatingPersonEmail: client.coordinatingPerson?.email || '',

          // Compliance/MSME Contact removed from schema

          factoryLicenseNo: factoryLicenseDoc?.certificateNumber || '',
          eprCertificateNo: eprCertificateDoc?.certificateNumber || '',
          // Date fields
          gstDate: gstDoc?.certificateDate ? new Date(gstDoc.certificateDate).toISOString().split('T')[0] : '',
          panDate: panDoc?.certificateDate ? new Date(panDoc.certificateDate).toISOString().split('T')[0] : '',
          cinDate: cinDoc?.certificateDate ? new Date(cinDoc.certificateDate).toISOString().split('T')[0] : '',
          factoryLicenseDate: factoryLicenseDoc?.certificateDate ? new Date(factoryLicenseDoc.certificateDate).toISOString().split('T')[0] : '',
          eprCertificateDate: eprCertificateDoc?.certificateDate ? new Date(eprCertificateDoc.certificateDate).toISOString().split('T')[0] : '',
        });
        setCteRows((client.productionFacility?.cteDetailsList || []).map(row => ({
          ...row,
          issuedDate: row.issuedDate ? new Date(row.issuedDate).toISOString().split('T')[0] : '',
          validUpto: row.validUpto ? new Date(row.validUpto).toISOString().split('T')[0] : ''
        })));
        setCtoRows((client.productionFacility?.ctoDetailsList || []).map(row => ({
          ...row,
          dateOfIssue: row.dateOfIssue ? new Date(row.dateOfIssue).toISOString().split('T')[0] : '',
          validUpto: row.validUpto ? new Date(row.validUpto).toISOString().split('T')[0] : ''
        })));
        setCteProductionRows(client.productionFacility?.cteProduction || []);
        setCtoProductRows(client.productionFacility?.ctoProducts || []);
        setMsmeRows(client.msmeDetails || []);
      }
    } catch (error) {
      setError('Failed to load client data');
    } finally {
      setFetchLoading(false);
    }
  };
  
  const handleCteInput = (e) => {
    setCurrentCteRow({ ...currentCteRow, [e.target.name]: e.target.value });
  };
  const handleCtoInput = (e) => {
    setCurrentCtoRow({ ...currentCtoRow, [e.target.name]: e.target.value });
  };
  const handleCteFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCurrentCteRow({ ...currentCteRow, documentFile: file });
    }
  };
  const handleCtoFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCurrentCtoRow({ ...currentCtoRow, documentFile: file });
    }
  };

  const saveCteRow = () => {
    if ((currentCteRow.factoryHeadMobile && !isValidMobile(currentCteRow.factoryHeadMobile)) ||
        (currentCteRow.contactPersonMobile && !isValidMobile(currentCteRow.contactPersonMobile))) {
      alert('Mobile numbers must be 10 digits');
      return;
    }

    const rows = [...cteRows];
    const idx = editingCteIndex !== null ? editingCteIndex : rows.length;
    rows[idx] = currentCteRow;
    setCteRows(rows);
    setCurrentCteRow({
      consentNo: '',
      category: '',
      issuedDate: '',
      validUpto: '',
      plantLocation: '',
      plantAddress: '',
      factoryHeadName: '',
      factoryHeadDesignation: '',
      factoryHeadMobile: '',
      factoryHeadEmail: '',
      contactPersonName: '',
      contactPersonDesignation: '',
      contactPersonMobile: '',
      contactPersonEmail: '',
      documentFile: ''
    });
    setEditingCteIndex(null);
    setIsAddingCte(false);
  };
  const cancelCteEdit = () => {
    setIsAddingCte(false);
    setEditingCteIndex(null);
    setCurrentCteRow({
      consentNo: '',
      category: '',
      issuedDate: '',
      validUpto: '',
      plantLocation: '',
      plantAddress: '',
      factoryHeadName: '',
      factoryHeadDesignation: '',
      factoryHeadMobile: '',
      factoryHeadEmail: '',
      contactPersonName: '',
      contactPersonDesignation: '',
      contactPersonMobile: '',
      contactPersonEmail: '',
      documentFile: ''
    });
  };
  const editCteRow = (index) => {
    setEditingCteIndex(index);
    setCurrentCteRow(cteRows[index]);
    setIsAddingCte(false);
  };
  const deleteCteRow = (index) => {
    const rows = [...cteRows];
    rows.splice(index, 1);
    setCteRows(rows);
  };
  const saveCtoRow = () => {
    if ((currentCtoRow.factoryHeadMobile && !isValidMobile(currentCtoRow.factoryHeadMobile)) ||
        (currentCtoRow.contactPersonMobile && !isValidMobile(currentCtoRow.contactPersonMobile))) {
      alert('Mobile numbers must be 10 digits');
      return;
    }

    const rows = [...ctoRows];
    const idx = editingCtoIndex !== null ? editingCtoIndex : rows.length;
    rows[idx] = currentCtoRow;
    setCtoRows(rows);
    setCurrentCtoRow({
      plantName: '',
      consentOrderNo: '',
      dateOfIssue: '',
      validUpto: '',
      plantLocation: '',
      plantAddress: '',
      factoryHeadName: '',
      factoryHeadDesignation: '',
      factoryHeadMobile: '',
      factoryHeadEmail: '',
      contactPersonName: '',
      contactPersonDesignation: '',
      contactPersonMobile: '',
      contactPersonEmail: '',
      documentFile: ''
    });
    setEditingCtoIndex(null);
    setIsAddingCto(false);
  };
  const cancelCtoEdit = () => {
    setIsAddingCto(false);
    setEditingCtoIndex(null);
    setCurrentCtoRow({
      consentOrderNo: '',
      dateOfIssue: '',
      validUpto: '',
      plantLocation: '',
      plantAddress: '',
      factoryHeadName: '',
      factoryHeadDesignation: '',
      factoryHeadMobile: '',
      factoryHeadEmail: '',
      contactPersonName: '',
      contactPersonDesignation: '',
      contactPersonMobile: '',
      contactPersonEmail: '',
      documentFile: ''
    });
  };
  const editCtoRow = (index) => {
    setEditingCtoIndex(index);
    setCurrentCtoRow(ctoRows[index]);
    setIsAddingCto(false);
  };
  const deleteCtoRow = (index) => {
    const rows = [...ctoRows];
    rows.splice(index, 1);
    setCtoRows(rows);
  };

  const handleCteProductionInput = (e) => {
    setCurrentCteProductionRow({ ...currentCteProductionRow, [e.target.name]: e.target.value });
  };
  const saveCteProductionRow = () => {
    if (!currentCteProductionRow.plantName || !currentCteProductionRow.productName || !currentCteProductionRow.maxCapacityPerYear) {
      alert('Please fill all fields (Plant Name, Product Name, Capacity)');
      return;
    }
    const rows = [...cteProductionRows];
    if (editingCteProductionIndex !== null) {
      rows[editingCteProductionIndex] = currentCteProductionRow;
    } else {
      rows.push(currentCteProductionRow);
    }
    setCteProductionRows(rows);
    setCurrentCteProductionRow({ plantName: '', productName: '', maxCapacityPerYear: '', uom: '' });
    setEditingCteProductionIndex(null);
    setIsAddingCteProduction(false);
  };
  const editCteProductionRow = (index) => {
    setEditingCteProductionIndex(index);
    setCurrentCteProductionRow(cteProductionRows[index]);
    setIsAddingCteProduction(true);
  };
  const deleteCteProductionRow = (index) => {
    const rows = [...cteProductionRows];
    rows.splice(index, 1);
    setCteProductionRows(rows);
  };

  const handleCtoProductInput = (e) => {
    setCurrentCtoProductRow({ ...currentCtoProductRow, [e.target.name]: e.target.value });
  };
  const saveCtoProductRow = () => {
    if (!currentCtoProductRow.productName || !currentCtoProductRow.quantity) {
      alert('Please fill all fields (Product Name, Quantity)');
      return;
    }
    const rows = [...ctoProductRows];
    if (editingCtoProductIndex !== null) {
      rows[editingCtoProductIndex] = currentCtoProductRow;
    } else {
      rows.push(currentCtoProductRow);
    }
    setCtoProductRows(rows);
    setCurrentCtoProductRow({ productName: '', quantity: '', uom: '' });
    setEditingCtoProductIndex(null);
    setIsAddingCtoProduct(false);
  };
  const editCtoProductRow = (index) => {
    setEditingCtoProductIndex(index);
    setCurrentCtoProductRow(ctoProductRows[index]);
    setIsAddingCtoProduct(true);
  };
  const deleteCtoProductRow = (index) => {
    const rows = [...ctoProductRows];
    rows.splice(index, 1);
    setCtoProductRows(rows);
  };

  const handleMsmeInput = (e) => {
    setCurrentMsmeRow({ ...currentMsmeRow, [e.target.name]: e.target.value });
  };

  const handleMsmeFile = (e) => {
    const file = e.target.files[0];
    if (file) {
        setCurrentMsmeRow({ ...currentMsmeRow, certificateFile: file });
    }
  };

  const saveMsmeRow = () => {
    if (!currentMsmeRow.udyamNumber) {
        alert('Udyam Number is required');
        return;
    }
    const rows = [...msmeRows];
    if (editingMsmeIndex !== null) {
        rows[editingMsmeIndex] = currentMsmeRow;
    } else {
        rows.push(currentMsmeRow);
    }
    setMsmeRows(rows);
    setCurrentMsmeRow({
        classificationYear: '',
        status: '',
        majorActivity: '',
        udyamNumber: '',
        turnover: '',
        certificateFile: null
    });
    setEditingMsmeIndex(null);
    setIsAddingMsme(false);
  };

  const editMsmeRow = (index) => {
    setEditingMsmeIndex(index);
    setCurrentMsmeRow(msmeRows[index]);
    setIsAddingMsme(false);
  };

  const deleteMsmeRow = (index) => {
    const rows = [...msmeRows];
    rows.splice(index, 1);
    setMsmeRows(rows);
  };

  const cancelMsmeEdit = () => {
    setIsAddingMsme(false);
    setEditingMsmeIndex(null);
    setCurrentMsmeRow({
        classificationYear: '',
        status: '',
        majorActivity: '',
        udyamNumber: '',
        turnover: '',
        certificateFile: null
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData({ ...formData, [name]: files[0] || null });
    setError('');
  };

  const isValidMobile = (value) => {
    const digits = (value || '').toString().replace(/\D/g, '');
    return digits.length === 10;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (
        !formData.clientName ||
        !formData.tradeName ||
        !formData.companyGroupName ||
        !formData.financialYear ||
        !formData.entityType ||
        !formData.authorisedPersonName ||
        !formData.authorisedPersonNumber ||
        !formData.authorisedPersonEmail ||
        !formData.coordinatingPersonName ||
        !formData.coordinatingPersonNumber ||
        !formData.coordinatingPersonEmail
      ) {
        setError('Please fill all required fields');
        return;
      }
      if (
        !isValidMobile(formData.authorisedPersonNumber) ||
        !isValidMobile(formData.coordinatingPersonNumber)
      ) {
        setError('Mobile numbers must be 10 digits');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
    setError('');
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (currentStep !== 4) {
      handleNext();
      return;
    }
    
    if (!allowSubmit) {
      return;
    }

    if (!confirm('Are you sure you want to update this client?')) {
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // 1. Upload Standard Documents
      const stdUploads = [];
      const addUpload = (file, type, number, date) => {
        if (!file) return;
        const fd = new FormData();
        fd.append('document', file);
        fd.append('documentType', type);
        fd.append('documentName', file.name);
        if (number) fd.append('certificateNumber', number);
        if (date) fd.append('certificateDate', date);
        stdUploads.push(api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(id), fd, { headers: { 'Content-Type': undefined } }));
      };
      addUpload(formData.gstFile, 'GST', formData.gst, formData.gstDate);
      addUpload(formData.cinFile, 'CIN', formData.cin, formData.cinDate);
      addUpload(formData.panFile, 'PAN', formData.pan, formData.panDate);
      addUpload(formData.factoryLicenseFile, 'Factory License', formData.factoryLicenseNo, formData.factoryLicenseDate);
      addUpload(formData.eprCertificateFile, 'EPR Certificate', formData.eprCertificateNo, formData.eprCertificateDate);
      
      await Promise.all(stdUploads);

      // 2. Upload CTE/CTO Documents
      const updatedCteRows = [...cteRows];
      const updatedCtoRows = [...ctoRows];

      const cteUploads = cteRows.map(async (row, idx) => {
        if (!row.documentFile || typeof row.documentFile === 'string') return null;
        const fd = new FormData();
        fd.append('document', row.documentFile);
        fd.append('documentType', 'CTE');
        fd.append('documentName', row.documentFile.name);
        if (row.consentNo) fd.append('certificateNumber', row.consentNo);
        if (row.issuedDate) fd.append('certificateDate', row.issuedDate);
        try {
          const res = await api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(id), fd, { headers: { 'Content-Type': undefined } });
          if (res.data.success) return { index: idx, url: res.data.data.filePath };
        } catch (err) { console.error('CTE Upload error', err); }
        return null;
      });

      const ctoUploads = ctoRows.map(async (row, idx) => {
        if (!row.documentFile || typeof row.documentFile === 'string') return null;
        const fd = new FormData();
        fd.append('document', row.documentFile);
        fd.append('documentType', 'CTO');
        fd.append('documentName', row.documentFile.name);
        if (row.consentOrderNo) fd.append('certificateNumber', row.consentOrderNo);
        if (row.dateOfIssue) fd.append('certificateDate', row.dateOfIssue);
        try {
          const res = await api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(id), fd, { headers: { 'Content-Type': undefined } });
          if (res.data.success) return { index: idx, url: res.data.data.filePath };
        } catch (err) { console.error('CTO Upload error', err); }
        return null;
      });

      // Upload MSME Documents
      const updatedMsmeRows = [...msmeRows];
      const msmeUploads = msmeRows.map(async (row, idx) => {
        if (!row.certificateFile || typeof row.certificateFile === 'string') return null;
        const fd = new FormData();
        fd.append('document', row.certificateFile);
        fd.append('documentType', 'Other');
        fd.append('documentName', `MSME_Cert_${row.udyamNumber}`);
        try {
            const res = await api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(id), fd, { headers: { 'Content-Type': undefined } });
            if (res.data.success) return { index: idx, url: res.data.data.filePath };
        } catch (err) { console.error('MSME Upload error', err); }
        return null;
      });

      const cteResults = await Promise.all(cteUploads);
      const ctoResults = await Promise.all(ctoUploads);
      const msmeResults = await Promise.all(msmeUploads);

      cteResults.forEach(res => { if (res) updatedCteRows[res.index] = { ...updatedCteRows[res.index], documentFile: res.url }; });
      ctoResults.forEach(res => { if (res) updatedCtoRows[res.index] = { ...updatedCtoRows[res.index], documentFile: res.url }; });
      msmeResults.forEach(res => { if (res) updatedMsmeRows[res.index] = { ...updatedMsmeRows[res.index], certificateFile: res.url }; });

      // 3. Update Client Data
      const clientData = {
        clientName: formData.clientName,
        tradeName: formData.tradeName,
        companyGroupName: formData.companyGroupName,
        financialYear: formData.financialYear,
        entityType: formData.entityType,
        authorisedPerson: {
            name: formData.authorisedPersonName,
            number: formData.authorisedPersonNumber,
            email: formData.authorisedPersonEmail
        },
        coordinatingPerson: {
            name: formData.coordinatingPersonName,
            number: formData.coordinatingPersonNumber,
            email: formData.coordinatingPersonEmail
        },
        // complianceContact and msmeContact removed from payload
        msmeDetails: updatedMsmeRows,
        contactPerson: {
          name: formData.contactPersonName,
          email: formData.contactPersonEmail,
          mobile: formData.contactPersonMobile,
          designation: formData.contactPersonDesignation,
        },
        companyDetails: {
          pan: formData.pan,
          cin: formData.cin,
          gst: formData.gst,
          udyamRegistration: formData.udyamRegistration,
          registeredAddress: formData.registeredAddress,
        },
        productionFacility: {
          facilityName: formData.facilityName || client?.productionFacility?.facilityName || '',
          state: formData.state || client?.productionFacility?.state || '',
          city: formData.city || client?.productionFacility?.city || '',
          address: formData.facilityAddress || client?.productionFacility?.address || '',
          cto: formData.cto || client?.productionFacility?.cto || '',
          cte: formData.cte || client?.productionFacility?.cte || '',
          cteDetailsList: updatedCteRows,
          ctoDetailsList: updatedCtoRows,
          cteProduction: cteProductionRows.map(r => ({ plantName: r.plantName || '', productName: r.productName, maxCapacityPerYear: r.maxCapacityPerYear })),
          ctoProducts: ctoProductRows.map(r => ({ plantName: r.plantName || '', productName: r.productName, quantity: r.quantity })),
          plantLocationNumber: client.productionFacility?.plantLocationNumber || '',
        },
      };

      const response = await api.put(API_ENDPOINTS.CLIENT.UPDATE(id), clientData);

      if (response.data.success) {
        setSuccess('Client updated successfully!');
        setTimeout(() => {
          navigate(`/dashboard/client/${id}`);
        }, 1500);
      } else {
        setError(response.data.message || 'Failed to update client');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
      setAllowSubmit(false);
    }
  };
  
  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter' && currentStep === 4) {
      e.preventDefault();
    }
  };

  const steps = [
    { number: 1, title: 'Client Basic Info', description: 'Legal & Trade Details', icon: 'fas fa-user' },
    { number: 2, title: 'Company Address Details', description: 'Registered & Communication', icon: 'fas fa-building' },
    { number: 3, title: 'Company Documents', description: 'GST, PAN, CIN, etc.', icon: 'fas fa-file-shield' },
    { number: 4, title: 'CTE & CTO/CCA', description: 'Consent Details', icon: 'fas fa-industry' },
  ];

  const resolveUrl = (p) => {
    if (!p) return '';
    if (typeof p !== 'string') return '';
    const isAbs = p.startsWith('http://') || p.startsWith('https://');
    return isAbs ? p : `${api.defaults.baseURL}/${p}`;
  };

  const handleViewDocument = (filePath, docType, docName) => {
    setViewerUrl(resolveUrl(filePath));
    setViewerName(docName || docType);
    setViewerOpen(true);
  };

  const formatDateToDdMmYyyy = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  };

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 w-full">
      <div className="w-full mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/dashboard/client/${id}`)}
              className="group flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-md transition-all hover:bg-primary-600 hover:text-white"
              title="Back to Client Details"
            >
              <i className="fas fa-arrow-left transition-transform group-hover:-translate-x-1"></i>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Edit Client</h1>
              <p className="text-sm text-gray-500">Update client information</p>
            </div>
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="mb-8">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex flex-col md:flex-row">
                    {steps.map((step, index) => {
                        const isCurrent = currentStep === step.number;
                        const isCompleted = currentStep > step.number;
                        
                        return (
                            <div key={step.number} className="flex-1 flex items-center relative group">
                                <button
                                    type="button"
                                    onClick={() => {
                                        // Allow navigating to any previous step or the current step
                                        if (step.number <= currentStep) {
                                            setCurrentStep(step.number);
                                        }
                                    }}
                                    disabled={step.number > currentStep}
                                    className={`flex-1 flex items-center px-4 py-4 transition-colors text-left w-full relative ${
                                        isCurrent ? 'bg-white' : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 text-sm font-bold transition-colors ${
                                        isCompleted 
                                            ? 'bg-primary-600 border-primary-600 text-white' 
                                            : isCurrent 
                                                ? 'border-primary-600 text-primary-600 bg-white' 
                                                : 'border-gray-300 text-gray-500 bg-white'
                                    }`}>
                                        {isCompleted ? (
                                            <i className="fas fa-check"></i>
                                        ) : (
                                            <span>{String(step.number).padStart(2, '0')}</span>
                                        )}
                                    </div>
                                    <div className="ml-3 hidden lg:block">
                                        <p className={`text-sm font-bold ${
                                            isCompleted || isCurrent ? 'text-primary-700' : 'text-gray-500'
                                        }`}>
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[120px]">
                                            {step.description}
                                        </p>
                                    </div>

                                    {/* Active Bottom Border */}
                                    {isCurrent && (
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-600"></div>
                                    )}
                                </button>
                                
                                {/* Chevron Separator (hidden for last item) */}
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block absolute right-0 top-1/2 transform -translate-y-1/2 z-10 text-gray-300">
                                        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 p-8">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trade Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="tradeName"
                    value={formData.tradeName}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Group Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="companyGroupName"
                    value={formData.companyGroupName}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Financial Year <span className="text-red-500">*</span></label>
                  <select
                    name="financialYear"
                    value={formData.financialYear}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select Financial Year</option>
                    <option value="2023-24">2023-24</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26">2025-26</option>
                    <option value="2026-27">2026-27</option>
                    <option value="2027-28">2027-28</option>
                    <option value="2028-29">2028-29</option>
                    <option value="2029-30">2029-30</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entity Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="entityType"
                    value={formData.entityType}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="">Select Entity Type</option>
                    <option value="Producer">Producer</option>
                    <option value="Brand Owner">Brand Owner</option>
                    <option value="Importer">Importer</option>
                    <option value="PWP">PWP</option>
                    <option value="Producer & Brand Owner">Producer & Brand Owner</option>
                  </select>
                </div>
              </div>
              
              {/* Authorised Person Details */}
              <div className="mt-6 border-t pt-4">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                   <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">
                     <i className="fas fa-user-tie"></i>
                   </span>
                   Authorised Person Details
                </h4>
                <div className="grid grid-cols-3 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                     <input type="text" name="authorisedPersonName" value={formData.authorisedPersonName} onChange={handleChange} className="input-field" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Number</label>
                    <input
                      type="text"
                      name="authorisedPersonNumber"
                      value={formData.authorisedPersonNumber}
                      onChange={handleChange}
                      maxLength={10}
                      className="input-field"
                      placeholder="10-digit mobile number"
                    />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                     <input type="email" name="authorisedPersonEmail" value={formData.authorisedPersonEmail} onChange={handleChange} className="input-field" />
                   </div>
                </div>
              </div>

              {/* Coordinating Person Details */}
              <div className="mt-6 border-t pt-4">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                   <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 text-sm">
                     <i className="fas fa-user-clock"></i>
                   </span>
                   Coordinating Person Details
                </h4>
                <div className="grid grid-cols-3 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                     <input type="text" name="coordinatingPersonName" value={formData.coordinatingPersonName} onChange={handleChange} className="input-field" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Number</label>
                    <input
                      type="text"
                      name="coordinatingPersonNumber"
                      value={formData.coordinatingPersonNumber}
                      onChange={handleChange}
                      maxLength={10}
                      className="input-field"
                      placeholder="10-digit mobile number"
                    />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                     <input type="email" name="coordinatingPersonEmail" value={formData.coordinatingPersonEmail} onChange={handleChange} className="input-field" />
                   </div>
                </div>
              </div>
            </div>


          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4">Company Address Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registered Address</label>
                  <textarea name="registeredAddress" value={formData.registeredAddress} onChange={handleChange} className="input-field" rows="3"></textarea>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Communication Address</label>
                  <textarea name="notes" value={formData.notes} onChange={handleChange} className="input-field" rows="3"></textarea>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white mr-4">
                  <i className="fas fa-file-shield text-xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Company Documents</h3>
              </div>
              
              <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                {/* Header Row - Visible on Desktop */}
                <div className="hidden md:grid grid-cols-12 gap-4 bg-gray-50 px-6 py-3 border-b text-sm font-semibold text-gray-700">
                  <div className="col-span-2">Document Type</div>
                  <div className="col-span-3">Certificate Number</div>
                  <div className="col-span-3">Date</div>
                  <div className="col-span-4">Upload/View Document</div>
                </div>

                <div className="divide-y divide-gray-100">
                  {/* GST Row */}
                  <div className="p-4 md:px-6 md:py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-800">GST Certificate</span>
                    </div>
                    <div className="md:col-span-3">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">GST Number</label>
                      <input 
                        type="text" 
                        name="gst" 
                        value={formData.gst} 
                        onChange={handleChange} 
                        className="input-field py-2" 
                        placeholder="GST Number" 
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Date</label>
                      <input 
                        type="date" 
                        name="gstDate" 
                        value={formData.gstDate} 
                        onChange={handleChange} 
                        className="input-field py-2" 
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Upload</label>
                      <div className="space-y-2">
                        <input 
                          type="file" 
                          name="gstFile" 
                          onChange={handleFileChange} 
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-all cursor-pointer" 
                        />
                        {(() => {
                           const doc = getLatestDoc(client?.documents, 'GST');
                           if (doc) return (
                             <div className="flex items-center gap-2">
                               <button type="button" onClick={() => handleViewDocument(doc.filePath, 'GST', 'GST_Certificate')} className="text-xs text-primary-600 hover:text-primary-800 underline">
                                 <i className="fas fa-eye mr-1"></i> View Current
                               </button>
                               <span className="text-xs text-gray-500">{formatDateToDdMmYyyy(doc.certificateDate)}</span>
                             </div>
                           );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* CIN Row */}
                  <div className="p-4 md:px-6 md:py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-800">CIN Document</span>
                    </div>
                    <div className="md:col-span-3">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">CIN Number</label>
                      <input 
                        type="text" 
                        name="cin" 
                        value={formData.cin} 
                        onChange={handleChange} 
                        className="input-field py-2" 
                        placeholder="CIN Number" 
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Date</label>
                      <input 
                        type="date" 
                        name="cinDate" 
                        value={formData.cinDate} 
                        onChange={handleChange} 
                        className="input-field py-2" 
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Upload</label>
                      <div className="space-y-2">
                        <input 
                          type="file" 
                          name="cinFile" 
                          onChange={handleFileChange} 
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-all cursor-pointer" 
                        />
                        {(() => {
                           const doc = getLatestDoc(client?.documents, 'CIN');
                           if (doc) return (
                             <div className="flex items-center gap-2">
                               <button type="button" onClick={() => handleViewDocument(doc.filePath, 'CIN', 'CIN_Document')} className="text-xs text-primary-600 hover:text-primary-800 underline">
                                <i className="fas fa-eye mr-1"></i> View Current
                              </button>
                               <span className="text-xs text-gray-500">{formatDateToDdMmYyyy(doc.certificateDate)}</span>
                             </div>
                           );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* PAN Row */}
                  <div className="p-4 md:px-6 md:py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-800">PAN Card</span>
                    </div>
                    <div className="md:col-span-3">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">PAN Number</label>
                      <input 
                        type="text" 
                        name="pan" 
                        value={formData.pan} 
                        onChange={handleChange} 
                        className="input-field py-2" 
                        placeholder="PAN Number" 
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Date</label>
                      <input 
                        type="date" 
                        name="panDate" 
                        value={formData.panDate} 
                        onChange={handleChange} 
                        className="input-field py-2" 
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Upload</label>
                      <div className="space-y-2">
                        <input 
                          type="file" 
                          name="panFile" 
                          onChange={handleFileChange} 
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-all cursor-pointer" 
                        />
                        {(() => {
                           const doc = getLatestDoc(client?.documents, 'PAN');
                           if (doc) return (
                             <div className="flex items-center gap-2">
                               <button type="button" onClick={() => handleViewDocument(doc.filePath, 'PAN', 'PAN_Document')} className="text-xs text-primary-600 hover:text-primary-800 underline">
                                <i className="fas fa-eye mr-1"></i> View Current
                              </button>
                               <span className="text-xs text-gray-500">{formatDateToDdMmYyyy(doc.certificateDate)}</span>
                             </div>
                           );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Factory License Row */}
                  <div className="p-4 md:px-6 md:py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-800">Factory License</span>
                    </div>
                    <div className="md:col-span-3">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">License Number</label>
                      <input 
                        type="text" 
                        name="factoryLicenseNo" 
                        value={formData.factoryLicenseNo} 
                        onChange={handleChange} 
                        className="input-field py-2" 
                        placeholder="License Number" 
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Date</label>
                      <input 
                        type="date" 
                        name="factoryLicenseDate" 
                        value={formData.factoryLicenseDate} 
                        onChange={handleChange} 
                        className="input-field py-2" 
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Upload</label>
                      <div className="space-y-2">
                        <input 
                          type="file" 
                          name="factoryLicenseFile" 
                          onChange={handleFileChange} 
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-all cursor-pointer" 
                        />
                        {(() => {
                           const doc = getLatestDoc(client?.documents, 'Factory License');
                           if (doc) return (
                             <div className="flex items-center gap-2">
                               <button type="button" onClick={() => handleViewDocument(doc.filePath, 'Factory License', 'Factory_License')} className="text-xs text-primary-600 hover:text-primary-800 underline">
                                <i className="fas fa-eye mr-1"></i> View Current
                              </button>
                               <span className="text-xs text-gray-500">{formatDateToDdMmYyyy(doc.certificateDate)}</span>
                             </div>
                           );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* EPR Certificate Row */}
                  <div className="p-4 md:px-6 md:py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-800">EPR Certificate</span>
                    </div>
                    <div className="md:col-span-3">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">EPR Certificate No</label>
                      <input 
                        type="text" 
                        name="eprCertificateNo" 
                        value={formData.eprCertificateNo} 
                        onChange={handleChange} 
                        className="input-field py-2" 
                        placeholder="EPR Number" 
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Date</label>
                      <input 
                        type="date" 
                        name="eprCertificateDate" 
                        value={formData.eprCertificateDate} 
                        onChange={handleChange} 
                        className="input-field py-2" 
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Upload</label>
                      <div className="space-y-2">
                        <input 
                          type="file" 
                          name="eprCertificateFile" 
                          onChange={handleFileChange} 
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-all cursor-pointer" 
                        />
                        {(() => {
                           const doc = getLatestDoc(client?.documents, 'EPR Certificate');
                           if (doc) return (
                             <div className="flex items-center gap-2">
                               <button type="button" onClick={() => handleViewDocument(doc.filePath, 'EPR Certificate', 'EPR_Certificate')} className="text-xs text-primary-600 hover:text-primary-800 underline">
                                <i className="fas fa-eye mr-1"></i> View Current
                              </button>
                               <span className="text-xs text-gray-500">{formatDateToDdMmYyyy(doc.certificateDate)}</span>
                             </div>
                           );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MSME Details (Merged from Tab 4) */}
              <div className="space-y-4 mt-8 pt-8 border-t">
                  <h3 className="text-xl font-bold mb-4">MSME Details</h3>
                  
                  <div className="flex items-center justify-between mb-3">
                    <button
                        type="button"
                        onClick={() => { setIsAddingMsme(true); setEditingMsmeIndex(null); }}
                        disabled={isAddingMsme || editingMsmeIndex !== null}
                        className="bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700 text-sm"
                    >
                        + Add Row
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="p-3 border-b text-sm font-semibold">Year</th>
                          <th className="p-3 border-b text-sm font-semibold">Status</th>
                          <th className="p-3 border-b text-sm font-semibold">Major Activity</th>
                          <th className="p-3 border-b text-sm font-semibold">Udyam Number</th>
                          <th className="p-3 border-b text-sm font-semibold">TurnOver (CR.)</th>
                          <th className="p-3 border-b text-sm font-semibold">Certificate</th>
                          <th className="p-3 border-b text-sm font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(isAddingMsme || editingMsmeIndex !== null) && (
                            <tr className="bg-primary-50">
                                <td className="p-3 border-b">
                                    <input type="text" name="classificationYear" value={currentMsmeRow.classificationYear} onChange={handleMsmeInput} className="w-full p-2 border rounded text-sm" placeholder="Year" />
                                </td>
                                <td className="p-3 border-b">
                                    <select name="status" value={currentMsmeRow.status} onChange={handleMsmeInput} className="w-full p-2 border rounded text-sm">
                                        <option value="">Select</option>
                                        <option value="Small">Small</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Large">Large</option>
                                    </select>
                                </td>
                                <td className="p-3 border-b">
                                    <select name="majorActivity" value={currentMsmeRow.majorActivity} onChange={handleMsmeInput} className="w-full p-2 border rounded text-sm">
                                        <option value="">Select</option>
                                        <option value="Manufacturing">Manufacturing</option>
                                        <option value="Services">Services</option>
                                        <option value="Trading">Trading</option>
                                    </select>
                                </td>
                                <td className="p-3 border-b">
                                    <input 
                                      type="text" 
                                      name="udyamNumber" 
                                      value={currentMsmeRow.udyamNumber} 
                                      onChange={handleMsmeInput} 
                                      className="w-full p-2 border rounded text-sm" 
                                      placeholder="Udyam No." 
                                      disabled={currentMsmeRow.status === 'Large'}
                                    />
                                </td>
                                <td className="p-3 border-b">
                                    <input type="text" name="turnover" value={currentMsmeRow.turnover} onChange={handleMsmeInput} className="w-full p-2 border rounded text-sm" placeholder="Turnover" />
                                </td>
                                <td className="p-3 border-b">
                                    <input type="file" name="certificateFile" onChange={handleMsmeFile} className="w-full text-xs" />
                                </td>
                                <td className="p-3 border-b">
                                    <div className="flex gap-2">
                                        <button type="button" onClick={saveMsmeRow} className="bg-primary-600 text-white px-2 py-1 rounded text-xs hover:bg-primary-700">Save</button>
                                        <button type="button" onClick={cancelMsmeEdit} className="bg-gray-400 text-white px-2 py-1 rounded text-xs hover:bg-gray-500">Cancel</button>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {msmeRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 border-b">
                            <td className="p-3">{row.classificationYear}</td>
                            <td className="p-3">{row.status}</td>
                            <td className="p-3">{row.majorActivity}</td>
                            <td className="p-3">{row.udyamNumber}</td>
                            <td className="p-3">{row.turnover}</td>
                            <td className="p-3">
                              {row.certificateFile ? (
                                <button type="button" onClick={() => handleViewDocument(row.certificateFile, 'MSME Certificate', `MSME_${row.udyamNumber}`)} className="text-primary-600 hover:underline">View</button>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-3">
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => editMsmeRow(idx)} className="text-primary-600 hover:text-primary-800 text-sm"><i className="fas fa-edit"></i></button>
                                    <button type="button" onClick={() => deleteMsmeRow(idx)} className="text-red-600 hover:text-red-800 text-sm"><i className="fas fa-trash"></i></button>
                                </div>
                            </td>
                          </tr>
                        ))}
                        {msmeRows.length === 0 && !isAddingMsme && (
                          <tr><td colSpan="7" className="p-6 text-center text-gray-400">No MSME details</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
              </div>
            </div>
          )}



          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
                  <span className="font-semibold text-gray-700 flex items-center gap-2">
                    <i className="fas fa-industry text-primary-600"></i>
                    CTE Details
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => { setIsAddingCte(true); setEditingCteIndex(null); }}
                    disabled={isAddingCte || editingCteIndex !== null}
                    className="bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700 text-sm"
                  >
                    + Add Row
                  </button>
                </div>
                <div className="overflow-x-auto border rounded-xl max-w-[calc(100vw-22rem)]">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="p-3 border-b text-sm font-semibold">Plant Name</th>
                        <th className="p-3 border-b text-sm font-semibold">Consent No</th>
                        <th className="p-3 border-b text-sm font-semibold">Category</th>
                        <th className="p-3 border-b text-sm font-semibold">Issued Date</th>
                        <th className="p-3 border-b text-sm font-semibold">Valid Upto</th>
                        <th className="p-3 border-b text-sm font-semibold">Plant Location</th>
                        <th className="p-3 border-b text-sm font-semibold">Plant Address</th>
                        <th className="p-3 border-b text-sm font-semibold">Factory Head</th>
                        <th className="p-3 border-b text-sm font-semibold">Contact Person</th>
                        <th className="p-3 border-b text-sm font-semibold">Document</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isAddingCte || editingCteIndex !== null) && (
                        <tr className="bg-primary-50">
                          <td className="p-3 border-b"><input type="text" name="plantName" value={currentCteRow.plantName} onChange={handleCteInput} className="w-full p-2 border rounded text-sm" /></td>
                          <td className="p-3 border-b"><input type="text" name="consentNo" value={currentCteRow.consentNo} onChange={handleCteInput} className="w-full p-2 border rounded text-sm" /></td>
                          <td className="p-3 border-b"><input type="text" name="category" value={currentCteRow.category} onChange={handleCteInput} className="w-full p-2 border rounded text-sm" /></td>
                          <td className="p-3 border-b"><input type="date" name="issuedDate" value={currentCteRow.issuedDate} onChange={handleCteInput} className="w-full p-2 border rounded text-sm" /></td>
                          <td className="p-3 border-b"><input type="date" name="validUpto" value={currentCteRow.validUpto} onChange={handleCteInput} className="w-full p-2 border rounded text-sm" /></td>
                          <td className="p-3 border-b"><input type="text" name="plantLocation" value={currentCteRow.plantLocation} onChange={handleCteInput} className="w-full p-2 border rounded text-sm" /></td>
                          <td className="p-3 border-b"><input type="text" name="plantAddress" value={currentCteRow.plantAddress} onChange={handleCteInput} className="w-full p-2 border rounded text-sm" /></td>
                          <td className="p-3 border-b">
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" name="factoryHeadName" value={currentCteRow.factoryHeadName} onChange={handleCteInput} className="p-2 border rounded text-sm" placeholder="Name" />
                              <input type="text" name="factoryHeadDesignation" value={currentCteRow.factoryHeadDesignation} onChange={handleCteInput} className="p-2 border rounded text-sm" placeholder="Designation" />
                              <input type="text" name="factoryHeadMobile" value={currentCteRow.factoryHeadMobile} onChange={handleCteInput} maxLength={10} className="p-2 border rounded text-sm" placeholder="Mobile" />
                              <input type="email" name="factoryHeadEmail" value={currentCteRow.factoryHeadEmail} onChange={handleCteInput} className="p-2 border rounded text-sm" placeholder="Email" />
                            </div>
                          </td>
                          <td className="p-3 border-b">
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" name="contactPersonName" value={currentCteRow.contactPersonName} onChange={handleCteInput} className="p-2 border rounded text-sm" placeholder="Name" />
                              <input type="text" name="contactPersonDesignation" value={currentCteRow.contactPersonDesignation} onChange={handleCteInput} className="p-2 border rounded text-sm" placeholder="Designation" />
                              <input type="text" name="contactPersonMobile" value={currentCteRow.contactPersonMobile} onChange={handleCteInput} maxLength={10} className="p-2 border rounded text-sm" placeholder="Mobile" />
                              <input type="email" name="contactPersonEmail" value={currentCteRow.contactPersonEmail} onChange={handleCteInput} className="p-2 border rounded text-sm" placeholder="Email" />
                            </div>
                          </td>
                          <td className="p-3 border-b">
                            <div className="flex flex-col gap-2">
                              <input 
                                type="file" 
                                onChange={handleCteFile} 
                                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-all cursor-pointer" 
                              />
                              <div className="flex gap-2">
                                <button type="button" onClick={saveCteRow} className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700">Save</button>
                                <button type="button" onClick={cancelCteEdit} className="bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">Cancel</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {cteRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 border-b">
                          <td className="p-3">{r.plantName}</td>
                          <td className="p-3">{r.consentNo}</td>
                          <td className="p-3">{r.category}</td>
                          <td className="p-3">{formatDateToDdMmYyyy(r.issuedDate)}</td>
                          <td className="p-3">{formatDateToDdMmYyyy(r.validUpto)}</td>
                          <td className="p-3">{r.plantLocation}</td>
                          <td className="p-3 whitespace-normal min-w-[200px]">{r.plantAddress}</td>
                          <td className="p-3">
                            <div className="text-sm">
                              <div className="font-medium">{r.factoryHeadName}</div>
                              <div className="text-gray-500">{r.factoryHeadDesignation}</div>
                              <div className="text-gray-500">{r.factoryHeadMobile}</div>
                              <div className="text-gray-500">{r.factoryHeadEmail}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              <div className="font-medium">{r.contactPersonName}</div>
                              <div className="text-gray-500">{r.contactPersonDesignation}</div>
                              <div className="text-gray-500">{r.contactPersonMobile}</div>
                              <div className="text-gray-500">{r.contactPersonEmail}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {r.documentFile ? (
                                typeof r.documentFile === 'string' ? (
                                  <button type="button" onClick={() => handleViewDocument(r.documentFile, 'CTE Document', `CTE_${r.consentNo}`)} className="text-primary-600 hover:underline">View</button>
                                ) : (
                                  <span className="text-sm text-gray-600 truncate max-w-[100px]" title={r.documentFile.name}>{r.documentFile.name}</span>
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                              <button type="button" onClick={() => editCteRow(idx)} className="text-primary-600 hover:text-primary-800 text-sm"><i className="fas fa-edit"></i> Edit</button>
                              <button type="button" onClick={() => deleteCteRow(idx)} className="text-red-600 hover:text-red-800 text-sm"><i className="fas fa-trash"></i> Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {cteRows.length === 0 && !isAddingCte && (
                        <tr><td colSpan="9" className="p-6 text-center text-gray-400">No CTE details</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow duration-300 mt-4">
              <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
                <span className="font-semibold text-gray-700 flex items-center gap-2">
                  <i className="fas fa-industry text-primary-600"></i>
                  CTE Production
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => { setIsAddingCteProduction(true); setEditingCteProductionIndex(null); }}
                    disabled={isAddingCteProduction || editingCteProductionIndex !== null}
                    className="bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700 text-sm"
                  >
                    + Add Row
                  </button>
                </div>
                <div className="overflow-x-auto border rounded-xl max-w-[calc(100vw-22rem)]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="p-3 border-b text-sm font-semibold">Plant Name</th>
                        <th className="p-3 border-b text-sm font-semibold">Product Name</th>
                        <th className="p-3 border-b text-sm font-semibold">Max Capacity / Year</th>
                        <th className="p-3 border-b text-sm font-semibold">UOM</th>
                        <th className="p-3 border-b text-sm font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isAddingCteProduction || editingCteProductionIndex !== null) && (
                        <tr className="bg-primary-50">
                          <td className="p-3 border-b">
                            <select name="plantName" value={currentCteProductionRow.plantName} onChange={handleCteProductionInput} className="w-full p-2 border rounded text-sm">
                              <option value="">Select Plant</option>
                              {cteRows.filter(r => r.plantName).map((r, i) => (
                                <option key={i} value={r.plantName}>{r.plantName}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 border-b"><input type="text" name="productName" value={currentCteProductionRow.productName} onChange={handleCteProductionInput} className="w-full p-2 border rounded text-sm" placeholder="Product Name" /></td>
                          <td className="p-3 border-b"><input type="text" name="maxCapacityPerYear" value={currentCteProductionRow.maxCapacityPerYear} onChange={handleCteProductionInput} className="w-full p-2 border rounded text-sm" placeholder="Max Capacity" /></td>
                          <td className="p-3 border-b">
                            <select name="uom" value={currentCteProductionRow.uom} onChange={handleCteProductionInput} className="w-full p-2 border rounded text-sm">
                                <option value="">Select UOM</option>
                                <option value="MT/Year">MT/Year</option>
                                <option value="KG/Year">KG/Year</option>
                                <option value="Units/Year">Units/Year</option>
                            </select>
                          </td>
                          <td className="p-3 border-b">
                            <div className="flex gap-2">
                              <button type="button" onClick={saveCteProductionRow} className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700">Save</button>
                              <button type="button" onClick={() => { setIsAddingCteProduction(false); setEditingCteProductionIndex(null); }} className="bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">Cancel</button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {cteProductionRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 border-b">
                          <td className="p-3">{r.plantName}</td>
                          <td className="p-3">{r.productName}</td>
                          <td className="p-3">{r.maxCapacityPerYear}</td>
                          <td className="p-3">{r.uom || '-'}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => editCteProductionRow(idx)} className="text-primary-600 hover:text-primary-800 text-sm"><i className="fas fa-edit"></i> Edit</button>
                              <button type="button" onClick={() => deleteCteProductionRow(idx)} className="text-red-600 hover:text-red-800 text-sm"><i className="fas fa-trash"></i> Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {cteProductionRows.length === 0 && !isAddingCteProduction && (
                        <tr><td colSpan="5" className="p-6 text-center text-gray-400">No CTE production details</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
                  <span className="font-semibold text-gray-700 flex items-center gap-2">
                    <i className="fas fa-industry text-primary-600"></i>
                    CTO/CCA Details
                  </span>
                </div>
                <div className="p-6 overflow-x-auto max-w-[calc(100vw-22rem)]">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => { setIsAddingCto(true); setEditingCtoIndex(null); }}
                    disabled={isAddingCto || editingCtoIndex !== null}
                    className="bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700 text-sm"
                  >
                    + Add Row
                  </button>
                </div>
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="p-3 border-b text-sm font-semibold">Plant Name</th>
                      <th className="p-3 border-b text-sm font-semibold">Consent Order No</th>
                      <th className="p-3 border-b text-sm font-semibold">Date of Issue</th>
                      <th className="p-3 border-b text-sm font-semibold">Valid Upto</th>
                      <th className="p-3 border-b text-sm font-semibold">Plant Location</th>
                      <th className="p-3 border-b text-sm font-semibold">Plant Address</th>
                      <th className="p-3 border-b text-sm font-semibold">Factory Head</th>
                      <th className="p-3 border-b text-sm font-semibold">Contact Person</th>
                      <th className="p-3 border-b text-sm font-semibold">Document</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isAddingCto || editingCtoIndex !== null) && (
                      <tr className="bg-primary-50">
                          <td className="p-3 border-b"><input type="text" name="consentOrderNo" value={currentCtoRow.consentOrderNo} onChange={handleCtoInput} className="w-full p-2 border rounded text-sm" /></td>
                          <td className="p-3 border-b"><input type="date" name="dateOfIssue" value={currentCtoRow.dateOfIssue} onChange={handleCtoInput} className="w-full p-2 border rounded text-sm" /></td>
                          <td className="p-3 border-b"><input type="date" name="validUpto" value={currentCtoRow.validUpto} onChange={handleCtoInput} className="w-full p-2 border rounded text-sm" /></td>
                          <td className="p-3 border-b"><input type="text" name="plantLocation" value={currentCtoRow.plantLocation} onChange={handleCtoInput} className="w-full p-2 border rounded text-sm" /></td>
                          <td className="p-3 border-b"><input type="text" name="plantAddress" value={currentCtoRow.plantAddress} onChange={handleCtoInput} className="w-full p-2 border rounded text-sm" /></td>
                          <td className="p-3 border-b">
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" name="factoryHeadName" value={currentCtoRow.factoryHeadName} onChange={handleCtoInput} className="p-2 border rounded text-sm" placeholder="Name" />
                              <input type="text" name="factoryHeadDesignation" value={currentCtoRow.factoryHeadDesignation} onChange={handleCtoInput} className="p-2 border rounded text-sm" placeholder="Designation" />
                              <input type="text" name="factoryHeadMobile" value={currentCtoRow.factoryHeadMobile} onChange={handleCtoInput} maxLength={10} className="p-2 border rounded text-sm" placeholder="Mobile" />
                              <input type="email" name="factoryHeadEmail" value={currentCtoRow.factoryHeadEmail} onChange={handleCtoInput} className="p-2 border rounded text-sm" placeholder="Email" />
                            </div>
                          </td>
                          <td className="p-3 border-b">
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" name="contactPersonName" value={currentCtoRow.contactPersonName} onChange={handleCtoInput} className="p-2 border rounded text-sm" placeholder="Name" />
                              <input type="text" name="contactPersonDesignation" value={currentCtoRow.contactPersonDesignation} onChange={handleCtoInput} className="p-2 border rounded text-sm" placeholder="Designation" />
                              <input type="text" name="contactPersonMobile" value={currentCtoRow.contactPersonMobile} onChange={handleCtoInput} maxLength={10} className="p-2 border rounded text-sm" placeholder="Mobile" />
                              <input type="email" name="contactPersonEmail" value={currentCtoRow.contactPersonEmail} onChange={handleCtoInput} className="p-2 border rounded text-sm" placeholder="Email" />
                            </div>
                          </td>
                          <td className="p-3 border-b">
                            <div className="flex flex-col gap-2">
                              <input 
                                type="file" 
                                onChange={handleCtoFile} 
                                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-all cursor-pointer" 
                              />
                              <div className="flex gap-2">
                                <button type="button" onClick={saveCtoRow} className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700">Save</button>
                                <button type="button" onClick={cancelCtoEdit} className="bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">Cancel</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {ctoRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 border-b">
                          <td className="p-3">{r.plantName}</td>
                          <td className="p-3">{r.consentOrderNo}</td>
                          <td className="p-3">{formatDateToDdMmYyyy(r.dateOfIssue)}</td>
                          <td className="p-3">{formatDateToDdMmYyyy(r.validUpto)}</td>
                          <td className="p-3">{r.plantLocation}</td>
                          <td className="p-3 whitespace-normal min-w-[200px]">{r.plantAddress}</td>
                          <td className="p-3">
                            <div className="text-sm">
                              <div className="font-medium">{r.factoryHeadName}</div>
                              <div className="text-gray-500">{r.factoryHeadDesignation}</div>
                              <div className="text-gray-500">{r.factoryHeadMobile}</div>
                              <div className="text-gray-500">{r.factoryHeadEmail}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              <div className="font-medium">{r.contactPersonName}</div>
                              <div className="text-gray-500">{r.contactPersonDesignation}</div>
                              <div className="text-gray-500">{r.contactPersonMobile}</div>
                              <div className="text-gray-500">{r.contactPersonEmail}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {r.documentFile ? (
                                typeof r.documentFile === 'string' ? (
                                  <button type="button" onClick={() => handleViewDocument(r.documentFile, 'CTO Document', `CTO_${r.consentOrderNo}`)} className="text-primary-600 hover:underline">View</button>
                                ) : (
                                  <span className="text-sm text-gray-600 truncate max-w-[100px]" title={r.documentFile.name}>{r.documentFile.name}</span>
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                              <button type="button" onClick={() => editCtoRow(idx)} className="text-primary-600 hover:text-primary-800 text-sm"><i className="fas fa-edit"></i> Edit</button>
                              <button type="button" onClick={() => deleteCtoRow(idx)} className="text-red-600 hover:text-red-800 text-sm"><i className="fas fa-trash"></i> Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {ctoRows.length === 0 && !isAddingCto && (
                        <tr><td colSpan="9" className="p-6 text-center text-gray-400">No CTO/CCA details</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow duration-300 mt-4">
              <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
                <span className="font-semibold text-gray-700 flex items-center gap-2">
                  <i className="fas fa-industry text-primary-600"></i>
                  CTO/CCA Products
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => { setIsAddingCtoProduct(true); setEditingCtoProductIndex(null); }}
                    disabled={isAddingCtoProduct || editingCtoProductIndex !== null}
                    className="bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700 text-sm"
                  >
                    + Add Row
                  </button>
                </div>
                <div className="overflow-x-auto border rounded-xl max-w-[calc(100vw-22rem)]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="p-3 border-b text-sm font-semibold">Plant Name</th>
                        <th className="p-3 border-b text-sm font-semibold">Product Name</th>
                        <th className="p-3 border-b text-sm font-semibold">Quantity</th>
                        <th className="p-3 border-b text-sm font-semibold">UOM</th>
                        <th className="p-3 border-b text-sm font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isAddingCtoProduct || editingCtoProductIndex !== null) && (
                        <tr className="bg-primary-50">
                          <td className="p-3 border-b">
                            <select name="plantName" value={currentCtoProductRow.plantName} onChange={handleCtoProductInput} className="w-full p-2 border rounded text-sm">
                              <option value="">Select Plant</option>
                              {ctoRows.filter(r => r.plantName).map((r, i) => (
                                <option key={i} value={r.plantName}>{r.plantName}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 border-b"><input type="text" name="productName" value={currentCtoProductRow.productName} onChange={handleCtoProductInput} className="w-full p-2 border rounded text-sm" placeholder="Product Name" /></td>
                          <td className="p-3 border-b"><input type="text" name="quantity" value={currentCtoProductRow.quantity} onChange={handleCtoProductInput} className="w-full p-2 border rounded text-sm" placeholder="Quantity" /></td>
                          <td className="p-3 border-b">
                            <select name="uom" value={currentCtoProductRow.uom} onChange={handleCtoProductInput} className="w-full p-2 border rounded text-sm">
                                <option value="">Select UOM</option>
                                <option value="MT">MT</option>
                                <option value="KG">KG</option>
                                <option value="Units">Units</option>
                            </select>
                          </td>
                          <td className="p-3 border-b">
                            <div className="flex gap-2">
                              <button type="button" onClick={saveCtoProductRow} className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700">Save</button>
                              <button type="button" onClick={() => { setIsAddingCtoProduct(false); setEditingCtoProductIndex(null); }} className="bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">Cancel</button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {ctoProductRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 border-b">
                          <td className="p-3">{r.plantName}</td>
                          <td className="p-3">{r.productName}</td>
                          <td className="p-3">{r.quantity}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => editCtoProductRow(idx)} className="text-primary-600 hover:text-primary-800 text-sm"><i className="fas fa-edit"></i> Edit</button>
                              <button type="button" onClick={() => deleteCtoProductRow(idx)} className="text-red-600 hover:text-red-800 text-sm"><i className="fas fa-trash"></i> Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {ctoProductRows.length === 0 && !isAddingCtoProduct && (
                        <tr><td colSpan="5" className="p-6 text-center text-gray-400">No CTO/CCA product details</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={handlePrevious}
              className="btn-secondary"
              disabled={currentStep === 1}
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Previous
            </button>

            {currentStep < 4 ? (
              <button type="button" onClick={handleNext} className="btn-primary">
                Next
                <i className="fas fa-arrow-right ml-2"></i>
              </button>
            ) : (
              <button type="submit" disabled={loading} onClick={() => setAllowSubmit(true)} className="btn-primary">
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Update Client
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      <DocumentViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        documentUrl={viewerUrl}
        documentName={viewerName}
      />
    </div>
  );
};

export default EditClient;
