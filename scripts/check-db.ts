import prisma from '../src/lib/db';

async function main() {
  try {
    console.log('Attempting to connect to the database...');
    // A simple, raw query that doesn't depend on any tables.
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful!', result);
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('Connection closed.');
  }
}

main();
