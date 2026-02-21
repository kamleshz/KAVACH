import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  FaCheckCircle, 
  FaSpinner, 
  FaFileContract, 
  FaUser, 
  FaMapMarkerAlt, 
  FaFileInvoice,
  FaIndustry,
  FaCheck,
  FaCommentAlt,
  FaArrowLeft,
  FaFilePdf,
  FaCheckDouble,
  FaPencilAlt,
  FaListAlt,
  FaFolderOpen,
  FaFile,
  FaEye,
  FaBuilding
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import DocumentViewerModal from '../components/DocumentViewerModal';

const ClientValidation = ({ clientId: propClientId, embedded = false, onComplete }) => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  
  const id = propClientId || paramId;
  const _onComplete = typeof onComplete === 'function' ? onComplete : null;
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(1);
  const [verificationState, setVerificationState] = useState({});
  const [verificationRemarks, setVerificationRemarks] = useState({});
  const [activeRemarkId, setActiveRemarkId] = useState(null);
  const [tempRemark, setTempRemark] = useState('');
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [engagementContent, setEngagementContent] = useState('');
  const [isEditingLetter, setIsEditingLetter] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  
  // Document Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerName, setViewerName] = useState('');

  useEffect(() => {
    fetchClientDetails();
  }, [id]);

  const getDefaultEngagementLetter = (c) => {
    return `AnantTattva Private Limited
Office No.12 & 14, Midas Building
Sahar Plaza JB Nagar,
Next to J B Nagar Metro Chakala,
Andheri East, Mumbai - 400059
info@ananttattva.com

Date:  ___ / ___ / 20__

ENGAGEMENT LETTER
To,
${c.clientName}
${c.companyDetails?.registeredAddress || '[Address]'}

Dear Sir / Madam,
We are pleased to confirm our engagement to conduct [Internal / Statutory / Compliance / EPR / GST] Audit of ${c.clientName} for the period [Audit Period].
The audit will be carried out on a test-check basis in accordance with applicable professional standards. Management is responsible for providing complete and accurate records and necessary information required for the audit.
Upon completion, we shall issue an Audit Report containing our observations and recommendations, if any.
All information obtained during the audit shall be treated as confidential.
Our professional fees shall be ₹ [Amount] plus applicable taxes, payable as agreed.
Kindly acknowledge your acceptance of this engagement by signing below.

Thanking you,
Yours faithfully,
For AnantTattva Private Limited
Authorized Signatory
Name: _______________
Designation: _________

Accepted & Agreed
For ${c.clientName}
Signature: _______________
Date: ___________________`;
  };

  const fetchClientDetails = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CLIENT.GET_BY_ID(id), { params: { _: Date.now() } });
      if (response.data.success) {
        const c = response.data.data;
        setClient(c);
        if (c.validationDetails?.verificationProgress) {
            setVerificationState(c.validationDetails.verificationProgress);
        }
        if (c.validationDetails?.verificationRemarks) {
            setVerificationRemarks(c.validationDetails.verificationRemarks);
        }
        setEngagementContent(c.validationDetails?.engagementLetterContent || getDefaultEngagementLetter(c));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch client details');
    } finally {
      setLoading(false);
    }
  };

  const saveEngagementLetter = async () => {
    try {
      const payload = {
          "validationDetails.engagementLetterContent": engagementContent
      };
      const response = await api.put(API_ENDPOINTS.CLIENT.UPDATE(id), payload);
      if (response.data.success) {
          setIsEditingLetter(false);
          // Optional: Show a success message (could add a toast later)
      }
    } catch (error) {
      console.error("Failed to save letter", error);
      alert("Failed to save engagement letter content.");
    }
  };

  const uploadEngagementLetterPDF = async () => {
    if (!engagementContent) return;
    
    try {
        setLoading(true);
        // 1. Generate PDF
        const doc = new jsPDF();
        doc.setFontSize(12);
        // Simple header
        doc.setFont("helvetica", "bold");
        doc.text("ENGAGEMENT LETTER", 105, 20, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        
        const splitText = doc.splitTextToSize(engagementContent, 170);
        let yPos = 30;
        
        splitText.forEach(line => {
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(line, 20, yPos);
            yPos += 5;
        });
        
        const pdfBlob = doc.output('blob');
        
        // 2. Upload
        const formData = new FormData();
        formData.append('document', pdfBlob, 'Engagement_Letter.pdf');
        formData.append('documentType', 'Engagement Letter');
        formData.append('documentName', 'Engagement Letter PDF');
        
        const response = await api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(id), formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
            alert('Engagement Letter PDF uploaded successfully!');
            try {
              await api.put(API_ENDPOINTS.CLIENT.UPDATE(id), {
                "validationDetails.engagementLetterContent": engagementContent
              });
            } catch (saveErr) {
              console.error("Failed to persist engagement content after PDF upload", saveErr);
            }
            fetchClientDetails(); // Refresh to show in documents list
        }
    } catch (err) {
        console.error("Failed to upload engagement letter PDF", err);
        alert("Failed to upload PDF: " + (err.response?.data?.message || err.message));
    } finally {
        setLoading(false);
    }
  };

  const openRemarkModal = (key) => {
    setActiveRemarkId(key);
    setTempRemark(verificationRemarks[key] || '');
    setIsRemarkModalOpen(true);
  };

  const saveRemark = async () => {
    if (!activeRemarkId) return;
    
    try {
        const newRemarks = { ...verificationRemarks, [activeRemarkId]: tempRemark };
        setVerificationRemarks(newRemarks);
        
        // Persist immediately
        await api.put(API_ENDPOINTS.CLIENT.UPDATE(id), {
            "validationDetails.verificationRemarks": newRemarks
        });
        
        setIsRemarkModalOpen(false);
        setActiveRemarkId(null);
        setTempRemark('');
        toast.success("Remark saved");
    } catch (err) {
        console.error("Failed to save remark", err);
        toast.error("Failed to save remark");
    }
  };

  const toggleVerification = (key) => {
    setVerificationState(prev => {
      const newState = { ...prev, [key]: !prev[key] };
      
      // Persist to backend
      api.put(API_ENDPOINTS.CLIENT.UPDATE(id), {
          "validationDetails.verificationProgress": newState
      }).catch(err => {
          console.error("Failed to save verification state", err);
          toast.error("Failed to save verification status");
      });

      return newState;
    });
  };

  const isVerified = (key) => !!verificationState[key];
  const isTabComplete = (num) => {
    if (!client) return false;
    if (num === 1) {
      return isVerified('tab1_engagement');
    }
    if (num === 2) {
      return ['tab2_overview', 'tab2_auth_person', 'tab2_coord_person'].every(k => isVerified(k));
    }
    if (num === 3) {
      return isVerified('tab3_address');
    }
    if (num === 4) {
      const isEwaste = client.wasteType === 'E-Waste' || client.wasteType === 'E_WASTE';
      const requiredDocs = ['PAN', 'GST', 'CIN'];
      if (!isEwaste) {
          requiredDocs.push('Factory License', 'EPR Certificate');
      } else {
          requiredDocs.push('E-waste Registration');
          if (client.isImportingEEE === 'Yes' || client.isImportingEEE === true) {
              requiredDocs.push('EEE Import Authorization');
          }
      }
      // Only verify documents that are relevant to the client type
      const docs = (client.documents || []).filter(d => requiredDocs.includes(d.documentType) || d.documentType === 'Engagement Letter');
      
      const docsOk = docs.length > 0 ? docs.every((_, i) => isVerified(`doc_${i}`)) : false;
      const msmeLen = (client.msmeDetails || []).length;
      const msmeOk = msmeLen > 0 ? isVerified('tab4_msme') : true;
      return docsOk && msmeOk;
    }
    if (num === 5) {
      const cte = client.productionFacility?.cteDetailsList || [];
      const cto = client.productionFacility?.ctoDetailsList || [];
      const plantGroups = {};
      const normalize = (name) => name ? name.trim().toLowerCase() : '';
      const processData = (list, keyName) => {
        (list || []).forEach(item => {
          const pName = item.plantName;
          if (!pName) return;
          const norm = normalize(pName);
          if (!plantGroups[norm]) {
            plantGroups[norm] = { displayName: pName, cteDetails: [], ctoDetails: [] };
          }
          plantGroups[norm][keyName].push(item);
        });
      };
      processData(cte, 'cteDetails');
      processData(cto, 'ctoDetails');
      const sortedGroups = Object.values(plantGroups).sort((a, b) => a.displayName.localeCompare(b.displayName));
      if (sortedGroups.length === 0) return false;
      let allOk = true;
      let hasCto = false;
      sortedGroups.forEach((group, pIdx) => {
        group.cteDetails.forEach((_, idx) => {
          if (!isVerified(`cte_${pIdx}_${idx}`)) allOk = false;
        });
        group.ctoDetails.forEach((_, idx) => {
          hasCto = true;
          if (!isVerified(`cto_${pIdx}_${idx}`)) allOk = false;
        });
      });

      if (hasCto) {
          if (!isVerified('cto_additional_details')) allOk = false;
          if (!isVerified('cto_regulations')) allOk = false;
          const regs = Array.isArray(client.productionFacility?.regulationsCoveredUnderCto) ? client.productionFacility.regulationsCoveredUnderCto : [];
          const needsWater = regs.includes('Water');
          const needsAir = regs.includes('Air');
          const needsHazardousWaste = regs.some((r) => {
              const lower = (r || '').toString().trim().toLowerCase();
              return lower === 'hazardous waste' || lower === 'hazardous wate';
          });
          if (needsWater && !isVerified('cto_water')) allOk = false;
          if (needsAir && !isVerified('cto_air')) allOk = false;
          if (needsHazardousWaste && !isVerified('cto_hazardous')) allOk = false;
      }
      return allOk;
    }
    return false;
  };

  const generateValidationPDF = (clientData, validationDetails) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    if (engagementContent) {
        doc.setFillColor(240, 253, 244);
        doc.rect(0, 0, pageWidth, 30, 'F');
        doc.setFontSize(16);
        doc.setTextColor(22, 101, 52);
        doc.setFont("helvetica", "bold");
        doc.text("ENGAGEMENT LETTER", pageWidth / 2, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "normal");

        const splitText = doc.splitTextToSize(engagementContent, 170);
        let cursorY = 40;
        splitText.forEach(line => {
            if (cursorY > 280) {
                doc.addPage();
                doc.setFontSize(10);
                doc.setTextColor(40, 40, 40);
                doc.setFont("helvetica", "normal");
                cursorY = 20;
            }
            doc.text(line, 20, cursorY);
            cursorY += 5;
        });

        doc.addPage();
        yPos = 20;
    }

    // --- Modern Header ---
    doc.setFillColor(240, 253, 244); // Light green background
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(22, 101, 52); // Dark green
    doc.setFont("helvetica", "bold");
    doc.text("AnantTattva Private Limited", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text("Pre-validation Report", pageWidth / 2, 30, { align: "center" });
    
    yPos = 50;

    // --- Client Info Summary Box ---
    doc.setDrawColor(200);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'S');
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Client Name:", 20, yPos + 8);
    doc.text("Report Date:", 120, yPos + 8);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(clientData.clientName, 20, yPos + 15);
    doc.text(new Date().toLocaleDateString(), 120, yPos + 15);
    
    yPos += 35;

    // --- Section 1: Basic Info ---
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74);
    doc.setFont("helvetica", "bold");
    doc.text("1. Client Information", 20, yPos);
    doc.setLineWidth(0.5);
    doc.setDrawColor(22, 163, 74);
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 10;
    
    const basicInfoData = [
        ['Trade Name', clientData.tradeName || 'N/A'],
        ['Group Name', clientData.companyGroupName || 'N/A'],
        ['Entity Type', clientData.entityType],
        ['Auth. Person', `${clientData.authorisedPerson?.name || 'N/A'} (${clientData.authorisedPerson?.designation || ''})`],
        ['Auth. Contact', `${clientData.authorisedPerson?.number || ''} / ${clientData.authorisedPerson?.email || ''}`],
        ['Coord. Person', `${clientData.coordinatingPerson?.name || 'N/A'}`],
        ['Coord. Contact', `${clientData.coordinatingPerson?.number || ''} / ${clientData.coordinatingPerson?.email || ''}`],
    ];

    autoTable(doc, {
        startY: yPos,
        body: basicInfoData,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', width: 50, textColor: [80, 80, 80] } },
    });
    yPos = doc.lastAutoTable.finalY + 15;

    // --- Section 2: Address ---
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74);
    doc.text("2. Address Details", 20, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 10;
    
    const addressData = [
        ['Registered Address', clientData.companyDetails?.registeredAddress || 'N/A'],
        ['Communication Address', clientData.companyDetails?.communicationAddress || 'Same as Registered']
    ];
    autoTable(doc, {
        startY: yPos,
        body: addressData,
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', width: 50, textColor: [80, 80, 80] } },
    });
    yPos = doc.lastAutoTable.finalY + 15;

    // --- Section 3: MSME ---
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74);
    doc.text("3. MSME Details", 20, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 10;
    
    const msmeData = [
        ['MSME Status', validationDetails?.msmeDetails ? 'Verified' : 'Pending/NA'],
        ['MSME No.', clientData.companyDetails?.msmeNumber || 'N/A'],
        ['Enterprise Type', clientData.companyDetails?.enterpriseType || 'N/A'],
    ];
    autoTable(doc, {
        startY: yPos,
        body: msmeData,
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', width: 50, textColor: [80, 80, 80] } },
    });
    yPos = doc.lastAutoTable.finalY + 10;

    const msmeList = (clientData.msmeDetails || []).map(m => [
        m.classificationYear || '-',
        m.status || '-',
        m.majorActivity || '-',
        m.udyamNumber || '-',
        m.turnover || '-'
    ]);

    if (msmeList.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(60);
        doc.text("MSME History", 20, yPos);
        yPos += 5;
        
        autoTable(doc, {
            startY: yPos,
            head: [['Year', 'Status', 'Activity', 'Udyam No.', 'Turnover']],
            body: msmeList,
            theme: 'grid',
            headStyles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: 'bold' },
            styles: { fontSize: 9 },
        });
        yPos = doc.lastAutoTable.finalY + 15;
    }

    // --- Section 4: Documents ---
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74);
    doc.text("4. Company Documents", 20, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 10;

    const isEwaste = clientData.wasteType === 'E-Waste' || clientData.wasteType === 'E_WASTE';
    // Define what to show based on waste type
    const showDocs = ['PAN', 'GST', 'CIN'];
    if (!isEwaste) {
        showDocs.push('Factory License', 'EPR Certificate');
    } else {
        showDocs.push('E-waste Registration', 'EEE Import Authorization');
    }

    // FILTER OUT Engagement Letter and irrelevant docs
    const docRows = (clientData.documents || [])
        .filter(d => d.documentType !== 'Engagement Letter' && showDocs.includes(d.documentType))
        .map(d => [d.documentType, d.certificateNumber || 'N/A', 'Uploaded']);
        
    if (docRows.length === 0) docRows.push(['No documents uploaded', '-', '-']);

    autoTable(doc, {
        startY: yPos,
        head: [['Document Type', 'Certificate Number', 'Status']],
        body: docRows,
        theme: 'grid',
        headStyles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: 'bold' },
        styles: { fontSize: 9 },
    });
    yPos = doc.lastAutoTable.finalY + 15;

    // --- Section 5: Plant Details (CTE/CTO) ---
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74);
    doc.text("5. Plant & Consent Details", 20, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 10;

    const plantRows = [];
    const cteList = clientData.productionFacility?.cteDetailsList || [];
    const ctoList = clientData.productionFacility?.ctoDetailsList || [];
    
    // Group by plant name roughly
    const plants = [...new Set([...cteList.map(i=>i.plantName), ...ctoList.map(i=>i.plantName)])];
    
    plants.forEach(plant => {
        // Group Header Row
        plantRows.push([{ content: `Plant: ${plant || 'Unknown'}`, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]);
        
        const ctes = cteList.filter(i => i.plantName === plant);
        const ctos = ctoList.filter(i => i.plantName === plant);
        
        ctes.forEach(c => {
             const issue = c.issuedDate ? new Date(c.issuedDate).toLocaleDateString() : '-';
             const valid = c.validUpto ? new Date(c.validUpto).toLocaleDateString() : '-';
             plantRows.push(['CTE', c.consentNo || '-', issue, valid, c.plantLocation || '-']);
             if (c.plantAddress) {
                plantRows.push([{ content: `Address: ${c.plantAddress}`, colSpan: 5, styles: { fontSize: 8, textColor: 100, fontStyle: 'italic' } }]);
             }
        });
        ctos.forEach(c => {
             const issue = c.dateOfIssue ? new Date(c.dateOfIssue).toLocaleDateString() : '-';
             const valid = c.validUpto ? new Date(c.validUpto).toLocaleDateString() : '-';
             plantRows.push(['CTO', c.consentOrderNo || '-', issue, valid, c.plantLocation || '-']);
             if (c.plantAddress) {
                plantRows.push([{ content: `Address: ${c.plantAddress}`, colSpan: 5, styles: { fontSize: 8, textColor: 100, fontStyle: 'italic' } }]);
             }
        });
        if (ctes.length === 0 && ctos.length === 0) {
            plantRows.push(['No Consents Found', '-', '-', '-', '-']);
        }
    });
    
    if (plantRows.length === 0) plantRows.push(['No Plant Details Available', '', '', '', '']);

    autoTable(doc, {
        startY: yPos,
        head: [['Type', 'Consent No', 'Issue Date', 'Valid Upto', 'Location']],
        body: plantRows,
        theme: 'grid',
        headStyles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: 'bold' },
        styles: { fontSize: 9 },
    });
    yPos = doc.lastAutoTable.finalY + 15;

    // --- Footer ---
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.line(20, 280, 190, 280);
        doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: "right" });
        doc.text("AnantTattva EPR Kavach System", 20, 285, { align: "left" });
    }

    doc.save(`${clientData.clientName}_Pre_validation_Report.pdf`);
  };

  const handleConfirmComplete = async () => {
    try {
        setLoading(true);
        const response = await api.put(API_ENDPOINTS.CLIENT.UPDATE(id), {
            clientStatus: 'AUDIT'
        });
        
        if (response.data.success) {
            toast.success("Validation Completed! Moving to Audit Stage.", { theme: "colored" });
            setIsCompleteModalOpen(false);
            
            if (_onComplete) {
                _onComplete();
            } else {
                // Reload to reflect status change in parent (AddClient) if no callback provided
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        }
    } catch (err) {
        console.error("Failed to complete verification", err);
        toast.error(err.response?.data?.message || 'Failed to update status', { theme: "colored" });
    } finally {
        setLoading(false);
    }
  };

  const handleCompleteValidation = async () => {
    if (!client) return;

    try {
      setLoading(true);

      // 1. Engagement Letter
      const engagementLetter = isVerified('tab1_engagement');

      // 2. Basic Info
      const basicInfo = isVerified('tab2_overview') && isVerified('tab2_auth_person') && isVerified('tab2_coord_person');
      
      // 3. Address
      const addressDetails = isVerified('tab3_address');

      // 4. Documents
      // For E-Waste, check for E-Waste Registration and Import Authorization if applicable
      const isEwaste = client.wasteType === 'E-Waste' || client.wasteType === 'E_WASTE';
      const requiredDocs = ['PAN', 'GST', 'CIN'];
      if (!isEwaste) {
          requiredDocs.push('Factory License'); // Plastic specific
          requiredDocs.push('EPR Certificate'); // Plastic specific
      } else {
          requiredDocs.push('E-waste Registration'); // E-Waste specific
          if (client.isImportingEEE === 'Yes' || client.isImportingEEE === true) {
              requiredDocs.push('EEE Import Authorization');
          }
      }

      const docs = (client.documents || []).filter(d => requiredDocs.includes(d.documentType));
      // Relaxed check: if no docs found but required, it fails. If docs found, all must be verified.
      // Better: Check if ALL required docs are present AND verified.
      // For now, sticking to "Verify whatever is uploaded" + "At least some docs uploaded" logic from before, 
      // but filtered by relevant types.
      const companyDocuments = docs.length === 0 ? false : docs.every((_, i) => isVerified(`doc_${i}`));

      // 5. MSME
      const msmeDetails = isVerified('tab4_msme');

      // 5. CTE/CTO
      // Re-create grouping logic to match render indices
      const plantGroups = {};
      const normalize = (name) => name ? name.trim().toLowerCase() : '';
      const processData = (list, keyName) => {
          (list || []).forEach(item => {
              const pName = item.plantName;
              if (!pName) return;
              const norm = normalize(pName);
              if (!plantGroups[norm]) {
                  plantGroups[norm] = { displayName: pName, cteDetails: [], ctoDetails: [] };
              }
              plantGroups[norm][keyName].push(item);
          });
      };
      processData(client.productionFacility?.cteDetailsList, 'cteDetails');
      processData(client.productionFacility?.ctoDetailsList, 'ctoDetails');
      const sortedGroups = Object.values(plantGroups).sort((a, b) => a.displayName.localeCompare(b.displayName));

      let cteVerified = true;
      let ctoVerified = true;
      let hasCte = false;
      let hasCto = false;
      const verifiedItemIds = [];

      sortedGroups.forEach((group, pIdx) => {
          if (group.cteDetails.length > 0) hasCte = true;
          group.cteDetails.forEach((item, idx) => {
              if (!isVerified(`cte_${pIdx}_${idx}`)) {
                  cteVerified = false;
              } else {
                  if (item._id) verifiedItemIds.push(item._id);
              }
          });

          if (group.ctoDetails.length > 0) hasCto = true;
          group.ctoDetails.forEach((item, idx) => {
              if (!isVerified(`cto_${pIdx}_${idx}`)) {
                  ctoVerified = false;
              } else {
                  if (item._id) verifiedItemIds.push(item._id);
              }
          });
      });

      if (!hasCte) cteVerified = false; // or true if N/A? Let's say false if missing but technically not applicable
      if (!hasCto) ctoVerified = false;

      const regs = Array.isArray(client.productionFacility?.regulationsCoveredUnderCto) ? client.productionFacility.regulationsCoveredUnderCto : [];
      const needsWater = regs.includes('Water');
      const needsAir = regs.includes('Air');
      const needsHazardousWaste = regs.some((r) => {
          const lower = (r || '').toString().trim().toLowerCase();
          return lower === 'hazardous waste' || lower === 'hazardous wate';
      });
      const ctoAdditionalDetails = hasCto ? isVerified('cto_additional_details') : true;
      const ctoRegulations = hasCto ? isVerified('cto_regulations') : true;
      const ctoWater = hasCto ? (!needsWater || isVerified('cto_water')) : true;
      const ctoAir = hasCto ? (!needsAir || isVerified('cto_air')) : true;
      const ctoHazardous = hasCto ? (!needsHazardousWaste || isVerified('cto_hazardous')) : true;

      // Overall Status
      const isComplete = engagementLetter && basicInfo && addressDetails && companyDocuments && msmeDetails && 
                         (!hasCte || cteVerified) && (!hasCto || ctoVerified) &&
                         ctoAdditionalDetails && ctoRegulations && ctoWater && ctoAir && ctoHazardous;
                         
      const validationStatus = isComplete ? 'Verified' : 'In Progress';

      const payload = {
        validationStatus,
        verifiedItemIds,
        validationDetails: {
            engagementLetter,
            basicInfo,
            addressDetails,
            companyDocuments,
            msmeDetails,
            cteDetails: hasCte ? cteVerified : false,
            ctoDetails: hasCto ? ctoVerified : false,
            ctoAdditionalDetails,
            ctoRegulations,
            ctoWater,
            ctoAir,
            ctoHazardous,
            verificationProgress: verificationState,
            remarks: 'Validation completed via dashboard.'
        }
      };
      
      const response = await api.put(API_ENDPOINTS.CLIENT.VALIDATE(id), payload);
      
      if (response.data.success) {
            if (isComplete) {
                try {
                    generateValidationPDF(client, payload.validationDetails);
                } catch (pdfErr) {
                    console.error("PDF Generation failed", pdfErr);
                }
            }
            alert(isComplete ? 'Validation completed successfully! Report downloaded.' : 'Validation progress saved (In Progress).');
            
            if (embedded) {
                if (isComplete && _onComplete) {
                    _onComplete();
                }
            } else {
                navigate('/dashboard/clients');
            }
        }
    } catch (err) {
      console.error(err);
      alert('Failed to save validation status.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        {!embedded && (
          <button
            onClick={() => navigate('/dashboard/clients')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Back to Clients
          </button>
        )}
      </div>
    );
  }

  if (!client) return null;

  const resolveUrl = (p) => {
    if (!p) return '';
    const isAbs = p.startsWith('http://') || p.startsWith('https://');
    return isAbs ? p : `${api.defaults.baseURL}/${p}`;
  };

  const handleViewDocument = (filePath, docType, docName) => {
    setViewerUrl(resolveUrl(filePath));
    setViewerName(docName || docType);
    setViewerOpen(true);
  };

  const tabs = [
    { number: 1, title: 'Engagement Letter', description: 'Agreement & Terms', icon: <FaFileContract /> },
    { number: 2, title: 'Client Basic Info', description: 'Legal & Trade Details', icon: <FaUser /> },
    { number: 3, title: 'Company Address', description: 'Registered & Communication', icon: <FaMapMarkerAlt /> },
    { number: 4, title: 'Company Documents', description: 'GST, PAN, CIN, etc.', icon: <FaFileInvoice /> },
    { number: 5, title: 'CTE & CTO/CCA', description: 'Consent Details', icon: <FaIndustry /> }
  ];

  const VerifyButton = ({ id, label = "Verify" }) => (
    <div className="flex items-center gap-1 ml-4">
        <button
            onClick={() => toggleVerification(id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                isVerified(id)
                ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
            }`}
        >
            {isVerified(id) ? <FaCheckCircle /> : <FaCheck />}
            {isVerified(id) ? 'Verified' : label}
        </button>
        <button
            onClick={() => openRemarkModal(id)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                verificationRemarks[id] 
                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
            title={verificationRemarks[id] || "Add Remark"}
        >
            <FaCommentAlt className="text-xs" />
        </button>
    </div>
  );

  const renderEngagementLetter = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    
    // Find split points for signatures
    const leftSigIndex = lines.findIndex(l => l.trim().startsWith('Thanking you') || l.trim().startsWith('Yours faithfully'));
    const rightSigIndex = lines.findIndex(l => l.trim().startsWith('Accepted & Agreed'));

    const canSplit = leftSigIndex !== -1 && rightSigIndex !== -1 && leftSigIndex < rightSigIndex;
    
    const bodyLines = canSplit ? lines.slice(0, leftSigIndex) : lines;
    const leftSigLines = canSplit ? lines.slice(leftSigIndex, rightSigIndex) : [];
    const rightSigLines = canSplit ? lines.slice(rightSigIndex) : [];
    
    let section = 'header';
    
    return (
        <div className="text-gray-800 leading-relaxed w-full" style={{ fontFamily: "'Nunito', sans-serif", WebkitFontSmoothing: "antialiased" }}>
            {bodyLines.map((line, i) => {
                const trimmed = line.trim();
                
                // Heuristic: First line is Firm Name
                if (i === 0) {
                    return <div key={i} className="text-center text-2xl font-bold uppercase tracking-wide mb-1">{line}</div>;
                }
                
                if (trimmed.startsWith('Date:')) {
                    section = 'date';
                    return <div key={i} className="text-right my-6"><p>{line}</p></div>;
                }
                
                if (section === 'header') {
                     return <div key={i} className="text-center text-sm font-semibold text-gray-600 uppercase">{line}</div>;
                }

                if (trimmed === 'ENGAGEMENT LETTER') {
                    return <h3 key={i} className="text-xl font-bold text-center underline decoration-2 underline-offset-4 my-8">{line}</h3>;
                }

                if (!trimmed) {
                    return <div key={i} className="h-4"></div>;
                }
                
                // To block
                if (trimmed === 'To,') {
                     return <div key={i} className="font-bold mt-6">{line}</div>;
                }
                
                // Fallback for linear signature if can't split
                if (!canSplit && (trimmed.startsWith('Thanking you') || trimmed.startsWith('Yours faithfully') || trimmed.startsWith('Accepted & Agreed'))) {
                     return <div key={i} className="mt-8">{line}</div>;
                }
                 
                if (!canSplit && trimmed.startsWith('For ')) {
                     return <div key={i} className="font-bold mt-1">{line}</div>;
                }

                return <div key={i} className="text-justify">{line}</div>;
            })}

            {canSplit && (
                <div className="mt-16 grid grid-cols-2 gap-12 items-start">
                    <div>
                        {leftSigLines.map((line, i) => {
                             const trimmed = line.trim();
                             if (!trimmed) return <div key={i} className="h-4"></div>;
                             return <div key={i} className={trimmed.startsWith('For ') ? 'font-bold mt-4' : ''}>{line}</div>
                        })}
                    </div>
                    <div>
                        {rightSigLines.map((line, i) => {
                             const trimmed = line.trim();
                             if (!trimmed) return <div key={i} className="h-4"></div>;
                             return <div key={i} className={trimmed.startsWith('For ') ? 'font-bold mt-4' : ''}>{line}</div>
                        })}
                    </div>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className={embedded ? "p-0" : "p-6"}>
      {!embedded && (
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/clients')}
            className="group flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-md transition-all hover:bg-primary-600 hover:text-white"
            title="Back to Clients"
          >
            <FaArrowLeft className="transition-transform group-hover:-translate-x-1" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Validate: {client.clientName}</h1>
            <p className="text-sm text-gray-500">Verify client details and documents</p>
            {client.validationDetails?.validatedBy && (
              <p className="text-sm text-green-600 mt-1 font-medium">
                <FaCheckCircle className="mr-1 inline" />
                Verified by: {client.validationDetails.validatedBy.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
            <button
                onClick={() => generateValidationPDF(client, client.validationDetails || {})}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold shadow-md"
            >
                <FaFilePdf />
                Download Report
            </button>
            <button
                onClick={handleCompleteValidation}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-semibold shadow-md"
            >
                <FaCheckDouble />
                Complete Validation
            </button>
        </div>
      </div>
      )}

      <div className={`bg-white rounded-lg shadow-md ${embedded ? "border-0 shadow-none" : "p-6"}`}>
        {/* Tabs */}
        <div className="mb-8">
            <div className="bg-gray-100 p-1.5 rounded-lg">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => {
                        const isCurrent = activeTab === tab.number;
                        const verified = isTabComplete(tab.number);
                        return (
                            <button
                                key={tab.number}
                                onClick={() => setActiveTab(tab.number)}
                                className={`
                                    flex-1 flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-all min-w-[140px]
                                    ${isCurrent 
                                        ? 'bg-white text-gray-800 shadow-sm border border-gray-200' 
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                    }
                                `}
                            >
                                <span className={isCurrent ? "font-bold" : ""}>{tab.title}</span>
                                {verified && (
                                    <FaCheckCircle className="ml-2 text-green-500 text-lg" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="animate-fadeIn">
          {activeTab === 1 && (
            <div className="w-full mx-auto">
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                  <span className="font-semibold text-gray-700 flex items-center gap-2">
                    <FaFileContract className="text-primary-600" />
                    Engagement Letter
                  </span>
                  <div className="flex items-center gap-2">
                    {!isEditingLetter && (
                        <button 
                            onClick={uploadEngagementLetterPDF}
                            className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 mr-2 flex items-center gap-1"
                            title="Save as PDF to Documents"
                        >
                            <FaFilePdf />
                            Save as PDF
                        </button>
                    )}
                    {isEditingLetter ? (
                        <>
                            <button 
                                onClick={saveEngagementLetter}
                                className="px-3 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700"
                            >
                                Save
                            </button>
                            <button 
                                onClick={() => setIsEditingLetter(false)}
                                className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => setIsEditingLetter(true)}
                            className="text-gray-400 hover:text-primary-600 transition-colors"
                            title="Edit Content"
                        >
                            <FaPencilAlt />
                        </button>
                    )}
                    <VerifyButton id="tab1_engagement" />
                  </div>
                </div>
                {isEditingLetter ? (
                    <div className="p-6">
                        <textarea
                            value={engagementContent}
                            onChange={(e) => setEngagementContent(e.target.value)}
                            className="w-full h-[600px] p-4 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Enter engagement letter content..."
                        />
                    </div>
                ) : (
                    <div className="p-8 md:p-12">
                        {renderEngagementLetter(engagementContent)}
                    </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 2 && (
            <div className="w-full mx-auto">
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                  <span className="font-semibold text-gray-700 flex items-center gap-2">
                    <FaListAlt className="text-primary-600" />
                    Overview
                  </span>
                  <VerifyButton id="tab2_overview" />
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                    <div className="flex items-center">
                      <span className="w-48 text-gray-600 font-medium">Client Name:</span>
                      <span className="text-gray-900">{client.clientName}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-gray-600 font-medium">Trade Name:</span>
                      <span className="text-gray-900">{client.tradeName || 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-gray-600 font-medium">Company Group Name:</span>
                      <span className="text-gray-900">{client.companyGroupName || 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-gray-600 font-medium">
                          {(client.wasteType === 'E-Waste' || client.wasteType === 'E_WASTE') ? 'Producer Type:' : 'Entity Type:'}
                      </span>
                      <span className="text-gray-900">
                          {(client.wasteType === 'E-Waste' || client.wasteType === 'E_WASTE') ? (client.producerType || 'N/A') : client.entityType}
                      </span>
                    </div>
                  </div>

                  {/* Authorised Person Details */}
                  <div className="mt-8">
                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide text-primary-700">
                        Authorised Person Details
                        </h4>
                        <VerifyButton id="tab2_auth_person" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                      <div className="flex">
                        <span className="w-48 text-gray-600 font-medium">Name:</span>
                        <span className="text-gray-900">{client.authorisedPerson?.name || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-gray-600 font-medium">Contact Number:</span>
                        <span className="text-gray-900">{client.authorisedPerson?.number || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-gray-600 font-medium">Email:</span>
                        <span className="text-gray-900">{client.authorisedPerson?.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Coordinating Person Details */}
                  <div className="mt-8">
                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide text-primary-700">
                        Coordinating Person Details
                        </h4>
                        <VerifyButton id="tab2_coord_person" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                      <div className="flex">
                        <span className="w-48 text-gray-600 font-medium">Name:</span>
                        <span className="text-gray-900">{client.coordinatingPerson?.name || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-gray-600 font-medium">Contact Number:</span>
                        <span className="text-gray-900">{client.coordinatingPerson?.number || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-gray-600 font-medium">Email:</span>
                        <span className="text-gray-900">{client.coordinatingPerson?.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="w-full mx-auto space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                  <span className="font-semibold text-gray-700 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-primary-600" />
                    Company Address Details
                  </span>
                  <VerifyButton id="tab3_address" />
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Registered Address</p>
                      <p className="text-gray-900">{client.companyDetails?.registeredAddress || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Communication Address</p>
                      <p className="text-gray-900">{client.notes || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 4 && (
            <div className="w-full mx-auto">
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
                  <span className="font-semibold text-gray-700 flex items-center gap-2">
                    <FaFileInvoice className="text-primary-600" />
                    Company Documents
                  </span>
                </div>
                <div className="p-6 space-y-3">
                  {(() => {
                      const isEwaste = client.wasteType === 'E-Waste' || client.wasteType === 'E_WASTE';
                      const requiredDocs = ['PAN', 'GST', 'CIN'];
                      if (!isEwaste) {
                          requiredDocs.push('Factory License', 'EPR Certificate');
                      } else {
                          requiredDocs.push('E-waste Registration');
                          if (client.isImportingEEE === 'Yes' || client.isImportingEEE === true) {
                              requiredDocs.push('EEE Import Authorization');
                          }
                      }
                      
                      const relevantDocs = (client.documents || []).filter(d => requiredDocs.includes(d.documentType));
                      
                      if (relevantDocs.length === 0) {
                          return (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border">
                              <FaFolderOpen className="text-gray-300 text-4xl mb-3 mx-auto" />
                              <p className="text-gray-500 text-sm">No required certificates uploaded for {isEwaste ? 'E-Waste' : 'Plastic Waste'}</p>
                            </div>
                          );
                      }

                      return relevantDocs.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 border rounded-lg p-4">
                        <div className="flex items-center gap-4">
                          <FaFile className="text-primary-600 text-xl" />
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{doc.documentType}</p>
                            <p className="text-xs text-gray-600">
                              Number: {doc.certificateNumber || 'N/A'} • Date: {doc.certificateDate ? new Date(doc.certificateDate).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                            onClick={() => handleViewDocument(doc.filePath, doc.documentType, doc.documentType)}
                            className="px-3 py-1.5 bg-white text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors text-sm flex items-center gap-1"
                            >
                            <FaEye className="text-xs" />
                            View
                            </button>
                            <VerifyButton id={`doc_${i}`} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                
                {/* MSME Details */}
                <div className="px-6 pb-6 border-t pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide text-primary-700">
                        MSME Details
                        </h4>
                        <VerifyButton id="tab4_msme" />
                    </div>
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-center border-collapse whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-700">
                          <tr>
                            <th className="p-3 border-b text-sm font-semibold">Year</th>
                            <th className="p-3 border-b text-sm font-semibold">Status</th>
                            <th className="p-3 border-b text-sm font-semibold">Major Activity</th>
                            <th className="p-3 border-b text-sm font-semibold">Udyam Number</th>
                            <th className="p-3 border-b text-sm font-semibold">TurnOver (CR.)</th>
                            <th className="p-3 border-b text-sm font-semibold">Certificate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(client.msmeDetails || []).map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 border-b">
                              <td className="p-3">{row.classificationYear}</td>
                              <td className="p-3">{row.status}</td>
                              <td className="p-3">{row.majorActivity}</td>
                              <td className="p-3">{row.udyamNumber}</td>
                              <td className="p-3">{row.turnover}</td>
                              <td className="p-3">
                                {row.certificateFile ? (
                                  <button onClick={() => handleViewDocument(row.certificateFile, 'MSME Certificate', `MSME_${row.udyamNumber}`)} className="text-primary-600 hover:underline">View</button>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {(client.msmeDetails || []).length === 0 && (
                            <tr><td colSpan="6" className="p-6 text-center text-gray-400">No MSME details</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 5 && (
            <div className="w-full mx-auto space-y-8">
              {(() => {
                const pf = client.productionFacility || {};
                const plantGroups = {};
                const normalize = (name) => name ? name.trim().toLowerCase() : '';

                const processData = (list, keyName) => {
                    (list || []).forEach(item => {
                        const pName = item.plantName;
                        if (!pName) return;
                        const norm = normalize(pName);
                        if (!plantGroups[norm]) {
                            plantGroups[norm] = { 
                                displayName: pName,
                                cteDetails: [], 
                                ctoDetails: []
                            };
                        }
                        plantGroups[norm][keyName].push(item);
                    });
                };

                processData(client.productionFacility?.cteDetailsList, 'cteDetails');
                processData(client.productionFacility?.ctoDetailsList, 'ctoDetails');

                const sortedGroups = Object.values(plantGroups).sort((a, b) => a.displayName.localeCompare(b.displayName));

                if (sortedGroups.length === 0) {
                    return (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="bg-gray-50 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
                                <FaIndustry className="text-3xl text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No Plant Details Found</h3>
                            <p className="text-gray-500 mt-1">There are no CTE or CTO/CCA details available for any plant.</p>
                        </div>
                    );
                }

                const regs = Array.isArray(pf.regulationsCoveredUnderCto) ? pf.regulationsCoveredUnderCto : [];
                const hasWater = regs.includes('Water');
                const waterRegs = Array.isArray(pf.waterRegulations) ? pf.waterRegulations : [];
                const hasAir = regs.includes('Air');
                const airRegs = Array.isArray(pf.airRegulations) ? pf.airRegulations : [];
                const hasHazardousWaste = regs.some((r) => {
                    const lower = (r || '').toString().trim().toLowerCase();
                    return lower === 'hazardous waste' || lower === 'hazardous wate';
                });
                const hazardousRegs = Array.isArray(pf.hazardousWasteRegulations) ? pf.hazardousWasteRegulations : [];

                return (
                    <>
                        {sortedGroups.map((group, pIdx) => {
                            const { displayName: plantName, cteDetails, ctoDetails } = group;

                            return (
                                <div key={pIdx} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-8">
                                    <div className="px-6 py-5 border-b bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                                                <FaBuilding className="text-xl" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">{plantName}</h3>
                                                <p className="text-xs text-gray-500">Plant Unit</p>
                                            </div>
                                        </div>
                                        <VerifyButton id={`plant_${pIdx}`} />
                                    </div>

                                    <div className="p-6 space-y-8">
                                        {/* CTE Details Section */}
                                        {cteDetails.length > 0 && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                                                        <h4 className="font-bold text-gray-800">CTE Details</h4>
                                                    </div>
                                                </div>

                                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                                            <tr>
                                                                <th className="p-3 font-semibold border-b">Consent No</th>
                                                                <th className="p-3 font-semibold border-b">Dates</th>
                                                                <th className="p-3 font-semibold border-b">Location & Address</th>
                                                                <th className="p-3 font-semibold border-b">Document</th>
                                                                <th className="p-3 font-semibold border-b text-center">Verify</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="text-sm divide-y divide-gray-100">
                                                            {cteDetails.map((r, idx) => (
                                                                <tr key={idx} className="hover:bg-gray-50">
                                                                    <td className="p-3 font-medium text-gray-900">
                                                                        {r.consentNo}
                                                                    </td>
                                                                    <td className="p-3 text-gray-600">
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="text-xs">Issued: {r.issuedDate ? new Date(r.issuedDate).toLocaleDateString() : '-'}</span>
                                                                            <span className="text-xs">Valid: {r.validUpto ? new Date(r.validUpto).toLocaleDateString() : '-'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 max-w-xs">
                                                                        <div className="font-medium text-gray-900 mb-1">{r.plantLocation}</div>
                                                                        <div className="text-xs text-gray-500 leading-relaxed line-clamp-2" title={r.plantAddress}>{r.plantAddress}</div>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        {r.documentFile ? (
                                                                            <button onClick={() => handleViewDocument(r.documentFile, 'CTE Document', `CTE_${r.consentNo}`)} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                                                                                <FaEye className="mr-1" /> View
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-gray-400 text-xs italic">No Doc</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        <VerifyButton id={`cte_${pIdx}_${idx}`} label="OK" />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* CTO Details Section */}
                                        {ctoDetails.length > 0 && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-1 bg-purple-500 rounded-full"></div>
                                                        <h4 className="font-bold text-gray-800">CTO Details</h4>
                                                    </div>
                                                </div>

                                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                                            <tr>
                                                                <th className="p-3 font-semibold border-b">CTO/CCA Type</th>
                                                                <th className="p-3 font-semibold border-b">Industry Type</th>
                                                                <th className="p-3 font-semibold border-b">Category</th>
                                                                <th className="p-3 font-semibold border-b">Consent Order No</th>
                                                                <th className="p-3 font-semibold border-b">Dates</th>
                                                                <th className="p-3 font-semibold border-b">Location & Address</th>
                                                                <th className="p-3 font-semibold border-b">Document</th>
                                                                <th className="p-3 font-semibold border-b text-center">Verify</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="text-sm divide-y divide-gray-100">
                                                            {ctoDetails.map((r, idx) => (
                                                                <tr key={idx} className="hover:bg-gray-50">
                                                                    <td className="p-3 font-medium text-gray-900">{r.ctoCaaType || '-'}</td>
                                                                    <td className="p-3 text-gray-700">{r.industryType || '-'}</td>
                                                                    <td className="p-3 text-gray-700">{r.category || '-'}</td>
                                                                    <td className="p-3 font-medium text-gray-900">
                                                                        {r.consentOrderNo}
                                                                    </td>
                                                                    <td className="p-3 text-gray-600">
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="text-xs">Issued: {r.dateOfIssue ? new Date(r.dateOfIssue).toLocaleDateString() : '-'}</span>
                                                                            <span className="text-xs">Valid: {r.validUpto ? new Date(r.validUpto).toLocaleDateString() : '-'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 max-w-xs">
                                                                        <div className="font-medium text-gray-900 mb-1">{r.plantLocation}</div>
                                                                        <div className="text-xs text-gray-500 leading-relaxed line-clamp-2" title={r.plantAddress}>{r.plantAddress}</div>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        {r.documentFile ? (
                                                                            <button onClick={() => handleViewDocument(r.documentFile, 'CTO Document', `CTO_${r.consentOrderNo}`)} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                                                                                <FaEye className="mr-1" /> View
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-gray-400 text-xs italic">No Doc</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        <VerifyButton id={`cto_${pIdx}_${idx}`} label="OK" />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {ctoDetails.length > 0 && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                                                        <h4 className="font-bold text-gray-800">CTO/CCA Additional Details</h4>
                                                    </div>
                                                    <VerifyButton id="cto_additional_details" label="OK" />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Total Capital Investment (Lakhs)</div>
                                                        <div className="mt-2 text-sm font-semibold text-gray-900">{pf.totalCapitalInvestmentLakhs ?? '-'}</div>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ground/Bore Well Water Usage</div>
                                                        <div className="mt-2 text-sm font-semibold text-gray-900">{pf.groundWaterUsage || '-'}</div>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">CGWA NOC Requirement</div>
                                                        <div className="mt-2 text-sm font-semibold text-gray-900">{pf.cgwaNocRequirement || '-'}</div>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">CGWA NOC Document</div>
                                                        <div className="mt-2">
                                                            {pf.cgwaNocDocument ? (
                                                                <button
                                                                    onClick={() => handleViewDocument(pf.cgwaNocDocument, 'CGWA', 'CGWA NOC')}
                                                                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                                                >
                                                                    <FaEye className="mr-1" /> View
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs italic">No Doc</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                                                            <h4 className="font-bold text-gray-800">Regulations Covered under CTO</h4>
                                                        </div>
                                                        <VerifyButton id="cto_regulations" label="OK" />
                                                    </div>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {regs.length ? regs.map((r) => (
                                                            <span key={r} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                {r}
                                                            </span>
                                                        )) : (
                                                            <span className="text-gray-400 text-sm italic">Not selected</span>
                                                        )}
                                                    </div>

                                                    {hasWater && (
                                                        <div className="mt-5">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="text-sm font-bold text-gray-700">Water</div>
                                                                <VerifyButton id="cto_water" label="OK" />
                                                            </div>
                                                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                                <table className="w-full text-left border-collapse">
                                                                <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                                                                    <tr>
                                                                        <th className="p-3 font-semibold border-b w-20">SR No</th>
                                                                        <th className="p-3 font-semibold border-b">Description (water consumption / waste)</th>
                                                                        <th className="p-3 font-semibold border-b w-48">Permitted quantity</th>
                                                                        <th className="p-3 font-semibold border-b w-24">UOM</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="text-sm divide-y divide-gray-100">
                                                                    {(waterRegs.length ? waterRegs : [{}]).map((row, idx) => (
                                                                        <tr key={idx} className="hover:bg-gray-50">
                                                                            <td className="p-3 font-bold text-gray-800">{idx + 1}</td>
                                                                            <td className="p-3 text-gray-700">{row.description || '-'}</td>
                                                                            <td className="p-3 text-gray-700">{row.permittedQuantity || '-'}</td>
                                                                            <td className="p-3 text-gray-700">{row.uom || '-'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {hasAir && (
                                                        <div className="mt-5">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="text-sm font-bold text-gray-700">Air</div>
                                                                <VerifyButton id="cto_air" label="OK" />
                                                            </div>
                                                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                                <table className="w-full text-left border-collapse">
                                                                <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                                                                    <tr>
                                                                        <th className="p-3 font-semibold border-b w-20">SR No</th>
                                                                        <th className="p-3 font-semibold border-b">Parameters</th>
                                                                        <th className="p-3 font-semibold border-b w-80">Permissible annual / daily limit</th>
                                                                        <th className="p-3 font-semibold border-b w-24">UOM</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="text-sm divide-y divide-gray-100">
                                                                    {(airRegs.length ? airRegs : [{}]).map((row, idx) => (
                                                                        <tr key={idx} className="hover:bg-gray-50">
                                                                            <td className="p-3 font-bold text-gray-800">{idx + 1}</td>
                                                                            <td className="p-3 text-gray-700">{row.parameter || '-'}</td>
                                                                            <td className="p-3 text-gray-700">{row.permittedLimit || '-'}</td>
                                                                            <td className="p-3 text-gray-700">{row.uom || '-'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {hasHazardousWaste && (
                                                        <div className="mt-5">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="text-sm font-bold text-gray-700">Hazardous Waste</div>
                                                                <VerifyButton id="cto_hazardous" label="OK" />
                                                            </div>
                                                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                                <table className="w-full text-left border-collapse">
                                                                <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                                                                    <tr>
                                                                        <th className="p-3 font-semibold border-b w-20">SR No</th>
                                                                        <th className="p-3 font-semibold border-b">Name of Hazardous Waste</th>
                                                                        <th className="p-3 font-semibold border-b">Facility &amp; Mode of Disposal</th>
                                                                        <th className="p-3 font-semibold border-b w-40">Quantity MT/YR</th>
                                                                        <th className="p-3 font-semibold border-b w-24">UOM</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="text-sm divide-y divide-gray-100">
                                                                    {(hazardousRegs.length ? hazardousRegs : [{}]).map((row, idx) => (
                                                                        <tr key={idx} className="hover:bg-gray-50">
                                                                            <td className="p-3 font-bold text-gray-800">{idx + 1}</td>
                                                                            <td className="p-3 text-gray-700">{row.nameOfHazardousWaste || '-'}</td>
                                                                            <td className="p-3 text-gray-700">{row.facilityModeOfDisposal || '-'}</td>
                                                                            <td className="p-3 text-gray-700">{row.quantityMtYr || '-'}</td>
                                                                            <td className="p-3 text-gray-700">{row.uom || '-'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                );
              })()}
              
              <div className="flex justify-end pt-6 border-t border-gray-200 mt-8">
                  <button 
                      onClick={() => setIsCompleteModalOpen(true)}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md flex items-center gap-2 font-semibold transition-all hover:shadow-lg"
                  >
                      <FaCheckCircle className="text-xl" />
                      Complete Verification
                  </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CompleteVerificationModal 
        isOpen={isCompleteModalOpen} 
        onClose={() => setIsCompleteModalOpen(false)} 
        onConfirm={handleConfirmComplete}
        isSubmitting={loading}
      />

      <RemarkModal 
        isOpen={isRemarkModalOpen} 
        onClose={() => setIsRemarkModalOpen(false)}
        remark={tempRemark}
        setRemark={setTempRemark}
        onSave={saveRemark}
      />

      <DocumentViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        documentUrl={viewerUrl}
        documentName={viewerName}
      />
    </div>
  );
};

const RemarkModal = ({ isOpen, onClose, remark, setRemark, onSave }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 sm:mx-0 sm:h-10 sm:w-10">
                                <FaCommentAlt className="text-amber-600 text-lg" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Add/Edit Remark
                                </h3>
                                <div className="mt-2">
                                    <textarea
                                        rows={4}
                                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                                        placeholder="Enter your remark here..."
                                        value={remark}
                                        onChange={(e) => setRemark(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-amber-600 text-base font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onSave}
                        >
                            Save Remark
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CompleteVerificationModal = ({ isOpen, onClose, onConfirm, isSubmitting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                                <FaCheckCircle className="text-green-600 text-lg" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Complete Verification
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        Are you sure you want to complete the verification process? This will move the client to the Audit stage.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                            onClick={onConfirm}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <FaSpinner className="animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : (
                                'Yes, Complete'
                            )}
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientValidation;
