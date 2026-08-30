/**
 * Gerenciador de downloads de drivers
 * Implementa download HTTP/HTTPS com progresso e verificação de integridade
 */
export interface DownloadProgress {
    received: number;
    total: number;
    percentage: number;
    speed: number;
}
export interface DownloadOptions {
    url: string;
    destination: string;
    expectedHash?: string;
    hashAlgorithm?: 'md5' | 'sha256';
    onProgress?: (progress: DownloadProgress) => void;
    timeout?: number;
    retries?: number;
}
export interface DownloadResult {
    success: boolean;
    filePath: string;
    error?: string;
    hash?: string;
    verified?: boolean;
}
/**
 * Faz download de um arquivo com suporte a progresso
 */
export declare function downloadFile(options: DownloadOptions): Promise<DownloadResult>;
/**
 * Obtém caminho do diretório de cache de drivers
 */
export declare function getDriversCacheDir(): string;
/**
 * Verifica se arquivo já está em cache
 */
export declare function getCachedFile(fileName: string, expectedHash?: string): Promise<string | null>;
/**
 * Adiciona arquivo ao cache
 */
export declare function cacheFile(sourcePath: string, fileName: string): Promise<string>;
/**
 * Limpa cache antigo (mantém apenas os últimos N dias)
 */
export declare function cleanOldCache(daysToKeep?: number): Promise<void>;
