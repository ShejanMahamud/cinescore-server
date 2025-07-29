/*
  Warnings:

  - A unique constraint covering the columns `[titleId]` on the table `title_countries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[countryId]` on the table `title_countries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[titleId]` on the table `title_genres` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[genreId]` on the table `title_genres` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[titleId]` on the table `title_languages` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[languageId]` on the table `title_languages` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[titleId]` on the table `title_peoples` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[peopleId]` on the table `title_peoples` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[titleId]` on the table `title_ratings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sourceId]` on the table `title_ratings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "title_countries_titleId_key" ON "title_countries"("titleId");

-- CreateIndex
CREATE UNIQUE INDEX "title_countries_countryId_key" ON "title_countries"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "title_genres_titleId_key" ON "title_genres"("titleId");

-- CreateIndex
CREATE UNIQUE INDEX "title_genres_genreId_key" ON "title_genres"("genreId");

-- CreateIndex
CREATE UNIQUE INDEX "title_languages_titleId_key" ON "title_languages"("titleId");

-- CreateIndex
CREATE UNIQUE INDEX "title_languages_languageId_key" ON "title_languages"("languageId");

-- CreateIndex
CREATE UNIQUE INDEX "title_peoples_titleId_key" ON "title_peoples"("titleId");

-- CreateIndex
CREATE UNIQUE INDEX "title_peoples_peopleId_key" ON "title_peoples"("peopleId");

-- CreateIndex
CREATE UNIQUE INDEX "title_ratings_titleId_key" ON "title_ratings"("titleId");

-- CreateIndex
CREATE UNIQUE INDEX "title_ratings_sourceId_key" ON "title_ratings"("sourceId");
