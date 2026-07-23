import { useEffect, useState } from 'react';
import { Lock, Save, Upload, X } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { companyApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import { toast } from 'react-hot-toast';

export interface CertificadoDigitalSettingsProps {
  locked?: boolean;
  lockReason?: string;
  onNavigate?: (route: string) => void;
}

export function CertificadoDigitalSettings({ locked, lockReason }: CertificadoDigitalSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [certificatePassword, setCertificatePassword] = useState('');
  const [savingCertificatePassword, setSavingCertificatePassword] = useState(false);

  if (locked) {
    return (
      <Alert className="border-destructive/40 bg-destructive/5">
        <Lock className="h-4 w-4 text-destructive" aria-hidden />
        <AlertDescription>
          {lockReason ?? 'Esta categoria está bloqueada para a sua empresa.'}
        </AlertDescription>
      </Alert>
    );
  }

  const load = async () => {
    try {
      setLoading(true);
      const response = await companyApi.getFiscalConfig();
      setConfig(response.data);
    } catch (error) {
      console.error('Erro ao carregar configurações fiscais:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCertificateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
      toast.error('Arquivo deve ser .pfx ou .p12');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }
    setCertificateFile(file);
  };

  const handleUploadCertificate = async () => {
    if (!certificateFile) {
      toast.error('Selecione um arquivo de certificado');
      return;
    }
    if (!certificatePassword) {
      toast.error('Digite a senha do certificado antes de fazer upload');
      return;
    }

    try {
      setUploadingCertificate(true);
      await companyApi.updateFiscalConfig({ certificatePassword });
      await companyApi.uploadCertificate(certificateFile);
      toast.success('Certificado enviado com sucesso!');
      setCertificateFile(null);
      setCertificatePassword('');
      await load();
    } catch (error: any) {
      console.error('Erro ao enviar certificado:', error);
      handleApiError(error);
    } finally {
      setUploadingCertificate(false);
    }
  };

  const handleSaveCertificatePassword = async () => {
    if (!certificatePassword) {
      toast.error('Digite a senha do certificado');
      return;
    }
    try {
      setSavingCertificatePassword(true);
      await companyApi.updateFiscalConfig({ certificatePassword });
      toast.success('Senha do certificado salva com sucesso!');
      await load();
    } catch (error: any) {
      console.error('Erro ao salvar senha do certificado:', error);
      handleApiError(error);
    } finally {
      setSavingCertificatePassword(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Certificado Digital
        </CardTitle>
        <CardDescription>
          Configure o certificado digital e senha para emissão de notas fiscais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="certificate-password">Senha do Certificado Digital *</Label>
            <div className="flex gap-2">
              <Input
                id="certificate-password"
                type="password"
                value={certificatePassword}
                onChange={(e) => setCertificatePassword(e.target.value)}
                placeholder="Digite a senha do certificado"
                className="flex-1"
              />
              <Button
                onClick={handleSaveCertificatePassword}
                disabled={savingCertificatePassword || !certificatePassword}
              >
                {savingCertificatePassword ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Senha
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {config?.hasCertificatePassword
                ? '✅ Senha do certificado já configurada'
                : 'Configure a senha antes de fazer upload do certificado'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificate-upload">
              Arquivo do Certificado Digital (.pfx ou .p12) *
            </Label>
            <div className="mt-2">
              <Input
                id="certificate-upload"
                type="file"
                accept=".pfx,.p12"
                onChange={handleCertificateFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: .pfx, .p12. Tamanho máximo: 10MB
            </p>
            {(config?.hasCertificateBlob || config?.certificateFileUrl) && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-2">
                <p className="text-sm text-green-900 dark:text-green-100">
                  ✅ Certificado A1 disponível no sistema
                </p>
              </div>
            )}
          </div>

          {certificateFile && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Arquivo selecionado:
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  {certificateFile.name} ({(certificateFile.size / 1024).toFixed(2)} KB)
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUploadCertificate}
                  disabled={uploadingCertificate || !certificatePassword}
                  className="flex-1 sm:flex-none"
                >
                  {uploadingCertificate ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Enviar Certificado
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCertificateFile(null)}
                  disabled={uploadingCertificate}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ Sobre o Certificado Digital
          </p>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• O certificado digital é necessário para emissão de notas fiscais</li>
            <li>• Configure primeiro a senha do certificado</li>
            <li>• Depois faça upload do arquivo .pfx ou .p12</li>
            <li>• O arquivo é armazenado com segurança para assinatura e transmissão à SEFAZ</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default CertificadoDigitalSettings;
