import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { AdminDomainSupport } from './admin-domain-support';
import { AdminExamCatalogService } from './admin-exam-catalog.service';
import { AdminExerciseEditorService } from './admin-exercise-editor.service';
import { AdminMediaService } from './admin-media.service';
import { AdminReferenceService } from './admin-reference.service';

@Injectable()
export class AdminService extends AdminDomainSupport {
  constructor(
    prisma: PrismaService,
    private readonly adminExamCatalogService: AdminExamCatalogService,
    private readonly adminExerciseEditorService: AdminExerciseEditorService,
    private readonly adminMediaService: AdminMediaService,
    private readonly adminReferenceService: AdminReferenceService,
  ) {
    super(prisma);
  }

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

  async listExams(subject?: string, year?: number) {
    return this.adminExamCatalogService.listExams(subject, year);
  }

  async bootstrapExamsFromQbank() {
    return this.adminExamCatalogService.bootstrapExamsFromQbank();
  }

  async createExam(payload: Record<string, unknown>) {
    return this.adminExamCatalogService.createExam(payload);
  }

  async updateExam(examId: string, payload: Record<string, unknown>) {
    return this.adminExamCatalogService.updateExam(examId, payload);
  }

  async deleteExam(examId: string) {
    return this.adminExamCatalogService.deleteExam(examId);
  }

  async getExamExercises(examId: string) {
    return this.adminExamCatalogService.getExamExercises(examId);
  }

  async createExercise(examId: string, payload: Record<string, unknown>) {
    return this.adminExamCatalogService.createExercise(examId, payload);
  }

  async updateExercise(exerciseId: string, payload: Record<string, unknown>) {
    return this.adminExamCatalogService.updateExercise(exerciseId, payload);
  }

  async deleteExercise(exerciseId: string) {
    return this.adminExamCatalogService.deleteExercise(exerciseId);
  }

  async reorderExercises(examId: string, payload: Record<string, unknown>) {
    return this.adminExamCatalogService.reorderExercises(examId, payload);
  }

  async getExerciseEditor(exerciseId: string) {
    return this.adminExerciseEditorService.getExerciseEditor(exerciseId);
  }

  async updateExerciseMetadata(
    exerciseId: string,
    payload: Record<string, unknown>,
  ) {
    return this.adminExerciseEditorService.updateExerciseMetadata(
      exerciseId,
      payload,
    );
  }

  async createQuestion(exerciseId: string, payload: Record<string, unknown>) {
    return this.adminExerciseEditorService.createQuestion(exerciseId, payload);
  }

  async updateQuestion(questionId: string, payload: Record<string, unknown>) {
    return this.adminExerciseEditorService.updateQuestion(questionId, payload);
  }

  async deleteQuestion(questionId: string) {
    return this.adminExerciseEditorService.deleteQuestion(questionId);
  }

  async reorderQuestions(exerciseId: string, payload: Record<string, unknown>) {
    return this.adminExerciseEditorService.reorderQuestions(
      exerciseId,
      payload,
    );
  }

  async uploadImage(payload: Record<string, unknown>) {
    return this.adminMediaService.uploadImage({
      fileName: this.readString(payload.file_name, 'file_name'),
      contentBase64: this.readString(payload.content_base64, 'content_base64'),
    });
  }

  async getImage(fileName: string) {
    return this.adminMediaService.getImage(fileName);
  }
}
