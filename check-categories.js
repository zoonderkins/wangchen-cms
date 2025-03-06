const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const categories = await prisma.promotionCategory.findMany();
    console.log('Promotion Categories:');
    console.log(JSON.stringify(categories, null, 2));
  } catch (error) {
    console.error('Error fetching promotion categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 