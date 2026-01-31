import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LuRecycle, LuBatteryCharging, LuCar, LuLaptop, LuDroplet, LuArrowRight, LuClock } from 'react-icons/lu';
import { toast } from 'react-toastify';
import useAuth from '../hooks/useAuth';

const WasteTypeSelection = () => {
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

  const handleSelect = (type) => {
    if (type === 'plastic') {
      navigate('/dashboard/add-client/plastic');
    } else {
      toast.info('This module is coming soon!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const wasteTypes = [
    {
      id: 'plastic',
      title: 'Plastic Waste',
      icon: LuRecycle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      cardBorderColor: 'hover:border-green-500',
      gradient: 'from-green-400 to-emerald-500',
      iconBg: 'bg-green-100',
      description: 'Manage PIBOs and PWPs under Plastic Waste Management Rules.',
      features: ['Registration', 'Annual Returns', 'EPR Targets', 'Audit & Compliance']
    },
    {
      id: 'ewaste',
      title: 'E-Waste',
      icon: LuLaptop,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      cardBorderColor: 'hover:border-blue-500',
      gradient: 'from-blue-400 to-indigo-500',
      iconBg: 'bg-blue-100',
      description: 'End-to-end management for Electronic Waste recycling and compliance.',
      features: ['E-Waste Collection', 'Dismantling', 'Recycling', 'Refurbishing']
    },
    {
      id: 'battery',
      title: 'Battery Waste',
      icon: LuBatteryCharging,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      cardBorderColor: 'hover:border-yellow-500',
      gradient: 'from-yellow-400 to-amber-500',
      iconBg: 'bg-yellow-100',
      description: 'Compliance solutions for Battery Waste Management Rules.',
      features: ['Battery Collection', 'Recycling Targets', 'Safe Disposal', 'Material Recovery']
    },
    {
      id: 'eol',
      title: 'End of Life (ELV)',
      icon: LuCar,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      cardBorderColor: 'hover:border-red-500',
      gradient: 'from-red-400 to-rose-500',
      iconBg: 'bg-red-100',
      description: 'Management of End of Life Vehicles (ELV) and automotive waste.',
      features: ['Vehicle Scrapping', 'De-registration', 'Material Recovery', 'Certificate of Deposit']
    },
    {
      id: 'used_oil',
      title: 'Used Oil',
      icon: LuDroplet,
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      cardBorderColor: 'hover:border-gray-500',
      gradient: 'from-gray-600 to-gray-800',
      iconBg: 'bg-gray-200',
      description: 'Management and recycling of used oil ensuring environmental compliance.',
      features: ['Collection', 'Re-refining', 'Disposal', 'Compliance Tracking']
    }
  ];

  return (
    <div className="min-h-[80vh] flex flex-col p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-fadeIn w-full mx-auto px-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-500">
            Welcome Back
          </p>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900">
            {user?.name || 'User'}
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
        {/* Row 1: 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {wasteTypes.slice(0, 3).map((type, idx) => (
              <div 
                key={type.id}
                onClick={() => handleSelect(type.id)}
                className={`relative bg-white rounded-xl shadow-lg hover:shadow-xl border-2 ${type.borderColor} ${type.cardBorderColor} transition-all duration-300 cursor-pointer group overflow-hidden animate-slideUp h-[280px] flex flex-col items-center justify-center text-center p-6 w-full transform hover:-translate-y-1`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${type.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                <div className="flex flex-col h-full justify-between p-2 w-full">
                    <div className="flex justify-between items-start w-full">
                       <div className={`w-14 h-14 ${type.iconBg} rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm group-hover:scale-110`}>
                          <type.icon className={`text-2xl ${type.color}`} />
                       </div>
                       {type.id !== 'plastic' && (
                          <div className="px-4 py-1.5 rounded-full bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-md flex items-center gap-1.5">
                             <span className="text-sm">🔥</span> UPCOMING
                          </div>
                       )}
                    </div>
                    
                    <div className="text-left mt-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">{type.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                           {type.description}
                        </p>
                    </div>

                    <div className="text-left mt-auto pt-4 border-t border-gray-50">
                        {type.id === 'plastic' ? (
                            <div className={`text-xs font-semibold ${type.color} flex items-center gap-2 group-hover:gap-3 transition-all duration-300`}>
                               Access Dashboard <LuArrowRight className="text-[12px]" />
                            </div>
                        ) : (
                            <span className="text-xs font-medium text-gray-400 flex items-center gap-2">
                                <LuClock className="text-xs" /> Launching Soon
                            </span>
                        )}
                    </div>
                </div>
              </div>
            ))}
        </div>

        {/* Row 2: 2 Cards (Centered) */}
        <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full lg:w-5/6">
                {wasteTypes.slice(3, 5).map((type, idx) => (
                  <div 
                    key={type.id}
                    onClick={() => handleSelect(type.id)}
                    className={`relative bg-white rounded-xl shadow-lg hover:shadow-xl border-2 ${type.borderColor} ${type.cardBorderColor} transition-all duration-300 cursor-pointer group overflow-hidden animate-slideUp h-[280px] flex flex-col items-center justify-center text-center p-6 w-full transform hover:-translate-y-1`}
                    style={{ animationDelay: `${(idx + 3) * 100}ms` }}
                  >
                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${type.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                <div className="flex flex-col h-full justify-between p-2 w-full">
                    <div className="flex justify-between items-start w-full">
                       <div className={`w-14 h-14 ${type.iconBg} rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm group-hover:scale-110`}>
                          <type.icon className={`text-2xl ${type.color}`} />
                       </div>
                       {type.id !== 'plastic' && (
                          <div className="px-4 py-1.5 rounded-full bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-md flex items-center gap-1.5">
                             <span className="text-sm">🔥</span> UPCOMING
                          </div>
                       )}
                    </div>
                    
                    <div className="text-left mt-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">{type.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                           {type.description}
                        </p>
                    </div>

                    <div className="text-left mt-auto pt-4 border-t border-gray-50">
                        {type.id === 'plastic' ? (
                            <div className={`text-xs font-semibold ${type.color} flex items-center gap-2 group-hover:gap-3 transition-all duration-300`}>
                               Access Dashboard <LuArrowRight className="text-[12px]" />
                            </div>
                        ) : (
                            <span className="text-xs font-medium text-gray-400 flex items-center gap-2">
                                <LuClock className="text-xs" /> Launching Soon
                            </span>
                        )}
                    </div>
                </div>
                  </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default WasteTypeSelection;
