const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({ select: { name: true } });
  console.log("Categories:", cats.map(c => c.name));
  
  const products = await prisma.product.findMany({ select: { name: true } });
  console.log("Some products:", products.slice(0, 50).map(p => p.name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
