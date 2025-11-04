import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { loginSchema } from '@/lib/validations';
import { getRandomVerse } from '@/lib/verses';
import { handleApiError } from '@/lib/handleApiError';
import { useAuth } from '@/contexts/AuthContext';
import logoImage from '/logo.png';

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verse, setVerse] = useState<{ reference: string; text: string } | null>(null);
  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [rememberEmail, setRememberEmail] = useState<boolean>(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<{ login: string; password: string }>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // Gera um versículo aleatório a cada montagem do componente
    const v = getRandomVerse();
    setVerse(v);
  }, []);

  // Carrega e-mails salvos no dispositivo
  useEffect(() => {
    try {
      const raw = localStorage.getItem('savedLoginEmails');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          setSavedEmails(list.filter((e) => typeof e === 'string'));
        }
      }
    } catch (_) {
      // ignora erros de parse/storage
    }
  }, []);

  const onSubmit = async (data: { login: string; password: string }) => {
    setLoading(true);
    try {
      await login(data.login, data.password);
      toast.success('Login realizado com sucesso!');

      // Salva o e-mail localmente (sem credenciais) se marcado
      if (rememberEmail && data.login) {
        try {
          const current = new Set<string>([...savedEmails, String(data.login).trim()]);
          // Limita para evitar crescimento infinito (mantém os mais recentes no final)
          const next = Array.from(current).slice(-10);
          localStorage.setItem('savedLoginEmails', JSON.stringify(next));
          setSavedEmails(next);
        } catch (_) {
          // storage pode falhar (quota, privacidade) — ignora silenciosamente
        }
      }
      // Pequeno delay para garantir que o estado foi propagado
      await new Promise(resolve => setTimeout(resolve, 50));
      // A navegação será feita automaticamente pelo AppRouter quando isAuthenticated mudar
    } catch (error) {
      console.error('Login error:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const [showSavedEmailsDialog, setShowSavedEmailsDialog] = useState(false);
  const [emailSearchTerm, setEmailSearchTerm] = useState('');

  const filteredSavedEmails = (emailSearchTerm
    ? savedEmails.filter((e) => e.toLowerCase().includes(emailSearchTerm.toLowerCase()))
    : savedEmails
  ).slice(0, 50);

  const handlePickEmail = (email: string) => {
    setValue('login', email);
    setShowSavedEmailsDialog(false);
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={logoImage} 
                alt="MontShop Logo" 
                width={128}
                height={128}
                className="h-32 w-32 object-contain"
                style={{ maxWidth: '128px', maxHeight: '128px' }}
              />
            </div>
            <CardTitle className="text-2xl font-bold -m-10">MontShop</CardTitle>
            <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Login</Label>
                <Input
                  id="login"
                  type="text"
                  placeholder="seu@email.com"
                  {...register('login')}
                  disabled={loading}
                />
                {savedEmails.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">E-mails salvos neste dispositivo</span>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setShowSavedEmailsDialog(true)} disabled={loading}>
                      Selecionar e-mail
                    </Button>
                  </div>
                )}
                {errors.login && (
                  <p className="text-sm text-destructive">{errors.login.message}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="rememberEmail"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    disabled={loading}
                  />
                  <Label htmlFor="rememberEmail" className="text-sm text-muted-foreground">
                    Salvar este e-mail neste dispositivo
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            {verse && (
              <div className="mt-4 text-center text-muted-foreground">
                <p className="italic text-xs">"{verse.text}"</p>
                <p className="mt-1 font-medium text-[10px]">{verse.reference}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={showSavedEmailsDialog} onOpenChange={setShowSavedEmailsDialog}>
        <DialogContent className="max-w-md w-[92vw]">
          <DialogHeader>
            <DialogTitle>E-mails salvos</DialogTitle>
            <DialogDescription>
              Escolha um e-mail salvo para preencher o campo de login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Pesquisar e-mail..."
              value={emailSearchTerm}
              onChange={(e) => setEmailSearchTerm(e.target.value)}
            />
            {filteredSavedEmails.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Nenhum e-mail salvo encontrado.
              </div>
            ) : (
              <ul className="max-h-64 overflow-y-auto divide-y rounded-md border">
                {filteredSavedEmails.map((email) => (
                  <li key={email} className="p-3 hover:bg-accent/60 flex items-center justify-between gap-2">
                    <div className="truncate text-sm">{email}</div>
                    <Button type="button" size="sm" onClick={() => handlePickEmail(email)}>
                      Usar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Marca fixa no canto inferior direito */}
      <div className="fixed right-4 bottom-4 select-none flex flex-col items-center">
        <div className="text-sky-300 font-extrabold tracking-widest">MONT</div>
        <div className="text-white text-[11px]">Tecnologia da Informação</div>
      </div>
    </>
  );
}
