import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CODE_REGEX = /(\d{1,2}\.?\d{3}|\d{4})(\s[A-Z])?/g;

// Absolute path to Poppler pdftocairo
const POPPLER_PATH = 'C:\\Users\\victo\\AppData\\Local\\Microsoft\\WinGet\\Packages\\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\\poppler-25.07.0\\Library\\bin\\pdftocairo.exe';

export interface ExtractedProduct {
  code: string;
  imagePath?: string;
  thumbPath?: string;
}

export async function processPdfCatalog(buffer: Buffer): Promise<ExtractedProduct[]> {
  const tempDir = path.join(process.cwd(), 'tmp', `pdf-${Date.now()}`);
  try {
    console.log('Starting visual PDF parsing (Poppler + Canvas)...');
    
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempPdfPath = path.join(tempDir, 'input.pdf');
    fs.writeFileSync(tempPdfPath, buffer);

    // 1. Extract Text Coordinate using pdf2json (Stable)
    const PDFParser = require('pdf2json');
    const pdfParser = new PDFParser();

    const textPromise = new Promise<{Pages: any[]}>((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => resolve(pdfData));
    });

    pdfParser.parseBuffer(buffer);
    const pdfData = await textPromise;

    // 2. Convert all pages to JPG using Poppler (Native, Fast, Reliable)
    console.log('Rendering PDF pages to high-res JPGs...');
    try {
        const cmd = `"${POPPLER_PATH}" -jpeg -r 150 "${tempPdfPath}" "${path.join(tempDir, 'page')}"`;
        execSync(cmd);
    } catch (e) {
        throw new Error('Falha no motor de renderização Poppler.');
    }

    // 3. Process and Crop using @napi-rs/canvas (Stable Binary)
    const { createCanvas, loadImage } = require('@napi-rs/canvas');
    const results: ExtractedProduct[] = [];
    const storageDir = path.join(process.cwd(), 'public', 'catalog-images');
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

    for (let i = 0; i < pdfData.Pages.length; i++) {
        const pageNum = i + 1;
        const page = pdfData.Pages[i];
        const pageImgPath = path.join(tempDir, `page-${pageNum}.jpg`);
        
        if (!fs.existsSync(pageImgPath)) continue;
        
        // Load the rendered page image
        const pageImage = await loadImage(pageImgPath);
        const pageWidth = pageImage.width;
        const pageHeight = pageImage.height;

        const wRatio = pageWidth / page.Width;
        const hRatio = pageHeight / page.Height;

        for (const textItem of page.Texts) {
            const rawText = decodeURIComponent(textItem.R[0].T).trim();
            if (CODE_REGEX.test(rawText)) {
                const code = rawText.match(CODE_REGEX)![0].trim();
                const sanitizedCode = code.replace(/\s/g, '_');

                // Coordinate mapping from pdf2json units to pixels
                const x = textItem.x * wRatio;
                const y = textItem.y * hRatio;

                // Crop logic (look above the label)
                const cropW = 550;
                const cropH = 450;
                const cropX = Math.max(0, x - (cropW / 2));
                const cropY = Math.max(0, y - cropH - 20); // 20px above the text

                const canvas = createCanvas(cropW, cropH);
                const ctx = canvas.getContext('2d');
                
                try {
                    // Draw the cropped portion of the page onto the new canvas
                    ctx.drawImage(
                        pageImage, 
                        cropX, cropY, cropW, cropH, 
                        0, 0, cropW, cropH
                    );

                    const outPath = path.join(storageDir, `${sanitizedCode}.jpg`);
                    fs.writeFileSync(outPath, canvas.toBuffer('image/jpeg'));

                    // Generate Thumbnail (300x300)
                    const thumbDir = path.join(process.cwd(), 'public', 'catalog-thumbnails');
                    if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
                    
                    const thumbW = 300;
                    const thumbH = Math.round(cropH * (thumbW / cropW));
                    const thumbCanvas = createCanvas(thumbW, thumbH);
                    const thumbCtx = thumbCanvas.getContext('2d');
                    thumbCtx.drawImage(canvas, 0, 0, thumbW, thumbH);
                    
                    const thumbOutPath = path.join(thumbDir, `${sanitizedCode}.jpg`);
                    fs.writeFileSync(thumbOutPath, thumbCanvas.toBuffer('image/jpeg'));

                    results.push({
                        code: code,
                        imagePath: `/catalog-images/${sanitizedCode}.jpg`,
                        thumbPath: `/catalog-thumbnails/${sanitizedCode}.jpg`
                    });
                } catch (e) {
                    console.warn(`Crop skip for ${code}`);
                }
            }
        }
    }

    return results;

  } catch (error: any) {
    console.error('CRITICAL Error in final extraction:', error);
    throw new Error(`Erro na extração visual: ${error.message}`);
  } finally {
    // Cleanup
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}
