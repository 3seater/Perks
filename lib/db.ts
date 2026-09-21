import { PrismaClient } from '@prisma/client';
const globalDb = globalThis as unknown as { prisma?: PrismaClient; prismaUrl?:string };
const datasourceUrl=process.env.PERKS_DATABASE_URL || process.env.DATABASE_URL;
// Next reloads .env during development; do not reuse a client initialized before
// the database URL was configured (or against a previous development database).
if(globalDb.prisma&&globalDb.prismaUrl!==datasourceUrl){
  void globalDb.prisma.$disconnect();globalDb.prisma=undefined;
}
export const db = globalDb.prisma ?? new PrismaClient({datasourceUrl});
if (process.env.NODE_ENV !== 'production') {globalDb.prisma = db;globalDb.prismaUrl=datasourceUrl;}
