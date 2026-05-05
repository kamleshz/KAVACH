import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Modal, Button, Spin } from 'antd';
import { DownloadOutlined, CloseOutlined, FilePdfOutlined, FileImageOutlined, FileWordOutlined, FileExcelOutlined, FileUnknownOutlined } from '@ant-design/icons';
import { gsap } from 'gsap';

const DocumentViewerModal = ({ isOpen, onClose, documentUrl, documentName }) => {
    const [loading, setLoading] = useState(true);
    const [fileType, setFileType] = useState('unknown');
    const modalShellRef = useRef(null);
    const modalBodyRef = useRef(null);

    useEffect(() => {
        if (documentUrl) {
            setLoading(true);
            
            // Determine extension from URL or Name
            let ext = '';
            
            // If it's a blob URL, we must rely on the name
            if (documentUrl.startsWith('blob:') && documentName) {
                ext = documentName.split('.').pop().toLowerCase();
            } else {
                // Try to get from URL
                const urlParts = documentUrl.split('.').pop().toLowerCase().split('?')[0];
                if (urlParts && urlParts.length <= 5) {
                    ext = urlParts;
                } else if (documentName) {
                    // Fallback to name if URL seems to have no extension or is complex
                    ext = documentName.split('.').pop().toLowerCase();
                }
            }
            
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
                setFileType('image');
            } else if (ext === 'pdf') {
                setFileType('pdf');
            } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
                setFileType('office');
            } else {
                setFileType('unknown');
                setLoading(false);
            }
        }
    }, [documentUrl, documentName]);

    useLayoutEffect(() => {
        if (!isOpen || typeof window === 'undefined') return undefined;

        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        if (prefersReducedMotion) return undefined;

        const modalContent =
            modalShellRef.current?.querySelector('.ant-modal-content') ||
            modalShellRef.current;
        const footerButtons = modalShellRef.current?.querySelectorAll(
            '.ant-modal-footer .ant-btn',
        );

        if (!modalContent) return undefined;

        const ctx = gsap.context(() => {
            gsap.fromTo(
                modalContent,
                { autoAlpha: 0, y: 20, scale: 0.985 },
                {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.32,
                    ease: 'power2.out',
                    clearProps: 'opacity,transform',
                },
            );

            if (modalBodyRef.current) {
                gsap.fromTo(
                    modalBodyRef.current,
                    { autoAlpha: 0, y: 10 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: 0.36,
                        delay: 0.06,
                        ease: 'power2.out',
                        clearProps: 'opacity,transform',
                    },
                );
            }

            if (footerButtons?.length) {
                gsap.fromTo(
                    footerButtons,
                    { autoAlpha: 0, y: 8 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: 0.24,
                        delay: 0.1,
                        stagger: 0.05,
                        ease: 'power2.out',
                        clearProps: 'opacity,transform',
                    },
                );
            }
        }, modalShellRef);

        return () => ctx.revert();
    }, [isOpen, documentUrl, fileType]);

    const handleLoad = () => {
        setLoading(false);
    };

    const getIcon = () => {
        switch (fileType) {
            case 'image': return <FileImageOutlined />;
            case 'pdf': return <FilePdfOutlined />;
            case 'office': return <FileWordOutlined />; // Or Excel depending on specific type, but generic office is fine
            default: return <FileUnknownOutlined />;
        }
    };

    const renderContent = () => {
        if (!documentUrl) return <div className="text-center p-10 text-gray-500">No document URL provided</div>;

        switch (fileType) {
            case 'image':
                return (
                    <div className="flex justify-center items-center h-full bg-gray-100 rounded-lg overflow-auto p-4">
                        <img 
                            src={documentUrl} 
                            alt={documentName} 
                            className="max-w-full max-h-[70vh] object-contain shadow-md"
                            onLoad={handleLoad}
                            onError={() => setLoading(false)}
                        />
                    </div>
                );
            case 'pdf':
                return (
                    <iframe
                        src={documentUrl}
                        title={documentName}
                        className="w-full h-[75vh] border-0 rounded-lg shadow-sm"
                        onLoad={handleLoad}
                    />
                );
            case 'office':
                return (
                    <div className="flex flex-col items-center justify-center h-[50vh] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <FileWordOutlined className="text-6xl text-gray-400 mb-4" />
                        <p className="text-lg text-gray-600 font-medium mb-2">Protected office files are download-only</p>
                        <p className="text-gray-500 mb-6">Preview is disabled to avoid sending confidential documents to third-party viewers.</p>
                        <Button 
                            type="primary" 
                            icon={<DownloadOutlined />} 
                            href={documentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                        >
                            Download File
                        </Button>
                    </div>
                );
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-[50vh] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <FileUnknownOutlined className="text-6xl text-gray-400 mb-4" />
                        <p className="text-lg text-gray-600 font-medium mb-2">Preview not available for this file type</p>
                        <p className="text-gray-500 mb-6">Please download the file to view it</p>
                        <Button 
                            type="primary" 
                            icon={<DownloadOutlined />} 
                            href={documentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                        >
                            Download File
                        </Button>
                    </div>
                );
        }
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    {getIcon()}
                    <span className="truncate max-w-[300px]" title={documentName}>{documentName || 'Document Viewer'}</span>
                </div>
            }
            open={isOpen}
            onCancel={onClose}
            footer={[
                <Button key="download" icon={<DownloadOutlined />} href={documentUrl} target="_blank" rel="noopener noreferrer">
                    Download
                </Button>,
                <Button key="close" onClick={onClose}>
                    Close
                </Button>
            ]}
            width={1000}
            centered
            className="document-viewer-modal"
            modalRender={(modal) => <div ref={modalShellRef}>{modal}</div>}
            styles={{ body: { padding: 0 } }} // Updated from bodyStyle for newer AntD versions, keeping fallback if needed
        >
            <div ref={modalBodyRef} className="relative bg-gray-50 p-4 min-h-[400px]">
                {loading && fileType !== 'unknown' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                        <Spin size="large" />
                    </div>
                )}
                {renderContent()}
            </div>
        </Modal>
    );
};

export default DocumentViewerModal;
