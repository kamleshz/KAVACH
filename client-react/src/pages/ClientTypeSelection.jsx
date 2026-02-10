import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaIndustry, FaRecycle, FaArrowRight, FaCheckCircle, FaNewspaper, FaCogs, FaWineBottle, FaBiohazard } from 'react-icons/fa';

const ClientTypeSelection = () => {
  const navigate = useNavigate();

  const handleSelect = (route) => {
    navigate(`/dashboard/add-client/${route}`);
  };

  const cards = [
    {
      id: 'plastic-pibo',
      title: 'PIBO',
      subtitle: 'Producer, Importer & Brand Owner',
      icon: FaIndustry,
      colorTheme: {
        bg: 'bg-orange-100',
        text: 'text-orange-600',
        border: 'hover:border-orange-200',
        gradient: 'from-orange-400 to-red-500',
        badgeBg: 'bg-orange-50',
        hoverText: 'group-hover:text-orange-600',
        iconBg: 'group-hover:bg-orange-600',
        checkColor: 'text-orange-400'
      },
      features: ['Producers', 'Importers', 'Brand Owners', 'Extended Producer Responsibility'],
      tag: 'Type I, II, III'
    },
    {
      id: 'plastic-pwp',
      title: 'PWP',
      subtitle: 'Plastic Waste Processor',
      icon: FaRecycle,
      colorTheme: {
        bg: 'bg-green-100',
        text: 'text-green-600',
        border: 'hover:border-green-200',
        gradient: 'from-green-400 to-emerald-500',
        badgeBg: 'bg-green-50',
        hoverText: 'group-hover:text-green-600',
        iconBg: 'group-hover:bg-green-600',
        checkColor: 'text-green-400'
      },
      features: ['Recyclers', 'Waste Processors', 'Co-processors', 'Waste Management Agencies'],
      tag: 'Processors'
    },
    {
      id: 'paper',
      title: 'Paper',
      subtitle: 'Paper Waste Management',
      icon: FaNewspaper,
      colorTheme: {
        bg: 'bg-blue-100',
        text: 'text-blue-600',
        border: 'hover:border-blue-200',
        gradient: 'from-blue-400 to-indigo-500',
        badgeBg: 'bg-blue-50',
        hoverText: 'group-hover:text-blue-600',
        iconBg: 'group-hover:bg-blue-600',
        checkColor: 'text-blue-400'
      },
      features: ['Recyclers', 'Manufacturers', 'Waste Collectors', 'Pulp Mills'],
      tag: 'Paper Waste'
    },
    {
      id: 'metal',
      title: 'Metal',
      subtitle: 'Metal Waste Management',
      icon: FaCogs,
      colorTheme: {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        border: 'hover:border-gray-200',
        gradient: 'from-gray-400 to-slate-500',
        badgeBg: 'bg-gray-50',
        hoverText: 'group-hover:text-gray-600',
        iconBg: 'group-hover:bg-gray-600',
        checkColor: 'text-gray-400'
      },
      features: ['Scrap Dealers', 'Foundries', 'Recyclers', 'Smelters'],
      tag: 'Metal Waste'
    },
    {
      id: 'glass',
      title: 'Glass',
      subtitle: 'Glass Waste Management',
      icon: FaWineBottle,
      colorTheme: {
        bg: 'bg-teal-100',
        text: 'text-teal-600',
        border: 'hover:border-teal-200',
        gradient: 'from-teal-400 to-cyan-500',
        badgeBg: 'bg-teal-50',
        hoverText: 'group-hover:text-teal-600',
        iconBg: 'group-hover:bg-teal-600',
        checkColor: 'text-teal-400'
      },
      features: ['Cullet Suppliers', 'Glass Manufacturers', 'Recyclers', 'Bottling Plants'],
      tag: 'Glass Waste'
    },
    {
      id: 'sanitary-waste',
      title: 'Sanitary Waste',
      subtitle: 'Sanitary Waste Management',
      icon: FaBiohazard,
      colorTheme: {
        bg: 'bg-red-100',
        text: 'text-red-600',
        border: 'hover:border-red-200',
        gradient: 'from-red-400 to-rose-500',
        badgeBg: 'bg-red-50',
        hoverText: 'group-hover:text-red-600',
        iconBg: 'group-hover:bg-red-600',
        checkColor: 'text-red-400'
      },
      features: ['Incinerators', 'Collection Agencies', 'Disposal Facilities', 'Treatment Plants'],
      tag: 'Sanitary Waste'
    }
  ];

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl w-full">
        {cards.map((card) => (
          <div 
            key={card.id}
            onClick={() => handleSelect(card.id)}
            className={`relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-transparent ${card.colorTheme.border}`}
          >
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${card.colorTheme.gradient} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
            
            <div className="p-8 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className={`w-16 h-16 ${card.colorTheme.bg} rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300`}>
                  <card.icon className={`text-3xl ${card.colorTheme.text}`} />
                </div>
                <span className={`px-3 py-1 ${card.colorTheme.badgeBg} ${card.colorTheme.text} text-xs font-bold uppercase tracking-wider rounded-full`}>
                  {card.tag}
                </span>
              </div>

              <h3 className={`text-2xl font-bold text-gray-800 mb-2 ${card.colorTheme.hoverText} transition-colors`}>
                {card.title}
              </h3>
              <p className="text-gray-500 mb-6 font-medium">
                {card.subtitle}
              </p>

              <div className="space-y-3 mb-8 flex-grow">
                {card.features.map((item, index) => (
                  <div key={index} className="flex items-center text-gray-600">
                    <FaCheckCircle className={`${card.colorTheme.checkColor} mr-3 text-sm flex-shrink-0`} />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <div className={`mt-auto pt-6 border-t border-gray-100 flex items-center justify-between ${card.colorTheme.hoverText} transition-colors`}>
                <span className="font-bold text-sm uppercase tracking-wide">Continue Registration</span>
                <div className={`w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center ${card.colorTheme.iconBg} group-hover:text-white transition-all duration-300`}>
                  <FaArrowRight className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientTypeSelection;
