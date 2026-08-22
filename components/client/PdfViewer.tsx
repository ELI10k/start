"use client";

import { useState } from "react";
import { ExternalLink, FileText } from "lucide-react";

/* A guide used to be a single button that threw the client out to the school
   that hosts the file. It now opens where they already are.
   It is not embedded on arrival: these guides run from 150KB to 17MB, and a
   phone on mobile data should not spend seventeen megabytes on a page the
   client may only be passing through. One tap loads it; the link out stays
   alongside for anyone who wants the file itself, to keep or to print. */
export default function PdfViewer({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="cinema-pdf">
      {open ? (
        <object
          data={url}
          type="application/pdf"
          aria-label={title}
          className="cinema-pdf__frame"
        >
          {/* iOS Safari refuses to render a framed PDF and shows this instead,
              so the guide is never a blank rectangle with no way forward. */}
          <div className="cinema-empty">
            <p>הדפדפן הזה לא מציג מדריכים בתוך העמוד.</p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="cinema-button cinema-button--play mt-4 inline-flex"
            >
              <ExternalLink aria-hidden="true" size={19} />
              פתיחת המדריך
            </a>
          </div>
        </object>
      ) : null}
      <div className="cinema-actions">
        {open ? null : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="cinema-button cinema-button--play"
          >
            <FileText aria-hidden="true" size={19} />
            פתיחת המדריך
          </button>
        )}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="cinema-button cinema-button--ghost"
        >
          <ExternalLink aria-hidden="true" size={19} />
          {open ? "פתיחה בחלון מלא" : "הורדה"}
        </a>
      </div>
    </div>
  );
}
