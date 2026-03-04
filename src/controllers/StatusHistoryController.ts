import { Request, Response } from 'express';
import { statusHistoryService } from '../services/StatusHistoryService';
import ExcelJS from 'exceljs';
import { asyncHandler } from '../utils/asyncHandler';
import { ROLE_IDS, TIMEZONE, EXCEL_STYLES } from '../constants';

/** Build filters from query params + user context (shared between getLogs and export) */
function buildLogFilters(req: Request, user: any) {
  const filters = {
    registeredById: req.query.registeredById ? Number(req.query.registeredById) : undefined,
    market: typeof req.query.market === 'string' ? req.query.market : undefined,
    vin: typeof req.query.vin === 'string' ? req.query.vin : undefined,
    startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
    endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
    sort: (req.query.sort === 'alpha' ? 'alpha' : 'date') as 'alpha'|'date',
    order: (req.query.order === 'asc' ? 'asc' : req.query.order === 'desc' ? 'desc' : undefined) as 'asc'|'desc'|undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    providerId: undefined as number | undefined,
    plant: typeof req.query.plant === 'string' ? req.query.plant : undefined,
  };

  // Si el usuario es CARRIER, filtrar por su proveedor
  if (user && user.roleId === ROLE_IDS.CARRIER && user.providerId) {
    filters.providerId = user.providerId;
  }

  return filters;
}

/** Helper para parsear fecha en zona horaria México */
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('es-MX', { timeZone: TIMEZONE });
};

/** Mapeo de estados en inglés a español para las notas */
const statusToSpanish: Record<string, string> = {
  REPORTED: 'Reportada',
  SENT: 'Nivelación WWS',
  DELIVERED: 'Entregada a Body',
  RECEIVED: 'Recibida en Body',
  IN_REPAIR: 'En Reparación',
  RELEASED: 'Liberada Body',
  WTY_PENDING: 'Validación WTY',
  WTY_RELEASED: 'Liberada WTY',
  WWS_RELEASED: 'Liberada WWS',
  ACCEPTED: 'Aceptada Carrier',
  REJECTED: 'Rechazada Carrier',
  ARCHIVED: 'Archivada',
  UNAVAILABLE: 'No disponible',
};

export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  const user = res.locals.user;
  const filters = buildLogFilters(req, user);
  const data = await statusHistoryService.search(filters);
  res.json({ ok: true, data });
});

export const exportLogsToExcel = asyncHandler(async (req: Request, res: Response) => {
  const user = res.locals.user;
  const filters = buildLogFilters(req, user);
  const data = await statusHistoryService.search(filters);

  // Agrupar datos por unidad
  const groupedUnits = data.reduce((acc: any, row: any) => {
    if (!acc[row.unitId]) {
      acc[row.unitId] = {
        unitId: row.unitId,
        vin: row.vin,
        market: row.market,
        lane: row.lane,
        registeredByName: row.registeredByName,
        states: {},
        notes: [],
      };
    }
    if (row.newStatus) {
      acc[row.unitId].states[row.newStatus] = row.changedAt;
      if (row.note) {
        acc[row.unitId].notes.push({
          status: row.newStatus,
          note: row.note,
          timestamp: row.changedAt,
        });
      }
    }
    return acc;
  }, {});

  const units = Object.values(groupedUnits) as any[];

  // ─── Crear libro ExcelJS ───────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  workbook.creator = EXCEL_STYLES.APP_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Histórico de Unidades', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // ─── Definición de columnas ────────────────────────────────────────────
  sheet.columns = [
    { header: 'VIN',                             key: 'vin',          width: 20 },
    { header: 'Mercado',                         key: 'market',        width: 14 },
    { header: 'Carril',                          key: 'lane',          width: 12 },
    { header: 'Reportada (Carrier/WWS)',         key: 'reported',      width: 24 },
    { header: 'Nivelación (WWS)',                key: 'sent',          width: 24 },
    { header: 'Entregada (WWS)',                 key: 'delivered',     width: 24 },
    { header: 'Recibida (Body)',                 key: 'received',      width: 24 },
    { header: 'En Reparación (Body)',            key: 'inRepair',      width: 24 },
    { header: 'Liberada Body (Body)',            key: 'released',      width: 24 },
    { header: 'Validación WTY (WTY/SCM Quality)', key: 'wtyPending',    width: 30 },
    { header: 'Liberada WTY (WTY/SCM Quality)',  key: 'wtyReleased',   width: 30 },
    { header: 'Liberada WWS (WWS)',              key: 'wwsReleased',   width: 24 },
    { header: 'Aceptada (Carrier)',              key: 'accepted',      width: 24 },
    { header: 'Rechazada (Carrier)',             key: 'rejected',      width: 24 },
    { header: 'Registrado por',                  key: 'registeredBy',  width: 22 },
    { header: 'Notas',                           key: 'notes',         width: 55 },
  ];

  // ─── Estilo de cabecera ────────────────────────────────────────────────
  const thinBorder: ExcelJS.Border = { style: 'thin', color: { argb: EXCEL_STYLES.BORDER_COLOR } };
  const cellBorders: Partial<ExcelJS.Borders> = {
    top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder,
  };

  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.NISSAN_RED } };
    cell.font   = { bold: true, color: { argb: EXCEL_STYLES.WHITE }, size: 11, name: EXCEL_STYLES.FONT_NAME };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = cellBorders;
  });

  // Filtro automático en cabecera
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: sheet.columns.length },
  };

  // ─── Agregar filas de datos ────────────────────────────────────────────
  units.forEach((unit, idx) => {
    const notesText = unit.notes.length > 0
      ? unit.notes.map((n: any) => {
          const d = new Date(n.timestamp);
          const statusLabel = statusToSpanish[n.status] || n.status;
          return `[${statusLabel}] ${d.toLocaleString('es-MX', { timeZone: TIMEZONE })}: ${n.note}`;
        }).join('\n')
      : '';

    const row = sheet.addRow({
      vin:          unit.vin,
      market:       unit.market,
      lane:         unit.lane,
      registeredBy: unit.registeredByName,
      reported:     formatDate(unit.states.REPORTED),
      sent:         formatDate(unit.states.SENT),
      delivered:    formatDate(unit.states.DELIVERED),
      received:     formatDate(unit.states.RECEIVED),
      inRepair:     formatDate(unit.states.IN_REPAIR),
      released:     formatDate(unit.states.RELEASED),
      wtyPending:   formatDate(unit.states.WTY_PENDING),
      wtyReleased:  formatDate(unit.states.WTY_RELEASED),
      wwsReleased:  formatDate(unit.states.WWS_RELEASED),
      accepted:     formatDate(unit.states.ACCEPTED),
      rejected:     formatDate(unit.states.REJECTED),
      notes:        notesText,
    });

    const isEven = idx % 2 === 0;
    const rowBg  = isEven ? EXCEL_STYLES.ROW_NORMAL : EXCEL_STYLES.ROW_ALT;

    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border    = cellBorders;
      cell.font      = { name: EXCEL_STYLES.FONT_NAME, size: 10 };
    });

    // Ajustar alto si hay notas multilínea
    const lineCount = notesText ? notesText.split('\n').length : 1;
    row.height = Math.max(18, lineCount * 16);
  });

  // ─── Generar buffer y enviar ───────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `historial-unidades-${new Date().toISOString().split('T')[0]}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});
