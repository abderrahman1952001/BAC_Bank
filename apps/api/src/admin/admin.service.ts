import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { AdminReferenceService } from './admin-reference.service';

@Injectable()
export class AdminService {
  constructor(private readonly adminReferenceService: AdminReferenceService) {}

  getMe(user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async getDashboard() {
    return this.adminReferenceService.getDashboard();
  }

  async getFilters() {
    return this.adminReferenceService.getFilters();
  }
}
