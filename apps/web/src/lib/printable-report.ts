export type PrintableReportOpenResult = "window" | "iframe" | "unavailable";

export function openPrintableHtmlReport(
  html: string,
): PrintableReportOpenResult {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "unavailable";
  }

  const reportWindow = window.open("about:blank", "_blank");

  if (reportWindow && !reportWindow.closed) {
    try {
      reportWindow.opener = null;
      writeHtml(reportWindow.document, html);
      printWhenReady(reportWindow);
      return "window";
    } catch (error) {
      console.error(error);
      try {
        reportWindow.close();
      } catch {
        // Ignore close failures and fall back to iframe printing.
      }
    }
  }

  return printWithHiddenFrame(html);
}

export function getPrintableReportStatus(result: PrintableReportOpenResult) {
  if (result === "window") {
    return "PDF 저장 창을 열었습니다. 브라우저 인쇄 화면에서 PDF 저장을 선택해 주세요.";
  }

  if (result === "iframe") {
    return "새 창이 제한되어 현재 화면에서 PDF 저장 창을 열었습니다.";
  }

  return "브라우저가 PDF 저장 창을 열지 못했습니다. 팝업 허용 후 다시 시도해 주세요.";
}

function printWithHiddenFrame(html: string): PrintableReportOpenResult {
  const frame = document.createElement("iframe");

  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";

  document.body.appendChild(frame);

  const frameWindow = frame.contentWindow;
  const frameDocument = frame.contentDocument ?? frameWindow?.document;

  if (!frameWindow || !frameDocument) {
    frame.remove();
    return "unavailable";
  }

  writeHtml(frameDocument, html);
  scheduleFrameCleanup(frame, frameWindow);
  printWhenReady(frameWindow);

  return "iframe";
}

function writeHtml(targetDocument: Document, html: string) {
  targetDocument.open();
  targetDocument.write(html);
  targetDocument.close();
}

function printWhenReady(targetWindow: Window) {
  const targetDocument = targetWindow.document;
  const images = Array.from(targetDocument.images);
  const ready = images.length
    ? Promise.allSettled(images.map(waitForImage))
    : Promise.resolve();

  void ready.then(() => {
    window.setTimeout(() => {
      targetWindow.focus();
      targetWindow.print();
    }, 150);
  });
}

function waitForImage(image: HTMLImageElement) {
  if (image.complete) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(resolve, 2500);
    const done = () => {
      window.clearTimeout(timeoutId);
      image.removeEventListener("load", done);
      image.removeEventListener("error", done);
      resolve();
    };

    image.addEventListener("load", done, { once: true });
    image.addEventListener("error", done, { once: true });
  });
}

function scheduleFrameCleanup(frame: HTMLIFrameElement, frameWindow: Window) {
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) {
      return;
    }

    cleaned = true;
    frame.remove();
  };

  frameWindow.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(cleanup, 15000);
}
