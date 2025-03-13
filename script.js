// PDF.js Worker Dosyası Tanımlama
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// HTML Elemanlarını Seç
const fileInput = document.getElementById('fileInput');
const convertToWord = document.getElementById('convertToWord');
const previewContent = document.getElementById('previewContent');
const fileNameDisplay = document.getElementById('fileName');

let selectedFile = null;
let pdfText = [];

fileInput.addEventListener('change', handleFileSelect);
convertToWord.addEventListener('click', createWordDocument);

// 📌 PDF Dosyası Seçildiğinde Çalışan Fonksiyon
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length && files[0].type === 'application/pdf') {
        selectedFile = files[0];
        fileNameDisplay.textContent = selectedFile.name; // Dosya adını göster
        parsePDF();
    } else {
        alert("Lütfen geçerli bir PDF dosyası yükleyin.");
    }
}

// 📌 PDF İçeriğini Okuma ve Metne Dönüştürme
function parsePDF() {
    const fileReader = new FileReader();
    
    fileReader.onload = function(event) {
        const typedArray = new Uint8Array(event.target.result);
        pdfText = [];

        const loadingTask = pdfjsLib.getDocument({data: typedArray});
        loadingTask.promise.then(pdf => {
            let pagesPromises = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                pagesPromises.push(
                    pdf.getPage(i).then(page => {
                        return page.getTextContent().then(textContent => {
                            return textContent.items.map(item => item.str).join(' ');
                        });
                    })
                );
            }

            Promise.all(pagesPromises).then(pages => {
                pdfText = pages;
                previewContent.textContent = pdfText.join("\n\n"); // Önizleme Alanına Yaz
            });
        });
    };

    fileReader.readAsArrayBuffer(selectedFile);
}

// 📌 PDF'yi Word'e Dönüştürme (DÜZELTİLMİŞ VERSİYON)
function createWordDocument() {
    if (!selectedFile) return alert("Önce bir PDF yükleyin!");

    const docxContent =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body>';

    let paragraphs = "";
    pdfText.forEach(text => {
        const safeText = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

        paragraphs += `<w:p><w:r><w:t>${safeText}</w:t></w:r></w:p>`;
    });

    const finalDocx = docxContent + paragraphs + '</w:body></w:document>';

    // ZIP Paketi oluştur (DOCX formatı için gerekli)
    const zip = new JSZip();

    // DOCX için gerekli dosyaları ekleyelim
    zip.file("[Content_Types].xml", `
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
            <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
            <Default Extension="xml" ContentType="application/xml"/>
            <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>
    `);

    zip.file("word/document.xml", finalDocx);
    
    zip.file("_rels/.rels", `
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>
    `);

    zip.file("word/_rels/document.xml.rels", `
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        </Relationships>
    `);

    // DOCX dosyasını oluştur ve indir
    zip.generateAsync({ type: "blob" }).then(content => {
        saveAs(content, selectedFile.name.replace(".pdf", ".docx"));
    });
}
