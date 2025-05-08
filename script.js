// Seleciona os elementos principais da interface
const canvas = document.querySelector(".canvas");
const inputSize = document.querySelector(".input-size");
const inputColor = document.querySelector(".input-color");
const usedColors = document.querySelector(".used-colors");
const buttonSave = document.querySelector(".button-save");
const buttonClear = document.querySelector(".button-clear");
const colResize = document.querySelector(".resize");
const main = document.querySelector("main");

const MIN_CANVAS_SIZE = 4;

let isPainting = false;
let isResizing = false;
let paintHistory = []; // Pilha para rastrear as ações de pintura

// Função para criar um elemento HTML com classe opcional
const createElement = (tag, className = "") => {
    const element = document.createElement(tag);
    element.className = className;
    return element;
};

// Define a cor do pixel quando clicado ou arrastado
const setPixelColor = (pixel) => {
    const previousColor = pixel.style.backgroundColor || "#444"; // Cor anterior (padrão #444 se não pintado)
    const newColor = inputColor.value;
    pixel.style.backgroundColor = newColor;

    // Registra a ação na pilha de histórico
    paintHistory.push({
        pixel: pixel,
        previousColor: previousColor,
        newColor: newColor
    });
};

// Cria um pixel interativo
const createPixel = () => {
    const pixel = createElement("div", "pixel");

    pixel.addEventListener("mousedown", () => setPixelColor(pixel));
    pixel.addEventListener("mouseover", () => {
        if (isPainting) setPixelColor(pixel);
    });

    return pixel;
};

// Carrega o canvas com a grade de pixels
const loadCanvas = () => {
    const length = inputSize.value;
    canvas.innerHTML = "";
    paintHistory = []; // Limpa o histórico ao recarregar o canvas

    for (let i = 0; i < length; i += 1) {
        const row = createElement("div", "row");

        for (let j = 0; j < length; j += 1) {
            row.append(createPixel());
        }

        canvas.append(row);
    }
};

// Desfaz a última pintura
const undoLastPaint = () => {
    if (paintHistory.length === 0) return; // Nada para desfazer

    const lastAction = paintHistory.pop(); // Remove a última ação do histórico
    lastAction.pixel.style.backgroundColor = lastAction.previousColor; // Restaura a cor anterior
};

// Atualiza o tamanho do canvas
const updateCanvasSize = () => {
    if (inputSize.value >= MIN_CANVAS_SIZE) {
        loadCanvas();
    }
};

// Salva e exibe as cores utilizadas
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

// Converte a cor RGB para HEX
const rgbToHex = (rgb) => {
    if (!rgb || rgb === "rgb(68, 68, 68)") return "#444444";
    const [r, g, b] = rgb.match(/\d+/g).map(Number);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
};

// Captura os dados das cores dos pixels pintados e define a lógica das instruções por linha
const getPixelColors = () => {
    const rows = document.querySelectorAll(".row");
    const colorData = [];
    const movementData = [];

    rows.forEach((row, rowIndex) => {
        const rowLetter = String.fromCharCode(65 + rowIndex);
        const pixels = row.querySelectorAll(".pixel");
        let emptyCount = 0;
        let movement = `Line ${rowIndex + 1} = `;

        pixels.forEach((pixel, colIndex) => {
            const color = pixel.style.backgroundColor;
            const hexColor = rgbToHex(color);

            if (hexColor !== "#444444") {
                const colorName = colorNamer(hexColor).ntc[0].name || "Desconhecida";
                colorData.push(`${rowLetter}${colIndex + 1}: ${hexColor} ${colorName}`);

                movement += `${emptyCount} -> `; // Usa -> ao invés de ➝
                emptyCount = 0; // Resetar contador
            } else {
                emptyCount++;
            }

            if (colIndex === pixels.length - 1) {
                movement += `${emptyCount} ->`; // Adiciona casas restantes da linha
            }
        });

        movementData.push(movement);
    });

    return { colorData, movementData };
};

// Salva o canvas e gera o PDF com todas as instruções
const saveCanvas = async () => {
    const a4WidthPx = 2480;
    const originalWidth = canvas.offsetWidth;
    const originalHeight = canvas.offsetHeight;

    canvas.style.width = `${a4WidthPx}px`;
    canvas.style.height = `${a4WidthPx}px`;

    try {
        await new Promise((resolve) => setTimeout(resolve, 300));

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
        pdf.addImage(imgData, "PNG", 10, 10, 190, 190); // Ajustado para caber melhor no A4
        
        const { colorData, movementData } = getPixelColors();
        let yPosition = 220; 

        if (colorData.length > 0) {
            pdf.setFontSize(12);
            pdf.text("Instruções (Quadrados Pintados):", 10, yPosition);
            yPosition += 7;

            colorData.forEach((instruction) => {
                if (yPosition > 280) {
                    pdf.addPage();
                    yPosition = 20;
                }
                pdf.text(instruction, 10, yPosition);
                yPosition += 7;
            });
        }

        pdf.text("Instruções (Casas Pintadas por Linha):", 10, yPosition + 12);
        yPosition += 22;

        movementData.forEach((instruction) => {
            if (yPosition > 280) {
                pdf.addPage();
                yPosition = 20;
            }
            pdf.text(instruction, 10, yPosition);
            yPosition += 7;
        });

        pdf.save("pixelart_com_instrucoes.pdf");
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

buttonClear.addEventListener("click", undoLastPaint);

buttonSave.addEventListener("click", saveCanvas);

const resizeCanvas = (cursorPositionX) => {
    if (!isResizing) return;

    const canvasOffset = canvas.getBoundingClientRect().left;
    const width = `${cursorPositionX - canvasOffset - 20}px`;

    canvas.style.maxWidth = width;
    colResize.style.height = width;
};

loadCanvas();