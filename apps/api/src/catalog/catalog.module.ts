import { Module } from '@nestjs/common';
import { CatalogBootstrapService } from './catalog-bootstrap.service';
import { CatalogCurriculumService } from './catalog-curriculum.service';

@Module({
  providers: [CatalogBootstrapService, CatalogCurriculumService],
  exports: [CatalogBootstrapService, CatalogCurriculumService],
})
export class CatalogModule {}
