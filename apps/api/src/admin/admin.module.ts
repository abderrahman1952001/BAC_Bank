import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminExamCatalogService } from './admin-exam-catalog.service';
import { AdminExerciseEditorService } from './admin-exercise-editor.service';
import { AdminRoleGuard } from './admin.guard';
import { AdminMediaService } from './admin-media.service';
import { AdminReferenceService } from './admin-reference.service';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminExamCatalogService,
    AdminExerciseEditorService,
    AdminMediaService,
    AdminReferenceService,
    AdminRoleGuard,
  ],
})
export class AdminModule {}
