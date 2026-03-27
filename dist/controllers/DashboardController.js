"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefectsByType = exports.getDefectsByModel = exports.getMonthlyUnitsTimeline = exports.getWeeklyUnitsByProvider = void 0;
const database_1 = __importDefault(require("../config/database"));
const asyncHandler_1 = require("../utils/asyncHandler");
const helpers_1 = require("../utils/helpers");
const constants_1 = require("../constants");
exports.getWeeklyUnitsByProvider = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = res.locals.user;
    const plant = (0, helpers_1.getUserPlantFilter)(user);
    const result = await (0, database_1.default) `
		WITH date_range AS (
			SELECT 
				((NOW() AT TIME ZONE 'America/Mexico_City')::date - s) as day
			FROM generate_series(0, 6) s
		),
		provider_units AS (
			SELECT 
				(u."createdAt" AT TIME ZONE 'America/Mexico_City')::date as day,
				p.name as provider_name,
				COUNT(u.id)::int as count
			FROM "Unit" u
			LEFT JOIN "Provider" p ON p.id = u."providerId"
			WHERE p.name IS NOT NULL
			${plant ? (0, database_1.default) `AND u.plant = ${plant}` : (0, database_1.default) ``}
			GROUP BY (u."createdAt" AT TIME ZONE 'America/Mexico_City')::date, p.name
		)
		SELECT 
			TO_CHAR(dr.day, 'YYYY-MM-DD') as date,
			pu.provider_name as provider,
			COALESCE(pu.count, 0) as count
		FROM date_range dr
		LEFT JOIN provider_units pu ON dr.day = pu.day
		WHERE pu.provider_name IS NOT NULL
		ORDER BY dr.day, provider
	`;
    res.json({ ok: true, data: result });
});
exports.getMonthlyUnitsTimeline = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = res.locals.user;
    const plant = (0, helpers_1.getUserPlantFilter)(user);
    const result = await (0, database_1.default) `
		WITH date_range AS (
			SELECT 
				((NOW() AT TIME ZONE 'America/Mexico_City')::date - s) as day
			FROM generate_series(0, 29) s
		)
		SELECT 
			TO_CHAR(dr.day, 'YYYY-MM-DD') as date,
			COUNT(u.id)::int as count
		FROM date_range dr
		LEFT JOIN "Unit" u ON (u."createdAt" AT TIME ZONE 'America/Mexico_City')::date = dr.day
			${plant ? (0, database_1.default) `AND u.plant = ${plant}` : (0, database_1.default) ``}
		GROUP BY dr.day
		ORDER BY dr.day
	`;
    res.json({ ok: true, data: result });
});
/** Defectos activos agrupados por modelo (dígitos 5-6 del VIN) y grado */
exports.getDefectsByModel = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = res.locals.user;
    const plant = (0, helpers_1.getUserPlantFilter)(user);
    const filter = typeof req.query.filter === 'string' ? req.query.filter : undefined;
    const dateFilter = (0, helpers_1.buildDateFilter)(filter);
    const result = await (0, database_1.default) `
		SELECT
			SUBSTRING(u.vin, 5, 2) AS model_code,
			dg.code AS grade,
			COUNT(ud.id)::int AS count
		FROM "UnitDefect" ud
		JOIN "Unit" u ON u.id = ud."unitId"
		JOIN "DefectGrade" dg ON dg.id = ud."gradeId"
		WHERE ud."isActive" = TRUE
		${dateFilter}
		${plant ? (0, database_1.default) `AND u.plant = ${plant}` : (0, database_1.default) ``}
		GROUP BY SUBSTRING(u.vin, 5, 2), dg.code
		ORDER BY model_code, grade
	`;
    res.json({ ok: true, data: result });
});
/** Tipos de defecto más repetidos */
exports.getDefectsByType = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = res.locals.user;
    const plant = (0, helpers_1.getUserPlantFilter)(user);
    const filter = typeof req.query.filter === 'string' ? req.query.filter : undefined;
    const grade = typeof req.query.grade === 'string' ? req.query.grade.toUpperCase() : undefined;
    const dateFilter = (0, helpers_1.buildDateFilter)(filter);
    const result = await (0, database_1.default) `
		SELECT
			ud."defectType" AS type,
			dg.code AS grade,
			COUNT(ud.id)::int AS count
		FROM "UnitDefect" ud
		JOIN "Unit" u ON u.id = ud."unitId"
		JOIN "DefectGrade" dg ON dg.id = ud."gradeId"
		WHERE ud."isActive" = TRUE
		${dateFilter}
		${plant ? (0, database_1.default) `AND u.plant = ${plant}` : (0, database_1.default) ``}
		${grade ? (0, database_1.default) `AND dg.code = ${grade}` : (0, database_1.default) ``}
		GROUP BY ud."defectType", dg.code
		ORDER BY count DESC
		LIMIT ${constants_1.MAX_DEFECT_CHART_ITEMS}
	`;
    res.json({ ok: true, data: result });
});
//# sourceMappingURL=DashboardController.js.map