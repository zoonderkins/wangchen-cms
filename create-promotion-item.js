const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const slugify = require('slugify');

async function main() {
  try {
    // Get the first category
    const category = await prisma.promotionCategory.findFirst();
    
    if (!category) {
      console.error('No promotion category found. Please create a category first.');
      return;
    }
    
    console.log('Using category:', category);
    
    // Create a promotion item
    const title_en = 'Test Promotion Item';
    const slug = slugify(title_en, {
      lower: true,
      strict: true
    });
    
    const promotionItem = await prisma.promotionItem.create({
      data: {
        title_en: title_en,
        title_tw: '測試推動項目',
        content_en: '<p>This is a test promotion item.</p>',
        content_tw: '<p>這是一個測試推動項目。</p>',
        url: 'https://example.com',
        slug: slug,
        imagePath: null,
        publishedDate: new Date(),
        status: 'published',
        category: {
          connect: {
            id: category.id
          }
        },
        author: {
          connect: {
            id: 1 // Assuming user ID 1 exists
          }
        }
      }
    });
    
    console.log('Created promotion item:', promotionItem);
  } catch (error) {
    console.error('Error creating promotion item:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 