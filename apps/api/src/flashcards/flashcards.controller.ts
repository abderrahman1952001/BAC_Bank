import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  CreateFlashcardDeckResponse,
  CreateFlashcardResponse,
  DueFlashcardsResponse,
  FlashcardDeckCardsResponse,
  FlashcardDecksResponse,
  ReviewFlashcardResponse,
} from '@bac-bank/contracts/flashcards';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CreateFlashcardDeckDto } from './dto/create-flashcard-deck.dto';
import { CreateFlashcardDto } from './dto/create-flashcard.dto';
import { GetDueFlashcardsQueryDto } from './dto/get-due-flashcards-query.dto';
import { GetFlashcardDeckCardsQueryDto } from './dto/get-flashcard-deck-cards-query.dto';
import { ReviewFlashcardDto } from './dto/review-flashcard.dto';
import { FlashcardsService } from './flashcards.service';

@UseGuards(ClerkAuthGuard)
@Controller('flashcards')
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Get('decks')
  listDecks(
    @Req() request: AuthenticatedRequest,
  ): Promise<FlashcardDecksResponse> {
    return this.flashcardsService.listDecks(request.user!.id);
  }

  @Post('decks')
  createDeck(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateFlashcardDeckDto,
  ): Promise<CreateFlashcardDeckResponse> {
    return this.flashcardsService.createDeck(request.user!.id, payload);
  }

  @Get('decks/:deckId/cards')
  listDeckCards(
    @Req() request: AuthenticatedRequest,
    @Param('deckId', ParseUUIDPipe) deckId: string,
    @Query() query: GetFlashcardDeckCardsQueryDto,
  ): Promise<FlashcardDeckCardsResponse> {
    return this.flashcardsService.listDeckCards(request.user!.id, deckId, {
      limit: query.limit,
    });
  }

  @Get('due')
  listDueCards(
    @Req() request: AuthenticatedRequest,
    @Query() query: GetDueFlashcardsQueryDto,
  ): Promise<DueFlashcardsResponse> {
    return this.flashcardsService.listDueCards(request.user!.id, {
      limit: query.limit,
      deckId: query.deckId,
      subjectCode: query.subjectCode,
    });
  }

  @Post()
  createCard(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateFlashcardDto,
  ): Promise<CreateFlashcardResponse> {
    return this.flashcardsService.createCard(request.user!.id, payload);
  }

  @Post(':cardId/review')
  reviewCard(
    @Req() request: AuthenticatedRequest,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() payload: ReviewFlashcardDto,
  ): Promise<ReviewFlashcardResponse> {
    return this.flashcardsService.reviewCard(request.user!.id, cardId, payload);
  }
}
