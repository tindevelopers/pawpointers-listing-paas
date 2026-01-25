import * as pdfParse from "pdf-parse";
import mammoth from "mammoth";

type ParsedFile = {
  title: string;
  content: string;
  sourceFileName: string;
  contentType: string;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const SUPPORTED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "text/plain"];

function getExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export function isSupportedFile(file: File): boolean {
  const ext = getExtension(file.name);
  return (
    SUPPORTED_TYPES.includes(file.type) ||
    ["pdf", "docx", "doc", "txt"].includes(ext)
  );
}

export async function parseFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File is too large. Max 10MB.");
  }
  if (!isSupportedFile(file)) {
    throw new Error("Unsupported file type. Please upload PDF, DOCX, or TXT.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = getExtension(file.name);

  let content = "";
  if (file.type === "application/pdf" || ext === "pdf") {
    const result = await pdfParse(buffer);
    content = result.text || "";
  } else if (file.type === "text/plain" || ext === "txt") {
    content = buffer.toString("utf-8");
  } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.type === "application/msword" || ext === "docx" || ext === "doc") {
    const result = await mammoth.extractRawText({ buffer });
    content = result.value || "";
  } else {
    throw new Error("Unsupported file type. Please upload PDF, DOCX, or TXT.");
  }

  if (!content.trim()) {
    throw new Error("No extractable text found in the file.");
  }

  const title = file.name.replace(/\.[^.]+$/, "") || "Untitled Document";
  return {
    title,
    content,
    sourceFileName: file.name,
    contentType: file.type || ext,
  };
}

export function getMaxFileSize(): number {
  return MAX_FILE_SIZE_BYTES;
}

