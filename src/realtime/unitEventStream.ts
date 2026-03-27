import type { Response } from 'express';

export type UnitEventType =
  | 'UNIT_REPORTED'
  | 'STATUS_CHANGED'
  | 'DEFECT_UPDATED'
  | 'PRIORITY_UPDATED'
  | 'SCM_DECISION'
  | 'NOTE_ADDED'
  | 'REPAIR_TIME_UPDATED'
  | 'UNIT_DELETION_REQUESTED'
  | 'UNIT_DELETION_DECIDED';

type UnitEventPayload = {
  unitId: number;
  status: string;
  event: UnitEventType;
  plant?: string;
  createdAt: string;
};

type ClientInfo = { res: Response; plant?: string };

const clients = new Set<ClientInfo>();

export const addUnitEventClient = (res: Response, plant?: string) => {
  clients.add({ res, plant });
};

export const removeUnitEventClient = (res: Response) => {
  for (const client of clients) {
    if (client.res === res) {
      clients.delete(client);
      break;
    }
  }
};

export const broadcastUnitEvent = (payload: UnitEventPayload) => {
  const data = `event: unit-update\ndata: ${JSON.stringify(payload)}\n\n`;

  clients.forEach(client => {
    // If the event has a plant and the client has a plant, only send if they match
    if (payload.plant && client.plant && payload.plant !== client.plant) {
      return;
    }
    client.res.write(data);
  });
};
