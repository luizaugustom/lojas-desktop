import { Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-utils';

interface ProductImageProps {
  photos?: string[];
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function ProductImage({ photos, name, className, size = 'md', onClick }: ProductImageProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const firstPhoto = photos && photos.length > 0 ? photos[0] : null;
  const imageUrl = firstPhoto ? getImageUrl(firstPhoto) : null;
  const hasImage = !!imageUrl;

  if (!hasImage) {
    return (
      <div
        className={cn(
          'rounded-md border bg-muted flex items-center justify-center',
          sizeClasses[size],
          className
        )}
      >
        <Box className="h-1/2 w-1/2 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl || undefined}
      alt={name}
      className={cn(
        'rounded-md border object-cover',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  );
}

