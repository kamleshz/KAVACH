import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaIndustry, FaRecycle, FaArrowRight, FaCheckCircle } from 'react-icons/fa';

const ClientTypeSelection = () => {
  const navigate = useNavigate();

  const handleSelect = (type) => {
    navigate(`/dashboard/add-client/plastic-${type}`);
  };

  const features = {
    pibo: ['Producers', 'Importers', 'Brand Owners', 'Extended Producer Responsibility'],
    pwp: ['Recyclers', 'Waste Processors', 'Co-processors', 'Waste Management Agencies']
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
      <div className="text-center mb-12 max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-4 tracking-tight">
          Register New Client
        </h1>
        <p className="text-lg text-gray-500">
          Choose the entity type to proceed with the registration process. 
          This will configure the compliance requirements accordingly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">
        {/* PIBO Card */}
        <div 
          onClick={() => handleSelect('pibo')}
          className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-transparent hover:border-orange-200"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
          
          <div className="p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                <FaIndustry className="text-3xl text-orange-600" />
              </div>
              <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-wider rounded-full">
                Type I, II, III
              </span>
            </div>

            <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-orange-600 transition-colors">
              PIBO
            </h3>
            <p className="text-gray-500 mb-6 font-medium">
              Producer, Importer & Brand Owner
            </p>

            <div className="space-y-3 mb-8 flex-grow">
              {features.pibo.map((item, index) => (
                <div key={index} className="flex items-center text-gray-600">
                  <FaCheckCircle className="text-orange-400 mr-3 text-sm flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between group-hover:text-orange-600 transition-colors">
              <span className="font-bold text-sm uppercase tracking-wide">Continue Registration</span>
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                <FaArrowRight className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* PWP Card */}
        <div 
          onClick={() => handleSelect('pwp')}
          className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-transparent hover:border-green-200"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
          
          <div className="p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                <FaRecycle className="text-3xl text-green-600" />
              </div>
              <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold uppercase tracking-wider rounded-full">
                Processors
              </span>
            </div>

            <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-green-600 transition-colors">
              PWP
            </h3>
            <p className="text-gray-500 mb-6 font-medium">
              Plastic Waste Processor
            </p>

            <div className="space-y-3 mb-8 flex-grow">
              {features.pwp.map((item, index) => (
                <div key={index} className="flex items-center text-gray-600">
                  <FaCheckCircle className="text-green-400 mr-3 text-sm flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between group-hover:text-green-600 transition-colors">
              <span className="font-bold text-sm uppercase tracking-wide">Continue Registration</span>
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                <FaArrowRight className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientTypeSelection;
