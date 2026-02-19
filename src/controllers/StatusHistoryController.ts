import { Request, Response } from 'express';
import { statusHistoryService } from '../services/StatusHistoryService';
import * as XLSX from 'xlsx';

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
            timestamp: row.changedAt
          });
        }
      }
      return acc;
    }, {});

    const units = Object.values(groupedUnits);

    // Crear datos para Excel
    const excelData = units.map((unit: any) => {
      // Formatear notas para Excel
      const notesText = unit.notes.length > 0 
        ? unit.notes.map((n: any) => {
            const date = new Date(n.timestamp);
            return `[${n.status}] ${date.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}: ${n.note}`;
          }).join('\n') 
        : '';

      // Función helper para formatear fechas sin conversión de zona horaria
      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
      };

      return {
        'VIN': unit.vin,
        'Mercado': unit.market,
        'Carril': unit.lane,
        'Registrado por': unit.registeredByName,
        'Reportado': formatDate(unit.states.REPORTED),
        'Nivelación': formatDate(unit.states.SENT),
        'Entregada': formatDate(unit.states.DELIVERED),
        'Recibido': formatDate(unit.states.RECEIVED),
        'Aceptado': formatDate(unit.states.ACCEPTED),
        'En Reparación': formatDate(unit.states.IN_REPAIR),
        'Reparado': formatDate(unit.states.REPAIRED),
        'Liberado Body': formatDate(unit.states.RELEASED),
        'Liberado WWS': formatDate(unit.states.WWS_RELEASED),
        'Notas': notesText,
      };
    });

    // Crear libro de Excel
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial de Unidades');

    // Configurar anchos de columna
    ws['!cols'] = [
      { wch: 18 }, // VIN
      { wch: 10 }, // Mercado
      { wch: 8 },  // Carril
      { wch: 20 }, // Registrado por
      { wch: 20 }, // Reportado
      { wch: 20 }, // Nivelación
      { wch: 20 }, // Entregada
      { wch: 20 }, // Recibido
      { wch: 20 }, // Aceptado
      { wch: 20 }, // En Reparación
      { wch: 20 }, // Reparado
      { wch: 20 }, // Liberado Body
      { wch: 20 }, // Liberado WWS
      { wch: 50 }, // Notas
    ];

    // Generar buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Enviar archivo
    const filename = `historial-unidades-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
