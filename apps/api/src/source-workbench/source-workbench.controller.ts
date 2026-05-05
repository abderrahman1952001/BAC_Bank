import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { parseUpdateAdminSourceCropRequest } from '@bac-bank/contracts/admin';
import { AdminRoleGuard } from '../admin/admin.guard';
import { SourceWorkbenchService } from './source-workbench.service';

@UseGuards(AdminRoleGuard)
@Controller('admin/source-workbench')
export class SourceWorkbenchController {
  constructor(
    private readonly sourceWorkbenchService: SourceWorkbenchService,
  ) {}

  @Get('sources')
  async listSources() {
    return {
      data: await this.sourceWorkbenchService.listSources(),
    };
  }

  @Get('sources/:sourceId')
  async getSource(@Param('sourceId') sourceId: string) {
    return {
      data: await this.sourceWorkbenchService.getSource(sourceId),
    };
  }

  @Get('source')
  async getSourceByQuery(@Query('sourceId') sourceId: string) {
    if (!sourceId) {
      throw new BadRequestException('sourceId is required.');
    }

    return {
      data: await this.sourceWorkbenchService.getSource(sourceId),
    };
  }

  @Get('assets')
  async getAsset(
    @Query('sourceId') sourceId: string,
    @Query('path') assetPath: string,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    if (!sourceId || !assetPath) {
      throw new BadRequestException('sourceId and path are required.');
    }

    const asset = await this.sourceWorkbenchService.getAsset(
      sourceId,
      assetPath,
    );
    response.header('Content-Type', asset.mimeType);
    response.header(
      'Content-Disposition',
      `inline; filename="${asset.fileName.replace(/"/g, '')}"`,
    );
    response.header('Cache-Control', 'no-store');

    return new StreamableFile(asset.data);
  }

  @Patch('sources/:sourceId/crops/:cropId')
  updateCrop(
    @Param('sourceId') sourceId: string,
    @Param('cropId') cropId: string,
    @Body() body: unknown,
  ) {
    return this.sourceWorkbenchService.updateCrop(
      sourceId,
      cropId,
      parseUpdateAdminSourceCropRequest(body),
    );
  }

  @Patch('crops/:cropId')
  updateCropByQuery(
    @Query('sourceId') sourceId: string,
    @Param('cropId') cropId: string,
    @Body() body: unknown,
  ) {
    if (!sourceId) {
      throw new BadRequestException('sourceId is required.');
    }

    return this.sourceWorkbenchService.updateCrop(
      sourceId,
      cropId,
      parseUpdateAdminSourceCropRequest(body),
    );
  }
}
