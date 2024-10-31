-- CreateTable
CREATE TABLE "traefik_routes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "targetPort" INTEGER NOT NULL,
    "targetContainer" TEXT NOT NULL,
    "tlsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "middlewares" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traefik_routes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "traefik_routes_name_key" ON "traefik_routes"("name");
