const canvas = document.querySelector(".canvas");
const inputSize = document.querySelector(".input-size");
const inputColor = document.querySelector(".input-color");
const usedColors = document.querySelector(".used-colors");
const buttonSave = document.querySelector(".button-save");
const colResize = document.querySelector(".resize");
const main = document.querySelector("main");

const MIN_CANVAS_SIZE = 4;

let isPainting = false;
let isResizing = false;

const createElement = (tag, className = "") => {
    const element = document.createElement(tag);
    element.className = className;
    return element;
};

const setPixelColor = (pixel) => {
    pixel.style.backgroundColor = inputColor.value;
};

const createPixel = () => {
    const pixel = createElement("div", "pixel");

    pixel.addEventListener("mousedown", () => setPixelColor(pixel));
    pixel.addEventListener("mouseover", () => {
        if (isPainting) setPixelColor(pixel);
    });

    return pixel;
};

const loadCanvas = () => {
    const length = inputSize.value;
    canvas.innerHTML = "";

    for (let i = 0; i < length; i += 1) {
        const row = createElement("div", "row");

        for (let j = 0; j < length; j += 1) {
            row.append(createPixel());
        }

        canvas.append(row);
    }
};

const updateCanvasSize = () => {
    if (inputSize.value >= MIN_CANVAS_SIZE) {
        loadCanvas();
    }
};

const changeColor = () => {
    const button = createElement("button", "button-color");
    const currentColor = inputColor.value;

    button.style.backgroundColor = currentColor;
    button.setAttribute("data-color", currentColor);
    button.addEventListener("click", () => (inputColor.value = currentColor));

    const savedColors = Array.from(usedColors.children);
    const check = (btn) => btn.getAttribute("data-color") !== currentColor;

    if (savedColors.every(check)) {
        usedColors.append(button);
    }
};

// Função para converter RGB para HEX
const rgbToHex = (rgb) => {
    if (!rgb || rgb === "rgb(68, 68, 68)") return "#444444";
    const [r, g, b] = rgb.match(/\d+/g).map(Number);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
};

// Função ajustada para coletar as cores dos pixels pintados
const getPixelColors = () => {
    const rows = document.querySelectorAll(".row");
    const colorData = [];

    rows.forEach((row, rowIndex) => {
        const rowLetter = String.fromCharCode(65 + rowIndex); // 65 é 'A'
        const pixels = row.querySelectorAll(".pixel");
        pixels.forEach((pixel, colIndex) => {
            const color = pixel.style.backgroundColor;
            const hexColor = rgbToHex(color);

            if (hexColor !== "#444444") {
                const colorName = colorNamer(hexColor).ntc[0].name || "Desconhecida";
                colorData.push(`${rowLetter}${colIndex + 1}: ${hexColor} ${colorName}`);
            }
        });
    });

    return colorData;
};

// Função para salvar o canvas como PDF
const saveCanvas = async () => {
    const a4WidthPx = 2480; // Largura total de um papel A4 em pixels
    const originalWidth = canvas.offsetWidth;
    const originalHeight = canvas.offsetHeight;

    // Ajustando o canvas para capturar em alta resolução
    canvas.style.width = `${a4WidthPx}px`;
    canvas.style.height = `${a4WidthPx}px`;

    try {
        await new Promise((resolve) => setTimeout(resolve, 300)); // Atraso para atualização do DOM

        const image = await html2canvas(canvas, {
            width: a4WidthPx,
            height: a4WidthPx,
            backgroundColor: "#FFFFFF",
            scale: 2,
        });

        canvas.style.width = `${originalWidth}px`;
        canvas.style.height = `${originalHeight}px`;

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
        });

        const imgData = image.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 10, 10, 600, 600); // Imagem ajustada para A4

        const colorData = getPixelColors();

        if (colorData.length > 0) {
            pdf.setFontSize(12);
            pdf.text("Instruções (Quadrados Pintados):", 10, 210);
            let yPosition = 220;

            colorData.forEach((instruction) => {
                pdf.text(instruction, 10, yPosition);
                yPosition += 10;
                if (yPosition > 280) {
                    pdf.addPage();
                    yPosition = 20;
                }
            });
        }

        pdf.save("pixelart_a4_com_fundo_branco.pdf");
    } catch (error) {
        console.error("Erro ao gerar o PDF:", error);
    }
};

canvas.addEventListener("mousedown", () => (isPainting = true));
canvas.addEventListener("mouseup", () => (isPainting = false));

inputSize.addEventListener("change", updateCanvasSize);
inputColor.addEventListener("change", changeColor);

colResize.addEventListener("mousedown", () => (isResizing = true));

main.addEventListener("mouseup", () => (isResizing = false));
main.addEventListener("mousemove", ({ clientX }) => resizeCanvas(clientX));

const resizeCanvas = (cursorPositionX) => {
    if (!isResizing) return;

    const canvasOffset = canvas.getBoundingClientRect().left;
    const width = `${cursorPositionX - canvasOffset - 20}px`;

    canvas.style.maxWidth = width;
    colResize.style.height = width;
};

buttonSave.addEventListener("click", saveCanvas);

loadCanvas();