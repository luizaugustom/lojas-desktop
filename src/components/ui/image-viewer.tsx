import { Dialog, DialogContent } from './dialog';
import { Button } from './button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface ImageViewerProps {
  open: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  alt?: string;
}

export function ImageViewer({ open, onClose, images, initialIndex = 0, alt = 'Imagem' }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!open || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0">
        <div className="relative">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <img
              src={currentImage}
              alt={alt}
              className="w-full h-auto max-h-[80vh] object-contain mx-auto"
            />

            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {currentIndex + 1} de {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

