import { Request, Response } from 'express';
import { statusHistoryService } from '../services/StatusHistoryService';
import ExcelJS from 'exceljs';

export const getLogs = async (req: Request, res: Response) => {
  try {
    const user = res.locals.user; // Usuario del middleware de autenticación
    
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

    // Si el usuario es CARRIER (roleId: 4), filtrar por su proveedor
    if (user && user.roleId === 4 && user.providerId) {
      filters.providerId = user.providerId;
    }

    const data = await statusHistoryService.search(filters);
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

export const exportLogsToExcel = async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    
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

    if (user && user.roleId === 4 && user.providerId) {
      filters.providerId = user.providerId;
    }

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

    // Helper para parsear fecha en zona horaria México
    const formatDate = (dateString: string): string => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    };

    // ─── Crear libro ExcelJS ───────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Nissan Body App';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Historial de Unidades', {
      views: [{ state: 'frozen', ySplit: 1 }], // Congelar primera fila
    });

    // ─── Definición de columnas ────────────────────────────────────────────
    sheet.columns = [
      { header: 'VIN',            key: 'vin',          width: 20 },
      { header: 'Mercado',        key: 'market',        width: 14 },
      { header: 'Carril',         key: 'lane',          width: 12 },
      { header: 'Registrado por', key: 'registeredBy',  width: 22 },
      { header: 'Reportado',      key: 'reported',      width: 22 },
      { header: 'Nivelación',     key: 'sent',          width: 22 },
      { header: 'Entregada',      key: 'delivered',     width: 22 },
      { header: 'Recibido',       key: 'received',      width: 22 },
      { header: 'Aceptado',       key: 'accepted',      width: 22 },
      { header: 'En Reparación',  key: 'inRepair',      width: 22 },
      { header: 'Liberado Body',  key: 'released',      width: 22 },
      { header: 'Liberado WWS',   key: 'wwsReleased',   width: 22 },
      { header: 'Notas',          key: 'notes',         width: 55 },
    ];

    // ─── Estilo de cabecera ────────────────────────────────────────────────
    const NISSAN_RED  = 'FFC3142D';
    const WHITE       = 'FFFFFFFF';
    const BORDER_CLR  = 'FFB0B0B0';
    const ROW_ALT     = 'FFFFF0F0'; // rojo muy claro para filas pares
    const ROW_NORMAL  = 'FFFFFFFF';

    const thinBorder: ExcelJS.Border = { style: 'thin', color: { argb: BORDER_CLR } };
    const cellBorders: Partial<ExcelJS.Borders> = {
      top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder,
    };

    const headerRow = sheet.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell(cell => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: NISSAN_RED } };
      cell.font   = { bold: true, color: { argb: WHITE }, size: 11, name: 'Calibri' };
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
            return `[${n.status}] ${d.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}: ${n.note}`;
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
        accepted:     formatDate(unit.states.ACCEPTED),
        inRepair:     formatDate(unit.states.IN_REPAIR),
        released:     formatDate(unit.states.RELEASED),
        wwsReleased:  formatDate(unit.states.WWS_RELEASED),
        notes:        notesText,
      });

      const isEven = idx % 2 === 0;
      const rowBg  = isEven ? ROW_NORMAL : ROW_ALT;

      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        cell.alignment = { vertical: 'top', wrapText: true };
        cell.border    = cellBorders;
        cell.font      = { name: 'Calibri', size: 10 };
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
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
