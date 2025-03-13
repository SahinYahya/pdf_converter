// PDF.js Worker Dosyası Tanımlama
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// HTML'deki Elemanları Seç
const fileInput = document.getElementById('fileInput');
const convertToWord = document.getElementById('convertToWord');
const convertToExcel = document.getElementById('convertToExcel');
const previewContent = document.getElementById('previewContent');
const fileNameDisplay = document.getElementById('fileName');

let selectedFile = null;
let pdfText = [];

fileInput.addEventListener('change', handleFileSelect);
convertToWord.addEventListener('click', createWordDocument);
convertToExcel.addEventListener('click', createExcelDocument);

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

// 📌 PDF'yi Word'e Dönüştürme
function createWordDocument() {
    if (!selectedFile) return alert("Önce bir PDF yükleyin!");

    const zip = new JSZip();
    let docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>';

    pdfText.forEach(text => {
        docXml += `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
    });

    docXml += '</w:body></w:document>';
    zip.file("word/document.xml", docXml);

    zip.generateAsync({type: 'blob'}).then(content => {
        saveAs(content, selectedFile.name.replace('.pdf', '.docx'));
    });
}

// 📌 PDF'yi Excel'e Dönüştürme
function createExcelDocument() {
    if (!selectedFile) return alert("Önce bir PDF yükleyin!");

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(pdfText.map(text => [text]));

    XLSX.utils.book_append_sheet(wb, ws, "Sayfa1");
    const excelBuffer = XLSX.write(wb, {bookType: 'xlsx', type: 'array'});
    const blob = new Blob([excelBuffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});

    saveAs(blob, selectedFile.name.replace('.pdf', '.xlsx'));
}
