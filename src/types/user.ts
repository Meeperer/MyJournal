/**
 * User-related types for session and API.
 */

export type UserSession = {
  email: string;
  id?: string;
};

export type UserRecord = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};
