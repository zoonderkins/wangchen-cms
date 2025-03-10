const { PrismaClient } = require('@prisma/client');
const slugify = require('slugify');

const prisma = new PrismaClient();

async function main() {
  try {
    // Get the first category
    const category = await prisma.platformCategory.findFirst();
    
    if (!category) {
      console.error('No platform category found. Please run create-platform-category.js first.');
      return;
    }
    
    // Get the first user
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.error('No user found.');
      return;
    }
    
    // Create a platform
    const platform = await prisma.platform.create({
      data: {
        title_en: 'CNC Machining Platform',
        title_tw: 'CNC加工平台',
        content_en: `<p>Our CNC Machining Platform offers precision manufacturing services for a wide range of materials and applications.</p>
        <h3>Features:</h3>
        <ul>
          <li>High-precision CNC milling and turning</li>
          <li>Multi-axis machining capabilities</li>
          <li>Wide range of material options</li>
          <li>Rapid prototyping and production services</li>
          <li>Quality control and inspection</li>
        </ul>
        <p>Contact us today to learn more about our CNC machining capabilities and how we can help with your manufacturing needs.</p>`,
        content_tw: `<p>我們的CNC加工平台為各種材料和應用提供精密製造服務。</p>
        <h3>特點：</h3>
        <ul>
          <li>高精度CNC銑削和車削</li>
          <li>多軸加工能力</li>
          <li>多種材料選擇</li>
          <li>快速原型製作和生產服務</li>
          <li>質量控制和檢查</li>
        </ul>
        <p>立即聯繫我們，了解更多關於我們的CNC加工能力以及我們如何幫助您的製造需求。</p>`,
        slug: slugify('CNC Machining Platform', { lower: true, strict: true }),
        url: 'https://example.com/cnc-platform',
        publishedDate: new Date(),
        status: 'published',
        category: {
          connect: { id: category.id }
        },
        author: {
          connect: { id: user.id }
        }
      }
    });

    console.log('Platform created:', platform);
  } catch (error) {
    console.error('Error creating platform:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 