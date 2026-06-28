-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "teamOrOrg" TEXT,
    "positionOrWeightClass" TEXT,
    "eraOrActiveYears" TEXT,
    "isActive" BOOLEAN,
    "heightCm" INTEGER,
    "weightKg" INTEGER,
    "keyStatsHighlights" JSONB NOT NULL,
    "achievements" JSONB NOT NULL,
    "playstyleDescriptors" JSONB NOT NULL,
    "fameSummary" TEXT NOT NULL,
    "popularityTier" INTEGER NOT NULL,
    "marketabilityNotes" TEXT,
    "bioSummary" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "generationModel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Athlete_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comparison" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "athleteAId" TEXT NOT NULL,
    "athleteBId" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "categoryScores" JSONB NOT NULL,
    "verdictSummary" TEXT,
    "generationModel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comparison_athleteAId_fkey" FOREIGN KEY ("athleteAId") REFERENCES "Athlete" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Comparison_athleteBId_fkey" FOREIGN KEY ("athleteBId") REFERENCES "Athlete" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Sport_key_key" ON "Sport"("key");

-- CreateIndex
CREATE INDEX "Athlete_normalizedName_idx" ON "Athlete"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_normalizedName_sportId_key" ON "Athlete"("normalizedName", "sportId");

-- CreateIndex
CREATE UNIQUE INDEX "Comparison_athleteAId_athleteBId_key" ON "Comparison"("athleteAId", "athleteBId");
