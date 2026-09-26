"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBedNumber = parseBedNumber;
exports.parseXlsx = parseXlsx;
exports.parsePropertyStatuses = parsePropertyStatuses;
const XLSX = require("xlsx");
function toDate(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return value;
    if (typeof value === 'number') {
        return XLSX.SSF.parse_date_code
            ? new Date((value - 25569) * 86400 * 1000)
            : null;
    }
    return null;
}
function toStr(value) {
    if (value === null || value === undefined)
        return null;
    const s = String(value).trim();
    return s === '' ? null : s;
}
function toNum(value) {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
}
function toBool(value) {
    if (!value)
        return false;
    return String(value).toLowerCase() === 'yes' || value === true || value === 1;
}
function splitCodeAndEirCode(raw) {
    const cleaned = raw.replace(/ /g, ' ').trim();
    const dashIndex = cleaned.indexOf('-');
    if (dashIndex === -1)
        return { code: cleaned, eirCode: null };
    const eirCode = cleaned.slice(0, dashIndex).replace(/\s+/g, '').toUpperCase();
    const code = cleaned.slice(dashIndex + 1).trim();
    if (!eirCode || !code)
        return { code: cleaned, eirCode: null };
    return { code, eirCode };
}
const BED_NUMBER_LETTER_FIRST_RE = /^([A-Za-z])\s*(\d+)$/;
const BED_NUMBER_DIGIT_FIRST_RE = /^(\d+)\s*([A-Za-z])?$/;
function parseBedNumber(value) {
    const raw = value === null || value === undefined ? '' : String(value).trim();
    if (!raw)
        return { bedNumber: null, bedroomLetter: null, bedNumberRaw: null };
    const letterFirst = raw.match(BED_NUMBER_LETTER_FIRST_RE);
    if (letterFirst) {
        return { bedNumber: Number(letterFirst[2]), bedroomLetter: letterFirst[1].toUpperCase(), bedNumberRaw: raw };
    }
    const digitFirst = raw.match(BED_NUMBER_DIGIT_FIRST_RE);
    if (digitFirst) {
        return { bedNumber: Number(digitFirst[1]), bedroomLetter: digitFirst[2] ? digitFirst[2].toUpperCase() : null, bedNumberRaw: raw };
    }
    return { bedNumber: null, bedroomLetter: null, bedNumberRaw: raw };
}
function parseXlsx(buffer, sheetName = 'Control', required = true) {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[sheetName];
    if (!ws) {
        if (required)
            throw new Error(`Sheet "${sheetName}" not found in workbook`);
        return [];
    }
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    const result = [];
    let lastProperty = null;
    for (let i = 2; i < rows.length; i++) {
        const r = rows[i];
        if (!r)
            continue;
        const rowCode = toStr(r[0]);
        if (rowCode) {
            const { code, eirCode } = splitCodeAndEirCode(rowCode);
            lastProperty = {
                code,
                eirCode,
                bu: toStr(r[1]) ?? '',
                area: toStr(r[2]),
                fullAddress: toStr(r[3]),
                officeKeys: toBool(r[4]),
                keysCount: toNum(r[5]),
                securityKeysCount: toNum(r[6]),
                fobCount: toNum(r[7]),
                electricityStatus: toStr(r[8]),
                gasStatus: toStr(r[9]),
                landlordPaymentDueDay: r[10] !== null ? toNum(r[10]) : null,
                residentPaymentDueDay: r[11] !== null ? toNum(r[11]) : null,
            };
        }
        if (!lastProperty)
            continue;
        result.push({
            ...lastProperty,
            ...parseBedNumber(r[12]),
            bedroomType: toStr(r[13]) ?? '',
            sex: toStr(r[14]) ?? '',
            bedSize: toStr(r[15]) ?? '',
            depositAmount: toNum(r[17]),
            rentAmount: toNum(r[18]),
            residentName: toStr(r[19]),
            residentEmail: toStr(r[20]),
            residentTelephone: toStr(r[21]),
            residentNationality: toStr(r[22]),
            residentPersonalId: toStr(r[23]),
            residentIban: toStr(r[24]),
            residentEmergencyContact: toStr(r[25]),
            residentSource: toStr(r[26]),
            residentIsHead: toBool(r[27]),
            checkInDate: toDate(r[28]),
            contractEndDate: toDate(r[29]),
            checkOutDate: toDate(r[30]),
            comments: toStr(r[32]),
            tempDepositAmount: r[35] !== null ? toNum(r[35]) : null,
            tempRentAmount: r[36] !== null ? toNum(r[36]) : null,
            tempResidentName: toStr(r[37]),
            tempResidentEmail: toStr(r[38]),
            tempResidentTelephone: toStr(r[39]),
            tempResidentNationality: toStr(r[40]),
            tempResidentPersonalId: toStr(r[41]),
            tempResidentIban: toStr(r[42]),
            tempResidentEmergencyContact: toStr(r[43]),
            tempResidentSource: toStr(r[44]),
            tempResidentIsHead: toBool(r[45]),
            tempCheckInDate: toDate(r[46]),
            tempContractEndDate: toDate(r[47]),
        });
    }
    return result;
}
function parsePropertyStatuses(buffer, sheetName = 'Properties Mach') {
    const statuses = new Map();
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[sheetName];
    if (!ws)
        return statuses;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r)
            continue;
        const rawCode = toStr(r[0]);
        const status = toStr(r[4]);
        if (!rawCode || !status)
            continue;
        const { code } = splitCodeAndEirCode(rawCode);
        statuses.set(code, status.toLowerCase() === 'active');
    }
    return statuses;
}
//# sourceMappingURL=xlsx.parser.js.map