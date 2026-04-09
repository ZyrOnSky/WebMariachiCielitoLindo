import path from "node:path";
import { fileURLToPath } from "node:url";
import { mdToPdf } from "md-to-pdf";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "pdf");

const stylesheet = path.join(rootDir, "styles", "proforma-pdf.css");

const proformas = [
  {
    input: "PROFORMA_MARIACHI_CIELITO_LINDO.md",
    output: "PROFORMA_1_WEB_MARIACHI_CIELITO_LINDO.pdf",
  },
  {
    input: "PROFORMA_APP_FIDELIDAD_MARIACHI_CIELITO_LINDO.md",
    output: "PROFORMA_2_APP_FIDELIDAD_MARIACHI_CIELITO_LINDO.pdf",
  },
];

const render = async ({ input, output }) => {
  const sourcePath = path.join(rootDir, input);
  const destPath = path.join(outDir, output);

  const result = await mdToPdf(
    { path: sourcePath },
    {
      dest: destPath,
      stylesheet: [stylesheet],
      pdf_options: {
        format: "A4",
        printBackground: true,
        margin: {
          top: "16mm",
          right: "12mm",
          bottom: "16mm",
          left: "12mm",
        },
      },
      marked_options: {
        headerIds: false,
        mangle: false,
      },
    }
  );

  if (!result) {
    throw new Error(`No se pudo generar PDF para ${input}`);
  }

  return destPath;
};

const main = async () => {
  const generated = [];

  for (const p of proformas) {
    const filePath = await render(p);
    generated.push(filePath);
  }

  console.log("PDFs generados:");
  for (const filePath of generated) {
    console.log(`- ${filePath}`);
  }
};

main().catch((err) => {
  console.error("Error generando proformas PDF:");
  console.error(err.message);
  process.exit(1);
});
