"use client"

import { useState, useEffect, useMemo } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Loader2, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { getAccessToken } from "@/lib/auth"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileId: number
  fileUrl: string
  fileName: string
  source?: "chat" | "task"
  contentUrl?: string
  fullPageUrl?: string
}

export default function PdfViewerModal({ open, onOpenChange, fileId, fileUrl, fileName, source = "chat", contentUrl, fullPageUrl }: PdfViewerModalProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!open || !fileId) {
      setPdfData(null)
      setLoadError(false)
      return
    }

    const token = getAccessToken()
    if (!token) return

    const url = contentUrl
      ? `${process.env.NEXT_PUBLIC_API_URL}${contentUrl}`
      : `${process.env.NEXT_PUBLIC_API_URL}/file/${fileId}/content?source=${source}`

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch")
        return res.arrayBuffer()
      })
      .then((buf) => setPdfData(new Uint8Array(buf)))
      .catch(() => setLoadError(true))
  }, [open, fileId, source, contentUrl])

  const documentFile = useMemo(
    () => (pdfData ? { data: new Uint8Array(pdfData) } : null),
    [pdfData]
  )

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPageNumber(1); setNumPages(0); setPdfData(null) } onOpenChange(v) }}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 border-b px-4 py-3">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="truncate text-sm font-medium">
              {fileName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {numPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={pageNumber <= 1}
                    onClick={() => setPageNumber((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-[60px] text-center">
                    {pageNumber} / {numPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={pageNumber >= numPages}
                    onClick={() => setPageNumber((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {fullPageUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Open with AI assistant"
                  onClick={() => window.open(fullPageUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              <a href={fileUrl} target="_blank" rel="noreferrer" download>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Download">
                  <Download className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto flex justify-center bg-muted/30 p-4">
          {open && loadError && (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <p className="text-sm text-muted-foreground">Failed to load PDF</p>
              <a href={fileUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">Open in new tab</Button>
              </a>
            </div>
          )}
          {open && !loadError && !pdfData && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {open && documentFile && (
            <Document
              file={documentFile}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <p className="text-sm text-muted-foreground">Failed to render PDF</p>
                  <a href={fileUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">Open in new tab</Button>
                  </a>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                width={800}
                loading={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
              />
            </Document>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
