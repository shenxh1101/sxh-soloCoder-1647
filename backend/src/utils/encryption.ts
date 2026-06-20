import bcrypt from 'bcryptjs';
import { bcryptConfig } from '../config';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, bcryptConfig.saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export default {
  hashPassword,
  comparePassword,
};
