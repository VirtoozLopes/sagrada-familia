import * as XLSX from 'xlsx';

export interface ExcelProduct {
  code: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
}

export async function parseProductsExcel(buffer: Buffer): Promise<ExcelProduct[]> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Use header: 1 to get raw arrays (useful for headerless files)
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  return data.map((row: any[]) => {
    // Column A (index 0) is usually Code, Column B (index 1) is Name
    const code = String(row[0] || '').trim();
    const name = String(row[1] || '').trim();
    
    // Simple check: if index 0 is a number/code and index 1 is text
    // We ignore rows that are completely empty
    if (!code || !name) return null;

    return {
      code: code,
      name: name,
      description: row[2] ? String(row[2]) : undefined,
      price: row[3] ? Number(row[3]) : undefined,
      category: row[4] ? String(row[4]) : undefined
    } as ExcelProduct;
  }).filter((p): p is ExcelProduct => p !== null);
}
