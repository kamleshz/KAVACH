import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LuFactory, LuRecycle, LuCpu, LuWrench, LuArrowLeft, LuArrowRight, LuClock } from 'react-icons/lu';
import { toast } from 'react-toastify';
import useAuth from '../../../hooks/useAuth';

const EWasteCategorySelection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const todayLabel = React.useMemo(() => {
    const date = new Date();
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const handleSelect = (category) => {
    // Navigate to AddClient with type 'ewaste-producer' (or generic 'ewaste' and pass category as state)
    // The user specifically mentioned "Producer", so we'll handle that.
    // For other categories, we can use a similar pattern or default to 'ewaste'.
    
    // We'll use a specific type string that AddClient can recognize
    const typeMap = {
        'Producer': 'ewaste-producer',
        'Recycler': 'ewaste-recycler',
        'Manufacturer': 'ewaste-manufacturer',
        'Refurbisher': 'ewaste-refurbisher'
    };

    const routeType = typeMap[category] || 'ewaste';
    navigate(`/dashboard/add-client/${routeType}`);
  };

  const categories = [
    {
      id: 'producer',
      title: 'Producer',
      icon: LuFactory,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      cardBorderColor: 'hover:border-blue-500',
      gradient: 'from-blue-400 to-indigo-500',
      iconBg: 'bg-blue-100',
      description: 'Producers of electrical and electronic equipment (EEE).',
      features: ['EPR Registration', 'Target Fulfillment', 'Quarterly Returns']
    },
    {
      id: 'recycler',
      title: 'Recycler',
      icon: LuRecycle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      cardBorderColor: 'hover:border-green-500',
      gradient: 'from-green-400 to-emerald-500',
      iconBg: 'bg-green-100',
      description: 'Authorized recyclers for dismantling and recycling e-waste.',
      features: ['Facility Audit', 'Process Compliance', 'Certificate Generation']
    },
    {
      id: 'manufacturer',
      title: 'Manufacturer',
      icon: LuCpu,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      cardBorderColor: 'hover:border-purple-500',
      gradient: 'from-purple-400 to-violet-500',
      iconBg: 'bg-purple-100',
      description: 'Manufacturers of electronic components and assemblies.',
      features: ['Production Data', 'Waste Generation', 'Compliance Reporting']
    },
    {
      id: 'refurbisher',
      title: 'Refurbisher',
      icon: LuWrench,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      cardBorderColor: 'hover:border-orange-500',
      gradient: 'from-orange-400 to-amber-500',
      iconBg: 'bg-orange-100',
      description: 'Refurbishers extending the life of used electronics.',
      features: ['Refurbishing Data', 'Sales Reporting', 'Warranty Management']
    }
  ];

  return (
    <div className="min-h-[80vh] flex flex-col p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-fadeIn w-full mx-auto px-4">
        <div>
            <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-2 transition-colors text-sm font-medium"
            >
                <LuArrowLeft /> Back to Waste Types
            </button>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-500">
            E-Waste Management
          </p>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900">
            Select Category
          </h1>
        </div>
        <div className="flex items-center gap-3 md:justify-end">
          <div className="hidden text-right text-xs text-gray-500 md:block">
            <p className="font-medium text-gray-700">Today</p>
            <p>{todayLabel}</p>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto flex-grow flex flex-col justify-center px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mb-8 max-w-5xl mx-auto">
            {categories.map((type, idx) => (
              <div 
                key={type.id}
                onClick={() => handleSelect(type.title)}
                className={`relative bg-white rounded-xl shadow-lg hover:shadow-xl border-2 ${type.borderColor} ${type.cardBorderColor} transition-all duration-300 cursor-pointer group overflow-hidden animate-slideUp h-[280px] flex flex-col items-center justify-center text-center p-6 w-full transform hover:-translate-y-1`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${type.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                <div className="flex flex-col h-full justify-between p-2 w-full">
                    <div className="flex justify-between items-start w-full">
                       <div className={`w-14 h-14 ${type.iconBg} rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm group-hover:scale-110`}>
                          <type.icon className={`text-2xl ${type.color}`} />
                       </div>
                    </div>
                    
                    <div className="text-left mt-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">{type.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                           {type.description}
                        </p>
                    </div>

                    <div className="text-left mt-auto pt-4 border-t border-gray-50">
                        <div className={`text-xs font-semibold ${type.color} flex items-center gap-2 group-hover:gap-3 transition-all duration-300`}>
                            Proceed <LuArrowRight className="text-[12px]" />
                        </div>
                    </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default EWasteCategorySelection;
