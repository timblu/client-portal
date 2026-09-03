-- CreateTable
CREATE TABLE "PrototypeScreenshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "pageLabel" TEXT,
    "imageUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrototypeScreenshot_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommentThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "xPct" REAL,
    "yPct" REAL,
    "screen" TEXT,
    "screenshotId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "pinnedToTop" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommentThread_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CommentThread_screenshotId_fkey" FOREIGN KEY ("screenshotId") REFERENCES "PrototypeScreenshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommentThread" ("createdAt", "id", "pinnedToTop", "resolved", "screen", "versionId", "xPct", "yPct") SELECT "createdAt", "id", "pinnedToTop", "resolved", "screen", "versionId", "xPct", "yPct" FROM "CommentThread";
DROP TABLE "CommentThread";
ALTER TABLE "new_CommentThread" RENAME TO "CommentThread";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
