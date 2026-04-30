const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

const mainCategories = [
  { name: 'Porta Chaves Religiosos', slug: 'porta-chaves-religiosos' },
  { name: 'Adornos e Proteção', slug: 'adornos-e-protecao' },
  { name: 'Cruzes e Capelas', slug: 'cruzes-e-capelas' },
  { name: 'Mandalas e Trios', slug: 'mandalas-e-trios' },
  { name: 'Decoração e Utilidades', slug: 'decoracao-e-utilidades' },
  { name: 'Linha Infantil e Berço', slug: 'linha-infantil-bebe' },
];

const categoryMapping = {
  // Porta Chaves
  'Porta chaves resinado': 'porta-chaves-religiosos',
  'porta chaves vazado': 'porta-chaves-religiosos',
  'porta chaves torre mosaico': 'porta-chaves-religiosos',
  'porta chaves torre santinha': 'porta-chaves-religiosos',
  'porta chaves basilica velha': 'porta-chaves-religiosos',
  // Adornos e Protecao
  'adorno simples resinado': 'adornos-e-protecao',
  'adorno luxo resinado': 'adornos-e-protecao',
  'adorno luxo ABS': 'adornos-e-protecao',
  'divino': 'adornos-e-protecao',
  'escapulario de porta': 'adornos-e-protecao',
  'adorno carro resinado': 'adornos-e-protecao',
  // Cruzes e Capelas
  'cruz baulada': 'cruzes-e-capelas',
  'cruz madeira': 'cruzes-e-capelas',
  'capelas': 'cruzes-e-capelas',
  'porta santos': 'cruzes-e-capelas',
  // Mandalas e Trios
  'mandala resinado': 'mandalas-e-trios',
  'mandala tecido': 'mandalas-e-trios',
  'trio resinado': 'mandalas-e-trios',
  'trio torre simples resinado': 'mandalas-e-trios',
  'trio torre luxo resinado': 'mandalas-e-trios',
  // Decoracao e Utilidades
  'porta biblia resinado': 'decoracao-e-utilidades',
  'porta biblia luxo': 'decoracao-e-utilidades',
  'pia benta': 'decoracao-e-utilidades',
  'pedestal resinado': 'decoracao-e-utilidades',
  'pendulo resinado': 'decoracao-e-utilidades',
  // Linha Infantil e Berco
  'medalhão berço luxo': 'linha-infantil-bebe',
  'medalhão berço simples': 'linha-infantil-bebe',
  'anjinho resinado': 'linha-infantil-bebe',
  'anjo oval resinado': 'linha-infantil-bebe',
  'plaquinha santo anjo': 'linha-infantil-bebe'
};

async function main() {
  console.log("Creating main categories...");
  const parentIds = {};
  for (const cat of mainCategories) {
    const parent = await prisma.category.upsert({
      where: { name: cat.name },
      update: { slug: cat.slug },
      create: { name: cat.name, slug: cat.slug },
    });
    parentIds[cat.slug] = parent.id;
  }
  console.log("Main categories created:", parentIds);

  console.log("Updating existing categories...");
  const existingCats = await prisma.category.findMany();
  for (const cat of existingCats) {
    if (Object.values(parentIds).includes(cat.id)) continue; // skip parents

    const targetParentSlug = categoryMapping[cat.name];
    const newSlug = slugify(cat.name);
    
    if (targetParentSlug && parentIds[targetParentSlug]) {
      await prisma.category.update({
        where: { id: cat.id },
        data: {
          slug: newSlug,
          parentId: parentIds[targetParentSlug],
        }
      });
      console.log(`Updated ${cat.name} -> parent: ${targetParentSlug}, slug: ${newSlug}`);
    } else {
      // Just give it a slug if unmapped
      await prisma.category.update({
        where: { id: cat.id },
        data: { slug: newSlug }
      });
      console.log(`Updated unmapped ${cat.name} -> slug: ${newSlug}`);
    }
  }

  console.log("Migration complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
