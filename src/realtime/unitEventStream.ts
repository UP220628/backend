import type { Response } from 'express';

type UnitEventPayload = {
  unitId: number;
  status: string;
  event: 'UNIT_REPORTED' | 'STATUS_CHANGED' | 'DEFECT_UPDATED' | 'PRIORITY_UPDATED' | 'SCM_DECISION' | 'NOTE_ADDED';
  createdAt: string;
};

const clients = new Set<Response>();

export const addUnitEventClient = (res: Response) => {
  clients.add(res);
};

export const removeUnitEventClient = (res: Response) => {
  clients.delete(res);
};

export const broadcastUnitEvent = (payload: UnitEventPayload) => {
  const data = `event: unit-update\ndata: ${JSON.stringify(payload)}\n\n`;

  clients.forEach(client => {
    client.write(data);
  });
};
