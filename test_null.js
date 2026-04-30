const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({
    where: { parentId: null },
    include: { children: true }
  });
  console.log(`Found ${cats.length} root categories`);
  cats.forEach(c => console.log(c.name, "- Children:", c.children.length));
}
main().finally(() => prisma.$disconnect());
