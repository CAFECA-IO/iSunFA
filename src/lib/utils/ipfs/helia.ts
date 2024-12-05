/* eslint-disable import/no-unresolved */
/* eslint-disable import/no-extraneous-dependencies */
// Info: (20241204 - Murky) @libp2p 相關packege已經下載但typescript解析不出來
import { createHelia, HeliaLibp2p } from 'helia';
import type { Libp2p, ServiceMap } from '@libp2p/interface';
import { IPFS_BOOTSTRAP_ADDRESS, IPFS_LISTEN_ADDRESS, IPFS_SWARM_KEY } from '@/constants/config';
import { preSharedKey } from '@libp2p/pnet';
import { bootstrap } from '@libp2p/bootstrap';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { tcp } from '@libp2p/tcp';

export class HeliaSingleton {
  private static instance: HeliaSingleton;

  private helia: HeliaLibp2p<Libp2p<ServiceMap>> | null = null;

  public static async getInstance(): Promise<HeliaSingleton> {
    if (!HeliaSingleton.instance) {
      HeliaSingleton.instance = new HeliaSingleton();
      await HeliaSingleton.instance.initHelia();
    }

    return HeliaSingleton.instance;
  }

  private async initHelia() {
    if (!this.helia) {
      this.helia = await createHelia({
        libp2p: {
          addresses: {
            listen: [IPFS_LISTEN_ADDRESS],
          },
          transports: [tcp()],
          connectionEncrypters: [noise()],
          streamMuxers: [yamux()],
          connectionProtector: preSharedKey({
            psk: new TextEncoder().encode(IPFS_SWARM_KEY),
          }),
          peerDiscovery: [
            bootstrap({
              list: [IPFS_BOOTSTRAP_ADDRESS],
            }),
          ],
        },
      });
    }
  }

  public getHelia(): HeliaLibp2p<Libp2p<ServiceMap>> {
    if (!this.helia) {
      throw new Error('Helia is not initialized');
    }

    return this.helia;
  }
}
