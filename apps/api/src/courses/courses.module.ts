import { Module } from '@nestjs/common';
import { StudyModule } from '../study/study.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [StudyModule],
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}
