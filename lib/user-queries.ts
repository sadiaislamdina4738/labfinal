import { User } from '@/models/User';
import type { UserDocument } from '@/models/User';

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<UserDocument | null> {
  // @ts-ignore - TypeScript has issues with Mongoose overloading
  return (await User.find({ email: email.toLowerCase() }).limit(1).exec())[0] || null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<UserDocument | null> {
  // @ts-ignore - TypeScript has issues with Mongoose overloading
  return (await User.find({ _id: id }).limit(1).exec())[0] || null;
}

/**
 * Create a new user
 */
export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: string;
}): Promise<UserDocument> {
  // @ts-ignore - TypeScript has issues with Mongoose overloading
  return await User.create(data);
}

/**
 * Update user by ID
 */
export async function updateUserById(id: string, updates: Record<string, any>): Promise<UserDocument | null> {
  // @ts-ignore - TypeScript has issues with Mongoose overloading
  return await User.findOneAndUpdate({ _id: id }, updates, { new: true }).exec();
}
