"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastUnitEvent = exports.removeUnitEventClient = exports.addUnitEventClient = void 0;
const clients = new Set();
const addUnitEventClient = (res, plant) => {
    clients.add({ res, plant });
};
exports.addUnitEventClient = addUnitEventClient;
const removeUnitEventClient = (res) => {
    for (const client of clients) {
        if (client.res === res) {
            clients.delete(client);
            break;
        }
    }
};
exports.removeUnitEventClient = removeUnitEventClient;
const broadcastUnitEvent = (payload) => {
    const data = `event: unit-update\ndata: ${JSON.stringify(payload)}\n\n`;
    clients.forEach(client => {
        // If the event has a plant and the client has a plant, only send if they match
        if (payload.plant && client.plant && payload.plant !== client.plant) {
            return;
        }
        client.res.write(data);
    });
};
exports.broadcastUnitEvent = broadcastUnitEvent;
//# sourceMappingURL=unitEventStream.js.map