export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  tenantId: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

export interface JWTPayload {
  userId: string;
  tenantId: string;
  username: string;
  email: string;
}
