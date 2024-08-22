import { EventEmitter } from 'events';

const eventManager = new EventEmitter();
eventManager.setMaxListeners(20);

export default eventManager;
