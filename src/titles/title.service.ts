import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { PrismaService } from 'src/prisma';
import { CreateTitleDto } from './dto/create-title.dto';
import { MovieResponse, TitleType } from './types';

interface CreateTitleResult {
  success: boolean;
  message: string;
  titleId?: number;
}

@Injectable()
export class TitleService {
  private readonly logger = new Logger(TitleService.name);
  private readonly titleApi: string;
  private readonly titleApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.titleApi = this.configService.get<string>('TITLE_API') as string;
    this.titleApiKey = this.configService.get<string>(
      'TITLE_API_KEY',
    ) as string;

    if (!this.titleApi || !this.titleApiKey) {
      throw new Error('TITLE_API and TITLE_API_KEY must be configured');
    }
  }

  async createTitle(dto: CreateTitleDto): Promise<CreateTitleResult> {
    try {
      // Fetch movie data from external API
      const movieData = await this.fetchMovieData(dto.imdbId);

      // Validate required fields
      this.validateMovieData(movieData);

      // Create title with all related data in transaction
      const titleId = await this.createTitleWithRelations(movieData);

      this.logger.log(`Successfully created title with ID: ${titleId}`);

      return {
        success: true,
        message: 'Title created successfully',
        titleId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create title for IMDB ID ${dto.imdbId}:`,
        error,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to create title');
    }
  }

  private async fetchMovieData(imdbId: string): Promise<MovieResponse> {
    try {
      const url = `${this.titleApi}?i=${imdbId}&apikey=${this.titleApiKey}&plot=full`;
      const { data } = await axios.get<MovieResponse>(url, {
        timeout: 10000, // 10 second timeout
      });

      if (data.Response === 'False') {
        throw new BadRequestException(
          `Movie not found: ${data.Error || 'Unknown error'}`,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(`API request failed: ${error.message}`);
        throw new BadRequestException(
          'Failed to fetch movie data from external API',
        );
      }
      throw error;
    }
  }

  private validateMovieData(data: MovieResponse): void {
    const requiredFields = ['Title', 'imdbID', 'Type', 'Year'];
    const missingFields = requiredFields.filter((field) => !data[field]);

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missingFields.join(', ')}`,
      );
    }
  }

  private async createTitleWithRelations(
    movieData: MovieResponse,
  ): Promise<number> {
    return await this.prisma.$transaction(async (tx) => {
      // Create the main title record
      const title = await tx.title.create({
        data: this.buildTitleData(movieData),
      });

      // Process all related entities in parallel where possible
      await Promise.all([
        this.processGenres(tx, title.id, movieData.Genre),
        this.processLanguages(tx, title.id, movieData.Language),
        this.processCountries(tx, title.id, movieData.Country),
        this.processPeople(tx, title.id, movieData.Actors, 'actor'),
        this.processPeople(tx, title.id, movieData.Writer, 'writer'),
        this.processPeople(tx, title.id, movieData.Director, 'director'),
        this.processRatings(tx, title.id, movieData.Ratings),
      ]);

      return title.id;
    });
  }

  private buildTitleData(movieData: MovieResponse) {
    const baseData = {
      title: movieData.Title,
      poster_url: movieData.Poster !== 'N/A' ? movieData.Poster : null,
      rated: movieData.Rated !== 'N/A' ? movieData.Rated : null,
      released: movieData.Released !== 'N/A' ? movieData.Released : null,
      runtime: movieData.Runtime !== 'N/A' ? movieData.Runtime : null,
      plot: movieData.Plot !== 'N/A' ? movieData.Plot : null,
      awards: movieData.Awards !== 'N/A' ? movieData.Awards : null,
      meta_score: movieData.Metascore !== 'N/A' ? movieData.Metascore : null,
      imdb_rating: movieData.imdbRating !== 'N/A' ? movieData.imdbRating : null,
      imdb_votes: movieData.imdbVotes !== 'N/A' ? movieData.imdbVotes : null,
      type: this.mapTitleType(movieData.Type),
      imdb_id: movieData.imdbID,
      year: movieData.Year,
      box_office: movieData.BoxOffice !== 'N/A' ? movieData.BoxOffice : null,
      website: movieData.Website !== 'N/A' ? movieData.Website : null,
      production: movieData.Production !== 'N/A' ? movieData.Production : null,
    };

    // Add series-specific data
    if (movieData.Type === 'series' && movieData.totalSeasons !== 'N/A') {
      return {
        ...baseData,
        total_season: parseInt(movieData.totalSeasons, 10) || null,
      };
    }

    return baseData;
  }

  private mapTitleType(type: string): TitleType {
    return type === 'movie' ? 'movie' : 'series';
  }

  private async processGenres(
    tx: any,
    titleId: number,
    genreString: string,
  ): Promise<void> {
    if (!genreString || genreString === 'N/A') return;

    const genreNames = this.parseCommaSeparatedValues(genreString);
    await this.upsertAndLinkEntities(
      tx,
      'genre',
      'titleGenre',
      genreNames,
      titleId,
      'genreId',
    );
  }

  private async processLanguages(
    tx: any,
    titleId: number,
    languageString: string,
  ): Promise<void> {
    if (!languageString || languageString === 'N/A') return;

    const languageNames = this.parseCommaSeparatedValues(languageString);
    await this.upsertAndLinkEntities(
      tx,
      'language',
      'titleLanguage',
      languageNames,
      titleId,
      'languageId',
    );
  }

  private async processCountries(
    tx: any,
    titleId: number,
    countryString: string,
  ): Promise<void> {
    if (!countryString || countryString === 'N/A') return;

    const countryNames = this.parseCommaSeparatedValues(countryString);
    await this.upsertAndLinkEntities(
      tx,
      'country',
      'titleCountry',
      countryNames,
      titleId,
      'countryId',
    );
  }

  private async processPeople(
    tx: any,
    titleId: number,
    peopleString: string,
    role: 'actor' | 'writer' | 'director',
  ): Promise<void> {
    if (!peopleString || peopleString === 'N/A') return;

    const peopleNames = this.parseCommaSeparatedValues(peopleString);
    const existingPeople = await tx.people.findMany({
      where: { name: { in: peopleNames } },
    });

    const existingNames = new Set(existingPeople.map((p) => p.name));
    const newPeople = peopleNames.filter((name) => !existingNames.has(name));

    // Create new people in batch
    if (newPeople.length > 0) {
      await tx.people.createMany({
        data: newPeople.map((name) => ({ name })),
      });
    }

    // Get all people (existing + newly created)
    const allPeople = await tx.people.findMany({
      where: { name: { in: peopleNames } },
    });

    // Create title-people relationships in batch
    await tx.titlePeople.createMany({
      data: allPeople.map((person) => ({
        titleId,
        peopleId: person.id,
        role,
      })),
    });
  }

  private async processRatings(
    tx: any,
    titleId: number,
    ratings: Array<{ Source: string; Value: string }>,
  ): Promise<void> {
    if (!ratings || ratings.length === 0) return;

    const sourceNames = ratings.map((r) => r.Source);
    const existingSources = await tx.titleRatingSource.findMany({
      where: { name: { in: sourceNames } },
    });

    const existingSourceNames = new Set(existingSources.map((s) => s.name));
    const newSources = sourceNames.filter(
      (name) => !existingSourceNames.has(name),
    );

    // Create new sources in batch
    if (newSources.length > 0) {
      await tx.titleRatingSource.createMany({
        data: newSources.map((name) => ({ name })),
      });
    }

    // Get all sources
    const allSources = await tx.titleRatingSource.findMany({
      where: { name: { in: sourceNames } },
    });

    const sourceMap = new Map(allSources.map((s) => [s.name, s.id]));

    // Create ratings in batch
    await tx.titleRating.createMany({
      data: ratings.map((rating) => ({
        sourceId: sourceMap.get(rating.Source)!,
        titleId,
        value: rating.Value,
      })),
    });
  }

  private async upsertAndLinkEntities(
    tx: any,
    entityTable: string,
    linkTable: string,
    names: string[],
    titleId: number,
    foreignKeyField: string,
  ): Promise<void> {
    // Find existing entities
    const existing = await tx[entityTable].findMany({
      where: { name: { in: names } },
    });

    const existingNames = new Set(existing.map((e) => e.name));
    const newNames = names.filter((name) => !existingNames.has(name));

    // Create new entities in batch
    if (newNames.length > 0) {
      await tx[entityTable].createMany({
        data: newNames.map((name) => ({ name })),
      });
    }

    // Get all entities
    const allEntities = await tx[entityTable].findMany({
      where: { name: { in: names } },
    });

    // Create links in batch
    await tx[linkTable].createMany({
      data: allEntities.map((entity) => ({
        titleId,
        [foreignKeyField]: entity.id,
      })),
    });
  }

  private parseCommaSeparatedValues(str: string): string[] {
    return str
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
}
