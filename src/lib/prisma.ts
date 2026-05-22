import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: any | undefined;
}

let _prisma: any;

if (!process.env.DATABASE_URL) {
  const methodHandler = {
    get(_t: any, methodName: string) {
      if (methodName === '$transaction') return async (..._args: any[]) => [];
      if (methodName === '$connect') return async () => {};
      if (methodName === '$disconnect') return async () => {};
      return async (..._args: any[]) => {
        const m = String(methodName);
        if (m === 'count') return 0;
        if (m === 'findMany' || m.startsWith('find')) return [];
        if (m === 'findFirst' || m === 'findUnique') return null;
        if (['create', 'update', 'upsert', 'createMany', 'updateMany', 'delete', 'deleteMany'].includes(m)) return {};
        return null;
      };
    }
  };

  const modelProxy = new Proxy({}, methodHandler);

  const prismaMock = new Proxy(
    {},
    {
      get(_t: any, name: string) {
        // model access like prisma.partner -> return model proxy
        if (name === 'Prisma') return undefined;
        if (name === '$transaction') return async (..._args: any[]) => [];
        return modelProxy;
      }
    }
  );

  _prisma = prismaMock;
} else {
  _prisma = (global.prisma as PrismaClient) || new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'] });
  if (process.env.NODE_ENV !== 'production') {
    global.prisma = _prisma;
  }
}

export const prisma: PrismaClient = _prisma as unknown as PrismaClient;
