import { useState } from 'react';
import { Edit, Trash2, Package, AlertCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ConfirmationModal } from '../ui/confirmation-modal';
import { ImageViewer } from '../ui/image-viewer';
import { useAuth } from '../../hooks/useAuth';
import { handleApiError } from '../../lib/handleApiError';
import { formatCurrency, formatDate } from '../../lib/utils';
import { getImageUrl } from '../../lib/image-utils';
import { ProductImage } from './ProductImage';
import type { Product } from '../../types';

interface ProductsTableProps {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onRefetch: () => void;
  canManage?: boolean;
  onRegisterLoss?: (product: Product) => void;
}

export function ProductsTable({ products, isLoading, onEdit, onRefetch, canManage = true, onRegisterLoss }: ProductsTableProps) {
  const { api } = useAuth();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ images: string[]; index: number } | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    open: boolean;
    product: Product | null;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    product: null,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const handleImageClick = (product: Product) => {
    if (product.photos && product.photos.length > 0) {
      const validImages = product.photos
        .map((photo) => getImageUrl(photo))
        .filter((url): url is string => url !== null);

      if (validImages.length > 0) {
        setSelectedImage({ images: validImages, index: 0 });
      }
    }
  };

  const handleDeleteClick = (product: Product) => {
    if (!canManage) {
      toast.error('Você não tem permissão para excluir produtos.');
      return;
    }

    setConfirmationModal({
      open: true,
      product,
      title: 'Excluir Produto',
      description: `Tem certeza que deseja excluir o produto "${product.name}"? Esta ação não pode ser desfeita e todas as informações do produto serão perdidas permanentemente.`,
      onConfirm: () => {
        setConfirmationModal((prev) => ({ ...prev, open: false }));
        executeDelete(product.id);
      },
    });
  };

  const executeDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/product/${id}`);
      toast.success('Produto excluído com sucesso!');
      onRefetch();
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      handleApiError(error);
    } finally {
      setDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-4 sm:p-8 text-center">
          <div className="inline-block h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground">Carregando produtos...</p>
        </div>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <div className="p-4 sm:p-8 text-center">
          <Package className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm sm:text-base font-semibold">Nenhum produto encontrado</h3>
          {canManage ? (
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Comece adicionando um novo produto ao seu catálogo.
            </p>
          ) : (
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Não há produtos para exibir.</p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Foto</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Código de Barras</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Estoque</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const stockNum = Number(product.stockQuantity ?? 0);
            const isLowStock = !Number.isNaN(stockNum) && stockNum <= 3;
            const isExpiringSoon =
              product.expirationDate && new Date(product.expirationDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            return (
              <TableRow key={product.id}>
                <TableCell>
                  <ProductImage photos={product.photos} name={product.name} size="md" onClick={() => handleImageClick(product)} />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.barcode}</TableCell>
                <TableCell>{formatCurrency(product.price)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{product.stockQuantity}</span>
                    {isLowStock && <AlertCircle className="h-4 w-4 text-orange-500" />}
                  </div>
                </TableCell>
                <TableCell>{product.category || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {product.expirationDate && product.expirationDate !== 'null' ? formatDate(product.expirationDate) : '-'}
                    {isExpiringSoon && <AlertCircle className="h-4 w-4 text-red-500" />}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {canManage && (
                      <>
                        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(product)} aria-label={`Editar produto ${product.name}`}>
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteClick(product)}
                          disabled={deleting === product.id}
                          aria-label={`Excluir produto ${product.name}`}
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </>
                    )}
                    {onRegisterLoss && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRegisterLoss(product)}
                        aria-label={`Registrar perda do produto ${product.name}`}
                        className="text-orange-600 hover:text-orange-700"
                        title="Registrar perda"
                      >
                        <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <ConfirmationModal
        open={confirmationModal.open}
        onClose={() => setConfirmationModal((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        description={confirmationModal.description}
        variant="destructive"
        confirmText="Excluir"
        cancelText="Cancelar"
        loading={deleting === confirmationModal.product?.id}
      />

      {selectedImage && (
        <ImageViewer
          open={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          images={selectedImage.images}
          initialIndex={selectedImage.index}
          alt="Imagem do produto"
        />
      )}
    </Card>
  );
}

