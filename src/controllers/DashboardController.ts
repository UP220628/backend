import { Request, Response } from 'express';
import sql from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { getUserPlantFilter, buildDateFilter } from '../utils/helpers';
import { MAX_DEFECT_CHART_ITEMS } from '../constants';

export const getWeeklyUnitsByProvider = asyncHandler(async (req: Request, res: Response) => {
	const user = res.locals.user;
	const plant = getUserPlantFilter(user);

	const result = await sql<any[]>`
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
			${plant ? sql`AND u.plant = ${plant}` : sql``}
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

export const getMonthlyUnitsTimeline = asyncHandler(async (req: Request, res: Response) => {
	const user = res.locals.user;
	const plant = getUserPlantFilter(user);

	const result = await sql<any[]>`
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
			${plant ? sql`AND u.plant = ${plant}` : sql``}
		GROUP BY dr.day
		ORDER BY dr.day
	`;
	
	res.json({ ok: true, data: result });
});

/** Defectos activos agrupados por modelo (dígitos 5-6 del VIN) y grado */
export const getDefectsByModel = asyncHandler(async (req: Request, res: Response) => {
	const user = res.locals.user;
	const plant = getUserPlantFilter(user);
	const filter = typeof req.query.filter === 'string' ? req.query.filter : undefined;
	const dateFilter = buildDateFilter(filter);

	const result = await sql<any[]>`
		SELECT
			SUBSTRING(u.vin, 5, 2) AS model_code,
			dg.code AS grade,
			COUNT(ud.id)::int AS count
		FROM "UnitDefect" ud
		JOIN "Unit" u ON u.id = ud."unitId"
		JOIN "DefectGrade" dg ON dg.id = ud."gradeId"
		WHERE ud."isActive" = TRUE
		${dateFilter}
		${plant ? sql`AND u.plant = ${plant}` : sql``}
		GROUP BY SUBSTRING(u.vin, 5, 2), dg.code
		ORDER BY model_code, grade
	`;

	res.json({ ok: true, data: result });
});

/** Tipos de defecto más repetidos */
export const getDefectsByType = asyncHandler(async (req: Request, res: Response) => {
	const user = res.locals.user;
	const plant = getUserPlantFilter(user);
	const filter = typeof req.query.filter === 'string' ? req.query.filter : undefined;
	const grade = typeof req.query.grade === 'string' ? req.query.grade.toUpperCase() : undefined;
	const dateFilter = buildDateFilter(filter);

	const result = await sql<any[]>`
		SELECT
			ud."defectType" AS type,
			dg.code AS grade,
			COUNT(ud.id)::int AS count
		FROM "UnitDefect" ud
		JOIN "Unit" u ON u.id = ud."unitId"
		JOIN "DefectGrade" dg ON dg.id = ud."gradeId"
		WHERE ud."isActive" = TRUE
		${dateFilter}
		${plant ? sql`AND u.plant = ${plant}` : sql``}
		${grade ? sql`AND dg.code = ${grade}` : sql``}
		GROUP BY ud."defectType", dg.code
		ORDER BY count DESC
		LIMIT ${MAX_DEFECT_CHART_ITEMS}
	`;

	res.json({ ok: true, data: result });
});
