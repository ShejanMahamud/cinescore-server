import * as argon from 'argon2';
import { randomBytes } from 'crypto';

export class Util {
  static async hash(str: string) {
    const hash = await argon.hash(str);
    return hash;
  }

  static async match(hash: string, str: string) {
    const match = await argon.verify(hash, str);
    return match;
  }

  static generateBytes() {
    return randomBytes(32).toString('hex');
  }
}
