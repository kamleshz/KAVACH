export const formatNumber = (value) => {
    if (value === null || value === undefined) return '';
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return (Math.round(n * 100) / 100).toString();
};

export const toNumberOrNull = (value) => {
    const s = (value ?? '').toString().trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
};

export const calculateCapacityMetrics = (row, options = {}) => {
    const { emptyAsNull = false } = options;

    const outputHr = toNumberOrNull(row?.productionOutputPerHr);
    const powerHr = toNumberOrNull(row?.powerPerHrKwh);
    const workingDays = toNumberOrNull(row?.workingDays);
    const workingHoursPerDay = toNumberOrNull(row?.workingHoursPerDay);
    const consentCapacityRaw = toNumberOrNull(row?.consentCapacity);

    const uomNorm = (row?.uom || '').toString().trim().toUpperCase();
    const consentUomNorm = (row?.consentUom || '').toString().trim().toUpperCase() || (uomNorm === 'KG' ? 'MT' : uomNorm);

    const totalMonthlyCapacity =
        outputHr !== null && workingDays !== null && workingHoursPerDay !== null
            ? outputHr * workingDays * workingHoursPerDay
            : (emptyAsNull ? null : 0);

    const totalMonthlyCapacityMt =
        totalMonthlyCapacity === null
            ? null
            : uomNorm === 'KG'
                ? totalMonthlyCapacity / 1000
                : (emptyAsNull ? null : 0);

    const totalElectricityConsumptionPerMonthKwh =
        powerHr !== null && workingDays !== null && workingHoursPerDay !== null
            ? powerHr * workingDays * workingHoursPerDay
            : (emptyAsNull ? null : 0);

    const totalMonthlyCapacityForUtilization =
        totalMonthlyCapacity === null
            ? null
            : (uomNorm === 'KG' && consentUomNorm === 'MT')
                ? totalMonthlyCapacity / 1000
                : totalMonthlyCapacity;

    const consentCapacity =
        consentCapacityRaw !== null
            ? consentCapacityRaw
            : (emptyAsNull ? null : 0);

    const utilizationPercent =
        totalMonthlyCapacityForUtilization !== null && consentCapacityRaw !== null && consentCapacityRaw > 0
            ? (totalMonthlyCapacityForUtilization / consentCapacityRaw) * 100
            : null;

    return {
        productionOutputPerHr: outputHr !== null ? outputHr : (emptyAsNull ? null : 0),
        powerPerHrKwh: powerHr !== null ? powerHr : (emptyAsNull ? null : 0),
        workingDays: workingDays !== null ? workingDays : (emptyAsNull ? null : 0),
        workingHoursPerDay: workingHoursPerDay !== null ? workingHoursPerDay : (emptyAsNull ? null : 0),
        consentCapacity,
        totalMonthlyCapacity,
        totalMonthlyCapacityMt,
        totalElectricityConsumptionPerMonthKwh,
        totalElectricityPerMonthKwh: totalElectricityConsumptionPerMonthKwh,
        utilizationPercent
    };
};
