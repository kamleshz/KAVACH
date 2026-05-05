import { FaChevronDown, FaMapMarkerAlt } from "react-icons/fa";

const ClientDocuments = ({ isOpen, onToggle, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      aria-expanded={isOpen}
    >
      <span className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
        <FaMapMarkerAlt className="text-primary-600" />
        Address, Documents & Plant Details
      </span>
      <FaChevronDown
        className={`text-xs text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
    <div
      className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[8000px] opacity-100" : "max-h-0 opacity-0"}`}
    >
      <div className="px-5 pb-5 space-y-6 border-t border-gray-100 pt-5">
        {children}
      </div>
    </div>
  </div>
);

export default ClientDocuments;
