import { Module } from '@nestjs/common';
import { StudyModule } from '../study/study.module';
import { CourseAuthoredContentService } from './course-authored-content';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { TheoryContentStorageService } from './theory-content-storage';

@Module({
  imports: [StudyModule],
  controllers: [CoursesController],
  providers: [
    CoursesService,
    CourseAuthoredContentService,
    TheoryContentStorageService,
  ],
})
export class CoursesModule {}
