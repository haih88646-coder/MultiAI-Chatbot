const { extractTextFromFile } = require('./src/ai/fileProcessor');
const fs = require('fs');
const path = require('path');

async function test() {
  console.log('🧪 Testing file processor...\n');

  // Create test files
  const testDir = path.join(__dirname, 'test-files');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);

  // Test TXT
  const txtPath = path.join(testDir, 'test.txt');
  fs.writeFileSync(txtPath, 'Hello from TXT file! 2+2=4');
  console.log('--- TXT ---');
  const txtResult = await extractTextFromFile(txtPath, 'text/plain', 'test.txt');
  console.log('Result:', txtResult);
  fs.unlinkSync(txtPath);

  // Test PDF (create a simple PDF-like buffer won't work, skip for now)
  console.log('\n--- PDF ---');
  console.log('Skipped - need actual PDF file');

  // Test Word (create a simple docx won't work easily, skip)
  console.log('\n--- Word ---');
  console.log('Skipped - need actual DOCX file');

  // Test Excel
  const XLSX = require('xlsx');
  const xlsxPath = path.join(testDir, 'test.xlsx');
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Name', 'Age'], ['Alice', 30], ['Bob', 25]]), 'Sheet1');
  XLSX.writeFile(wb, xlsxPath);
  console.log('--- Excel ---');
  const xlsxResult = await extractTextFromFile(xlsxPath, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'test.xlsx');
  console.log('Result:', xlsxResult);
  fs.unlinkSync(xlsxPath);

  // Test PowerPoint
  const JSZip = require('jszip');
  const pptxPath = path.join(testDir, 'test.pptx');
  const pptxContent = fs.readFileSync(path.join(__dirname, 'node_modules', 'pptx', 'test', 'fixtures', 'basic.pptx'));
  // Create a minimal pptx
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>');
  zip.file('ppt/presentation.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>');
  zip.file('ppt/slides/slide1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:sp><p:txBody><a:p><a:r><a:t>Hello from PowerPoint!</a:t></a:r></a:p></p:txBody></p:sp></p:cSld></p:sld>');
  zip.file('ppt/_rels/presentation.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>');
  zip.file('ppt/slides/_rels/slide1.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>');
  const pptxBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(pptxPath, pptxBuffer);
  console.log('--- PowerPoint ---');
  const pptxResult = await extractTextFromFile(pptxPath, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'test.pptx');
  console.log('Result:', pptxResult);
  fs.unlinkSync(pptxPath);

  // Clean up
  fs.rmdirSync(testDir);

  console.log('\n✅ Test complete.');
}

test().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
