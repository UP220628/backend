import { Request, Response } from 'express';
import sql from '../config/database';

export const getWeeklyUnitsByProvider = async (req: Request, res: Response) => {
	try {
		const user = res.locals.user;
		const plant = user?.roleId === 5 ? undefined : user?.plant;

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
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const getMonthlyUnitsTimeline = async (req: Request, res: Response) => {
	try {
		const user = res.locals.user;
		const plant = user?.roleId === 5 ? undefined : user?.plant;

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
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};
