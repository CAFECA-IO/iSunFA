import { IRoom } from '@/interfaces/room';
import loggerBack from '@/lib/utils/logger_back';
import crypto from 'crypto';

class RoomManager {
  private static instance: RoomManager;

  private roomList: IRoom[];

  private constructor() {
    this.roomList = [];
  }

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  public addRoom(): IRoom {
    const roomId = crypto.randomUUID();
    const password = crypto.randomUUID();
    const newRoom: IRoom = {
      id: roomId,
      password,
      fileList: [],
    };

    this.roomList.push(newRoom);
    loggerBack.info(`Room with id ${roomId} created successfully.`);
    return newRoom;
  }

  public verifyRoomPassword(roomId: string, password: string): boolean {
    const room = this.roomList.find((r) => r.id === roomId);
    if (!room) {
      loggerBack.warn(`Room with id ${roomId} not found.`);
      return false;
    }

    return room.password === password; // 簡單比較密碼
  }

  public deleteRoom(roomId: string): boolean {
    const index = this.roomList.findIndex((room) => room.id === roomId);
    if (index !== -1) {
      this.roomList.splice(index, 1);
      loggerBack.info(`Room with id ${roomId} deleted successfully.`);
      return true;
    } else {
      loggerBack.warn(`Room with id ${roomId} not found.`);
      return false;
    }
  }

  public getRoomList(): IRoom[] {
    return [...this.roomList];
  }

  public getRoomById(roomId: string): IRoom | null {
    const room = this.roomList.find((r) => r.id === roomId);
    if (!room) {
      loggerBack.warn(`Room with id ${roomId} not found.`);
      return null;
    }
    return room;
  }
}

export const roomManager = RoomManager.getInstance();
