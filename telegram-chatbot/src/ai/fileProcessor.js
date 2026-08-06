const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const JSZip = require('jszip');
const Tesseract = require('tesseract.js');

async function extractTextFromFile(filePath, mimeType, fileName) {
  const ext = fileName.split('.').pop().toLowerCase();

  try {
    // TXT files
    if (ext === 'txt' || mimeType === 'text/plain') {
      return fs.readFileSync(filePath, 'utf-8');
    }

    // PDF files
    if (ext === 'pdf' || mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    }

    // Word documents (.docx)
    if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }

    // Excel files (.xlsx, .xls)
    if (ext === 'xlsx' || ext === 'xls' || mimeType.includes('spreadsheet')) {
      const workbook = XLSX.readFile(filePath);
      let text = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        text += XLSX.utils.sheet_to_csv(sheet) + '\n';
      }
      return text.trim();
    }

    // PowerPoint files (.pptx)
    if (ext === 'pptx' || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      const data = fs.readFileSync(filePath);
      const zip = await JSZip.loadAsync(data);
      let text = '';
      
      // Extract text from all slide files
      const slideFiles = Object.keys(zip.files)
        .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
        .sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)/)[1]);
          const numB = parseInt(b.match(/slide(\d+)/)[1]);
          return numA - numB;
        });

      for (const slideFile of slideFiles) {
        const xml = await zip.files[slideFile].async('string');
        // Extract text between <a:t> tags
        const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
        if (matches) {
          text += matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ') + '\n\n';
        }
      }
      return text.trim();
    }

    // Images (.jpg, .jpeg, .png, .gif, .bmp, .webp)
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext) || mimeType.startsWith('image/')) {
      try {
        const result = await Tesseract.recognize(filePath, 'eng', {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR progress: ${(m.progress * 100).toFixed(0)}%`);
            }
          },
        });
        const text = result.data.text.trim();
        if (text && text.length > 0) {
          return text;
        }
        return null;
      } catch (ocrError) {
        console.error('OCR error:', ocrError.message);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting text from file:', error.message);
    return null;
  }
}

module.exports = { extractTextFromFile };
