import { useEffect } from "react";
import { getProductConfig } from "./productConfig";

/** Keep <title> / description in sync with the active product skin. */
export function ProductDocumentMeta() {
  const product = getProductConfig();

  useEffect(() => {
    document.title = product.documentTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", product.description);
    const apple = document.querySelector(
      'meta[name="apple-mobile-web-app-title"]'
    );
    if (apple) apple.setAttribute("content", product.brandName);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", product.documentTitle);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", product.description);
  }, [product]);

  return null;
}
