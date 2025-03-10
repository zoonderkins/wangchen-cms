const { PrismaClient } = require('@prisma/client');
const slugify = require('slugify');

const prisma = new PrismaClient();

async function main() {
  try {
    // Create a platform category
    const category = await prisma.platformCategory.create({
      data: {
        name_en: 'Manufacturing Equipment',
        name_tw: '製造設備',
        description_en: 'Various manufacturing equipment platforms',
        description_tw: '各種製造設備平台',
        slug: slugify('Manufacturing Equipment', { lower: true, strict: true }),
        order: 1
      }
    });

    console.log('Platform category created:', category);
  } catch (error) {
    console.error('Error creating platform category:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 