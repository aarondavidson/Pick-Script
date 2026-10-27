import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ComicDef } from "@/engine/specials";
import { safePlayMediaUrl } from "@/engine/security";

interface ComicReaderProps {
  isOpen: boolean;
  onClose: () => void;
  comic: ComicDef;
}

export const ComicReader = ({ isOpen, onClose, comic }: ComicReaderProps) => {
  const [currentPage, setCurrentPage] = useState(0);

  const nextPage = () => {
    if (currentPage < comic.pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const page = comic.pages[currentPage];
  const pageImage = safePlayMediaUrl(page?.image);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-card border-4 border-primary/30 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pixel-font text-2xl text-accent flex items-center justify-between">
            <span>{comic.title}</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <div className="bg-background/50 border-2 border-primary/20 rounded-lg p-4 space-y-4">
            {/* Page Title */}
            <div className="text-center">
              <h3 className="pixel-font text-xl text-accent">{page.title}</h3>
              {page.subtitle && (
                <h4 className="text-lg text-muted-foreground italic">{page.subtitle}</h4>
              )}
            </div>
            
            {/* Comic Panel Image */}
            {pageImage && (
              <div className="relative rounded-lg overflow-hidden border-4 border-foreground/80 shadow-lg">
                <img
                  src={pageImage}
                  alt={page.panel}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            
            {/* Comic Text - Separate and fully readable */}
            <div className="bg-background/90 rounded-lg p-4 border-2 border-primary/20">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed text-base">
                {page.content}
              </p>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              onClick={prevPage}
              disabled={currentPage === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <span className="pixel-font text-sm text-muted-foreground">
              Page {currentPage + 1} of {comic.pages.length}
            </span>
            
            <Button
              variant="outline"
              onClick={nextPage}
              disabled={currentPage === comic.pages.length - 1}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
