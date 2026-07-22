import { fromPortableCsv, normalizeCampaignPack, type CampaignPack } from "./model";

const decoder = new TextDecoder();
const latinDecoder = new TextDecoder("latin1");

const u16 = (view: DataView, offset: number) => view.getUint16(offset, true);
const u32 = (view: DataView, offset: number) => view.getUint32(offset, true);

async function inflate(bytes: Uint8Array, format: "deflate" | "deflate-raw") {
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([input]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function documentXmlFromDocx(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const searchFloor = Math.max(0, bytes.length - 65_557);
  let end = -1;
  for (let offset = bytes.length - 22; offset >= searchFloor; offset -= 1) {
    if (u32(view, offset) === 0x06054b50) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error("The DOCX container has no readable directory.");

  const entries = u16(view, end + 10);
  let cursor = u32(view, end + 16);
  for (let index = 0; index < entries; index += 1) {
    if (u32(view, cursor) !== 0x02014b50) break;
    const method = u16(view, cursor + 10);
    const compressedSize = u32(view, cursor + 20);
    const nameLength = u16(view, cursor + 28);
    const extraLength = u16(view, cursor + 30);
    const commentLength = u16(view, cursor + 32);
    const localOffset = u32(view, cursor + 42);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (name === "word/document.xml") {
      if (u32(view, localOffset) !== 0x04034b50) throw new Error("The DOCX document entry is damaged.");
      const localNameLength = u16(view, localOffset + 26);
      const localExtraLength = u16(view, localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize);
      if (method === 0) return decoder.decode(compressed);
      if (method === 8) return decoder.decode(await inflate(compressed, "deflate-raw"));
      throw new Error(`Unsupported DOCX compression method ${method}.`);
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error("The DOCX file does not contain word/document.xml.");
}

const csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;

function textFromWordXml(xml: string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("The DOCX text layer is not valid XML.");
  const namespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const tables = Array.from(document.getElementsByTagNameNS(namespace, "tbl"));
  for (const table of tables) {
    const rows = Array.from(table.getElementsByTagNameNS(namespace, "tr")).map((row) =>
      Array.from(row.getElementsByTagNameNS(namespace, "tc")).map((cell) =>
        Array.from(cell.getElementsByTagNameNS(namespace, "t")).map((node) => node.textContent ?? "").join(""),
      ),
    );
    if (rows[0]?.[0]?.replaceAll('"', "").trim() === "record_type") {
      return rows.map((row) => row.map(csvCell).join(",")).join("\n");
    }
  }
  return Array.from(document.getElementsByTagNameNS(namespace, "p"))
    .map((paragraph) => Array.from(paragraph.getElementsByTagNameNS(namespace, "t")).map((node) => node.textContent ?? "").join(""))
    .filter(Boolean)
    .join("\n");
}

const decodePdfLiteral = (token: string) => {
  if (token.startsWith("<")) {
    const hex = token.slice(1, -1).replace(/\s/g, "");
    const padded = hex.length % 2 ? `${hex}0` : hex;
    const bytes = new Uint8Array(padded.length / 2);
    for (let index = 0; index < padded.length; index += 2) bytes[index / 2] = Number.parseInt(padded.slice(index, index + 2), 16);
    const utf16 = bytes.length > 2 && bytes[0] === 0xfe && bytes[1] === 0xff;
    if (utf16) {
      let value = "";
      for (let index = 2; index + 1 < bytes.length; index += 2) value += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
      return value;
    }
    return latinDecoder.decode(bytes);
  }
  return token.slice(1, -1)
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\([()\\])/g, "$1");
};

function textOperatorsFromPdf(content: string) {
  const blocks = content.match(/BT[\s\S]*?ET/g) ?? [content];
  return blocks.map((block) => {
    const values: string[] = [];
    const operation = /(\((?:\\.|[^\\)])*\)|<[0-9a-fA-F\s]+>)\s*Tj|\[((?:\((?:\\.|[^\\)])*\)|<[0-9a-fA-F\s]+>|[^\]])*)\]\s*TJ/g;
    for (const match of block.matchAll(operation)) {
      if (match[1]) values.push(decodePdfLiteral(match[1]));
      else for (const token of match[2].match(/\((?:\\.|[^\\)])*\)|<[0-9a-fA-F\s]+>/g) ?? []) values.push(decodePdfLiteral(token));
    }
    return values.join("");
  }).filter(Boolean).join("\n");
}

async function textFromPdf(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const source = latinDecoder.decode(bytes);
  const parts = [textOperatorsFromPdf(source)];
  const streamPattern = /stream\r?\n/g;
  for (const match of source.matchAll(streamPattern)) {
    const start = match.index + match[0].length;
    const end = source.indexOf("endstream", start);
    if (end < 0) continue;
    const dictionaryStart = source.lastIndexOf("<<", match.index);
    const dictionary = dictionaryStart >= 0 ? source.slice(dictionaryStart, match.index) : "";
    if (!dictionary.includes("/FlateDecode")) continue;
    let dataEnd = end;
    while (dataEnd > start && (bytes[dataEnd - 1] === 10 || bytes[dataEnd - 1] === 13)) dataEnd -= 1;
    try {
      const inflated = await inflate(bytes.subarray(start, dataEnd), "deflate");
      parts.push(textOperatorsFromPdf(latinDecoder.decode(inflated)));
    } catch {
      // A PDF may use chained filters or object streams. Other readable streams remain eligible.
    }
  }
  const text = parts.filter(Boolean).join("\n");
  if (!text.trim()) throw new Error("No readable text operators were found in the PDF.");
  return text;
}

export async function extractPortableDocumentText(file: File) {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (extension === "docx") return textFromWordXml(await documentXmlFromDocx(file));
  if (extension === "pdf") return textFromPdf(file);
  if (extension === "doc") throw new Error("Legacy .doc files must be saved as DOCX, PDF, CSV, or JSON before import.");
  return file.text();
}

export function campaignPackFromDocumentText(text: string): CampaignPack {
  const lines = text.replaceAll("\u00a0", " ").split(/\r?\n/);
  const csvStart = lines.findIndex((line) => /^\s*(?:"record_type"|record_type)\s*,/.test(line));
  if (csvStart >= 0) return fromPortableCsv(lines.slice(csvStart).join("\n"));

  const formatPosition = text.indexOf('"format"');
  if (formatPosition >= 0 && text.includes("delenda.quest.campaign.v1")) {
    const start = text.lastIndexOf("{", formatPosition);
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return normalizeCampaignPack(JSON.parse(text.slice(start, end + 1)));
  }
  throw new Error("No canonical campaign CSV or JSON payload was found in the document text.");
}
