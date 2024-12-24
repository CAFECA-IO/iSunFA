import { IFileBeta } from '@/interfaces/file';
import { IRoom, IRoomWithKeyChain } from '@/interfaces/room';
import loggerBack from '@/lib/utils/logger_back';
import { exportPrivateKey, exportPublicKey, generateKeyPair } from './crypto';

/** Info: (20241112 - Jacky)
 * Class representing a manager for handling rooms.
 * This class follows the singleton pattern.
 */
class RoomManager {
  private static instance: RoomManager;

  private roomList: IRoomWithKeyChain[];

  /** Info: (20241112 - Jacky)
   * Private constructor to prevent direct instantiation.
   */
  private constructor() {
    this.roomList = [];
  }

  /** Info: (20241112 - Jacky)
   * Gets the singleton instance of the RoomManager.
   * @returns {RoomManager} The singleton instance of the RoomManager.
   */
  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  public static removeKeyChainFromRoom(room: IRoomWithKeyChain): IRoom {
    const { publicKey, privateKey, ...roomWithoutKeyChain } = room;
    return roomWithoutKeyChain;
  }

  /** Info: (20241112 - Jacky)
   * Finds a room by its ID.
   * @param {string} roomId - The ID of the room to find.
   * @returns {IRoom | null} The room if found, otherwise null.
   */
  private findRoomById(roomId: string): IRoom | null {
    const room = this.roomList.find((r) => r.id === roomId) || null;
    if (!room) {
      loggerBack.warn(`Room with id ${roomId} not found.`);
    }
    return room ? RoomManager.removeKeyChainFromRoom(room) : null;
  }

  private findRoomWithKeyChainById(roomId: string): IRoomWithKeyChain | null {
    const room = this.roomList.find((r) => r.id === roomId) || null;
    if (!room) {
      loggerBack.warn(`Room with id ${roomId} not found.`);
    }
    return room;
  }

  private findRoomWithKeyChainByPublicKey(publicKey: JsonWebKey): IRoomWithKeyChain | null {
    const publicKeyString = JSON.stringify(publicKey);
    const room = this.roomList.find((r) => JSON.stringify(r.publicKey) === publicKeyString) || null;
    return room;
  }

  /**
   * Info: (20241224 - Murky)
   * Adds a new room to the room list with key chain.
   */
  private async addRoomWithKeyChain(newRoom: IRoom): Promise<IRoomWithKeyChain> {
    const companyKeyPair = await generateKeyPair();
    const publicKey = await exportPublicKey(companyKeyPair.publicKey);
    const privateKey = await exportPrivateKey(companyKeyPair.privateKey);
    const roomWithKeyChain: IRoomWithKeyChain = {
      ...newRoom,
      publicKey,
      privateKey,
    };

    this.roomList.push(roomWithKeyChain);
    loggerBack.info(`Room with id ${newRoom.id} created successfully.`);
    return roomWithKeyChain;
  }

  /** Info: (20241112 - Jacky)
   * Create a new room and return it first, than add it to the room list by calling addRoomWithKeyChain.
   * @returns {IRoom} The newly created room.
   */
  public addRoom(): IRoom {
    const roomId = crypto.randomUUID().slice(0, 8);
    const password = crypto.randomUUID().slice(0, 8);
    const newRoom: IRoom = {
      id: roomId,
      password,
      fileList: [],
    };

    this.addRoomWithKeyChain(newRoom);
    loggerBack.info(`Room with id ${roomId} created successfully.`);
    return newRoom;
  }

  /** Info: (20241112 - Jacky)
   * Verifies the password of a room.
   * @param {string} roomId - The ID of the room.
   * @param {string} password - The password to verify.
   * @returns {boolean} True if the password is correct, otherwise false.
   */
  public verifyRoomPassword(roomId: string, password: string): boolean {
    const room = this.findRoomById(roomId);
    if (!room) return false;

    const success = room.password === password;
    if (success) {
      loggerBack.info(`Password for room with id ${roomId} verified successfully.`);
    } else {
      loggerBack.warn(`Failed to verify password for room with id ${roomId}.`);
    }
    return success;
  }

  /** Info: (20241112 - Jacky)
   * Deletes a room by its ID.
   * @param {string} roomId - The ID of the room to delete.
   * @returns {boolean} True if the room was deleted, otherwise false.
   */
  public deleteRoom(roomId: string): boolean {
    const index = this.roomList.findIndex((room) => room.id === roomId);
    if (index === -1) {
      loggerBack.warn(`Failed to delete room with id ${roomId} - not found.`);
      return false;
    }

    this.roomList.splice(index, 1);
    loggerBack.info(`Room with id ${roomId} deleted successfully.`);
    return true;
  }

  /** Info: (20241112 - Jacky)
   * Gets the list of all rooms.
   * @returns {IRoom[]} The list of all rooms.
   */
  public getRoomList(): IRoom[] {
    const roomList = this.roomList.map(RoomManager.removeKeyChainFromRoom);
    return [...roomList];
  }

  public getRoomListWithKeyChain(): IRoomWithKeyChain[] {
    return [...this.roomList];
  }

  /** Info: (20241112 - Jacky)
   * Gets a room by its ID.
   * @param {string} roomId - The ID of the room to get.
   * @returns {IRoom | null} The room if found, otherwise null.
   */
  public getRoomById(roomId: string): IRoom | null {
    return this.findRoomById(roomId);
  }

  public getRoomWithKeyChainById(roomId: string): IRoomWithKeyChain | null {
    return this.findRoomWithKeyChainById(roomId);
  }

  public getRoomWithKeyChainByPublicKey(publicKey: JsonWebKey): IRoomWithKeyChain | null {
    return this.findRoomWithKeyChainByPublicKey(publicKey);
  }

  public addFileToRoom(roomId: string, file: IFileBeta): boolean {
    const room = this.findRoomById(roomId);
    if (!room) return false;

    room.fileList.push(file);
    loggerBack.info(`File with id ${file.id} added to room with id ${roomId}.`);
    return true;
  }
}

export const roomManager = RoomManager.getInstance();
