import React, { useState, useEffect } from 'react';

const Pagination = ({ 
  currentPage, 
  totalItems, 
  pageSize, 
  onPageChange, 
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100]
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const [inputPage, setInputPage] = useState('');

  // Reset input when page changes externally
  useEffect(() => {
    setInputPage('');
  }, [currentPage]);

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const handlePageClick = (page) => {
    onPageChange(page);
  };

  const handleInputChange = (e) => {
    setInputPage(e.target.value);
  };

  const handleInputSubmit = () => {
    const page = Number(inputPage);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setInputPage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        // Always show first page
        pages.push(1);
        
        if (currentPage > 4) {
            pages.push('...');
        }
        
        // Calculate start and end of the middle range
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        
        // Adjust if close to beginning
        if (currentPage <= 4) {
            end = 5;
        }
        
        // Adjust if close to end
        if (currentPage >= totalPages - 3) {
            start = totalPages - 4;
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        
        if (currentPage < totalPages - 3) {
            pages.push('...');
        }
        
        // Always show last page
        pages.push(totalPages);
    }

    return pages.map((page, index) => {
        if (page === '...') {
            return <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>;
        }
        return (
            <button
                key={page}
                onClick={() => handlePageClick(page)}
                className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors border ${
                    currentPage === page
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-300'
                }`}
            >
                {page}
            </button>
        );
    });
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-4 py-4 select-none">
      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        <button 
            onClick={handlePrev} 
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <i className="fas fa-chevron-left text-xs"></i>
        </button>
        
        <div className="flex gap-1">
            {renderPageNumbers()}
        </div>

        <button 
            onClick={handleNext} 
            disabled={currentPage === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <i className="fas fa-chevron-right text-xs"></i>
        </button>
      </div>

      {/* Page Size Selector */}
      <div className="flex items-center gap-2">
        <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 pl-2 pr-6 border border-gray-300 rounded-md text-sm text-gray-600 bg-white focus:ring-primary-500 focus:border-primary-500 outline-none cursor-pointer"
        >
            {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size} / page</option>
            ))}
        </select>
      </div>

      {/* Go to Page */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Go to</span>
        <input
            type="number"
            min={1}
            max={totalPages}
            value={inputPage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleInputSubmit}
            className="w-16 h-8 border border-gray-300 rounded-md text-center focus:ring-primary-500 focus:border-primary-500 outline-none"
            placeholder="Page"
        />
        <span>Page</span>
      </div>
    </div>
  );
};

export default Pagination;
