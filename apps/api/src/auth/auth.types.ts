import { UserRole } from '@prisma/client';
import { FastifyRequest } from 'fastify';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
  sessionId: string | null;
};

export type AuthenticatedRequest = FastifyRequest & {
  user?: AuthenticatedUser;
};
