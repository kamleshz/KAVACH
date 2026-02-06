import React from 'react';
import { FaBuilding, FaSave } from 'react-icons/fa';
import { indianStatesCities } from '../../constants/indianStatesCities';
import { useClientContext } from '../../context/ClientContext';

const CompanyAddress = ({ onSave }) => {
    const { formData, handleChange } = useClientContext();

    return (
        <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Registered Office Address</h3>
            <div className="grid grid-cols-1 gap-4">
                <input type="text" name="roAddress1" placeholder="Address Line 1" value={formData.roAddress1} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
                <input type="text" name="roAddress2" placeholder="Address Line 2" value={formData.roAddress2} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                <input type="text" name="roAddress3" placeholder="Address Line 3" value={formData.roAddress3} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="grid grid-cols-3 gap-6">
                <select name="roState" value={formData.roState} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Select State</option>
                    {Object.keys(indianStatesCities).map((state) => (
                        <option key={state} value={state}>{state}</option>
                    ))}
                </select>
                <select name="roCity" value={formData.roCity} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required disabled={!formData.roState}>
                    <option value="">Select City</option>
                    {formData.roState && indianStatesCities[formData.roState]?.map((city) => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                </select>
                <input type="text" name="roPincode" placeholder="Pincode" value={formData.roPincode} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
            </div>

            <div className="flex items-center justify-between border-b pb-2 pt-4">
                <h3 className="text-xl font-bold text-gray-800">Communication Office Address</h3>
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" name="coSameAsRegistered" checked={formData.coSameAsRegistered} onChange={handleChange} className="rounded text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm text-gray-700">Same as Registered</span>
                </label>
            </div>
            {!formData.coSameAsRegistered && (
                <>
                    <div className="grid grid-cols-1 gap-4">
                        <input type="text" name="coAddress1" placeholder="Address Line 1" value={formData.coAddress1} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
                        <input type="text" name="coAddress2" placeholder="Address Line 2" value={formData.coAddress2} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        <input type="text" name="coAddress3" placeholder="Address Line 3" value={formData.coAddress3} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        <select name="coState" value={formData.coState} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                            <option value="">Select State</option>
                            {Object.keys(indianStatesCities).map((state) => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>
                        <select name="coCity" value={formData.coCity} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required disabled={!formData.coState}>
                            <option value="">Select City</option>
                            {formData.coState && indianStatesCities[formData.coState]?.map((city) => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                        <input type="text" name="coPincode" placeholder="Pincode" value={formData.coPincode} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
                    </div>
                </>
            )}

            {onSave && (
                <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
                    <button
                        type="button"
                        onClick={onSave}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm font-semibold"
                    >
                        <FaSave /> Save Company Address
                    </button>
                </div>
            )}
        </div>
    );
};

export default CompanyAddress;
