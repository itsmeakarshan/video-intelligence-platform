import { jsPDF } from "jspdf";

interface PDFGeneratorOptions {
    title: string;
    videoTitle?: string;
    content: string;
    docType: "summary" | "notes";
    filename?: string;
}

function cleanPdfText(text: string): string {
    if (!text) return "";
    return text
        // Strip multi-byte emoji unicode characters that standard PDF Helvetica cannot render
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B06}\u{2934}\u{2935}\u{25AA}\u{25AB}\u{25FB}-\u{25FE}]/gu, "")
        // Replace non-breaking spaces and clean whitespace
        .replace(/\u00A0/g, " ")
        .trim();
}

export function generatePDF({ title, videoTitle, content, docType, filename }: PDFGeneratorOptions) {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let cursorY = margin;

    const formattedDate = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    // ----------------------------------------------------
    // HEADER BANNER
    // ----------------------------------------------------
    doc.setFillColor(15, 23, 42); // #0F172A dark slate background
    doc.rect(0, 0, pageWidth, 35, "F");

    // Accent line
    doc.setFillColor(20, 184, 166); // #14B8A6 teal accent
    doc.rect(0, 34, pageWidth, 1.5, "F");

    // Header Branding Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(248, 250, 252); // #F8FAFC
    doc.text("VIDEO INTELLIGENCE PLATFORM", margin, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // #94A3B8
    doc.text(`${title.toUpperCase()} • GENERATED REPORT`, margin, 24);

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(formattedDate, pageWidth - margin, 24, { align: "right" });

    cursorY = 46;

    // ----------------------------------------------------
    // DOCUMENT METADATA
    // ----------------------------------------------------
    const cleanVideoTitle = cleanPdfText(videoTitle || "");
    if (cleanVideoTitle) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 118, 110); // #0F766E
        doc.text("VIDEO SOURCE:", margin, cursorY);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59); // #1E293B
        const wrappedVideoTitle = doc.splitTextToSize(cleanVideoTitle, contentWidth - 35);
        doc.text(wrappedVideoTitle, margin + 35, cursorY);
        cursorY += Math.max(wrappedVideoTitle.length * 6, 8) + 4;
    } else {
        cursorY += 4;
    }

    // Horizontal Divider
    doc.setDrawColor(226, 232, 240); // #E2E8F0
    doc.setLineWidth(0.5);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 8;

    // ----------------------------------------------------
    // CONTENT PARSER & RENDERER HELPER
    // ----------------------------------------------------
    const checkPageBreak = (neededHeight: number) => {
        if (cursorY + neededHeight > pageHeight - margin - 15) {
            doc.addPage();
            cursorY = margin + 10;
        }
    };

    function renderFormattedText(
        text: string,
        startX: number,
        startY: number,
        maxWidth: number
    ): number {
        // Check for **Bold Title**: or **Bold Title** prefix
        const match = text.match(/^\*\*(.*?)\*\*:?\s*(.*)/);
        if (match) {
            const boldPart = match[1].trim() + ": ";
            const normalPart = match[2].replace(/\*\*(.*?)\*\*/g, "$1").trim();

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);

            const boldWidth = doc.getTextWidth(boldPart);
            doc.text(boldPart, startX, startY);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);

            if (normalPart) {
                const words = normalPart.split(" ");
                let currentLine = "";
                let isFirstLine = true;
                let currentY = startY;

                words.forEach((word) => {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
                    const allowedWidth = isFirstLine ? (maxWidth - boldWidth) : maxWidth;
                    const testWidth = doc.getTextWidth(testLine);

                    if (testWidth > allowedWidth && currentLine !== "") {
                        const posX = isFirstLine ? (startX + boldWidth) : startX;
                        doc.text(currentLine, posX, currentY);
                        currentY += 5;
                        checkPageBreak(5);
                        currentLine = word;
                        isFirstLine = false;
                    } else {
                        currentLine = testLine;
                    }
                });

                if (currentLine) {
                    const posX = isFirstLine ? (startX + boldWidth) : startX;
                    doc.text(currentLine, posX, currentY);
                    currentY += 5.5;
                    return currentY;
                }

                return currentY + 5.5;
            } else {
                return startY + 5.5;
            }
        } else {
            const cleanText = text.replace(/\*\*(.*?)\*\*/g, "$1");
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);

            const wrapped = doc.splitTextToSize(cleanText, maxWidth);
            doc.text(wrapped, startX, startY);
            return startY + wrapped.length * 5 + 1.5;
        }
    }

    const lines = content.split("\n");

    lines.forEach((rawLine) => {
        const line = cleanPdfText(rawLine);

        if (!line) {
            cursorY += 2;
            return;
        }

        // Horizontal Divider (--- or ***)
        if (line === "---" || line === "***") {
            checkPageBreak(8);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.5);
            doc.line(margin, cursorY, pageWidth - margin, cursorY);
            cursorY += 6;
        }
        // H1 Header (# Heading)
        else if (line.startsWith("# ")) {
            checkPageBreak(12);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(15, 118, 110); // Teal
            const headingText = line.replace(/^#\s+/, "").replace(/\*\*(.*?)\*\*/g, "$1");
            doc.text(headingText, margin, cursorY);
            cursorY += 8;
        }
        // H2 Header (## Heading)
        else if (line.startsWith("## ")) {
            checkPageBreak(10);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59); // Slate
            const headingText = line.replace(/^##\s+/, "").replace(/\*\*(.*?)\*\*/g, "$1");
            doc.text(headingText, margin, cursorY);
            cursorY += 7;
        }
        // H3 Header (### Heading)
        else if (line.startsWith("### ")) {
            checkPageBreak(8);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(51, 65, 85);
            const headingText = line.replace(/^###\s+/, "").replace(/\*\*(.*?)\*\*/g, "$1");
            doc.text(headingText, margin, cursorY);
            cursorY += 6;
        }
        // Bullet points (- or * or •)
        else if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
            checkPageBreak(6);
            const bulletText = line.replace(/^[-*•]\s+/, "");
            doc.setFillColor(20, 184, 166);
            doc.circle(margin + 2, cursorY - 1.5, 1, "F");

            cursorY = renderFormattedText(bulletText, margin + 6, cursorY, contentWidth - 6);
        }
        // Numbered points (1. 2.)
        else if (/^\d+\.\s+/.test(line)) {
            checkPageBreak(6);
            const match = line.match(/^(\d+\.)\s+(.*)/);
            const numStr = match ? match[1] : "•";
            const itemText = match ? match[2] : line;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(15, 118, 110);
            doc.text(numStr, margin, cursorY);

            cursorY = renderFormattedText(itemText, margin + 7, cursorY, contentWidth - 7);
        }
        // Standard Paragraph
        else {
            checkPageBreak(6);
            cursorY = renderFormattedText(line, margin, cursorY, contentWidth);
        }
    });

    // ----------------------------------------------------
    // PAGE NUMBERING FOOTER
    // ----------------------------------------------------
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        doc.text("Video Intelligence Platform — AI Document Export", margin, pageHeight - 7);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
    }

    // ----------------------------------------------------
    // SAVE FILE
    // ----------------------------------------------------
    const safeVideoName = (cleanVideoTitle || "video")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const outputFilename = filename || `${safeVideoName}-${docType}.pdf`;
    doc.save(outputFilename);
}
