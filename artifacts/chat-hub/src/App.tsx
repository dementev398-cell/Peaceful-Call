import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Home from '@/pages/Home';
import AdminPage from '@/pages/AdminPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminsPage from '@/pages/AdminsPage';
import PortalPage from '@/pages/PortalPage';
import SinglePostPage from '@/pages/SinglePostPage';
import PostsPage from '@/pages/PostsPage';
import MessagesPage from '@/pages/MessagesPage';
import HadithsPage from '@/pages/HadithsPage';
import QuranPage from '@/pages/QuranPage';
import SingleHadithPage from '@/pages/SingleHadithPage';
import { Route, Switch, Router as WouterRouter, useLocation, Link } from 'wouter';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NicknameGate } from '@/components/NicknameGate';
import { setBaseUrl } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Configure API base URL for cross-origin deployments (e.g. Render static site
// calling a separate API service). Defaults to '' (relative paths) which works
// when the frontend and API share the same origin.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function AuthShell({ children }: { children: ReactNode }) {
  const { t, isRtl } = useLanguage();
  return (
    <div
      dir="ltr"
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden gradient-bg px-4 py-12"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--primary)/0.06),transparent_55%)]" />

      <Link
        href="/"
        className={`absolute top-5 z-10 inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/40 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground backdrop-blur-md transition-all hover:border-border hover:text-foreground ${
          isRtl ? 'right-5' : 'left-5'
        }`}
      >
        <ArrowLeft className={`h-3.5 w-3.5 ${isRtl ? 'rotate-180' : ''}`} />
        {t('auth.backHome')}
      </Link>

      <Link
        href="/"
        className="group relative z-10 mb-7 flex flex-col items-center gap-3"
      >
        <div className="h-16 w-16 overflow-hidden rounded-2xl border border-primary/30 shadow-lg shadow-primary/10 transition-transform group-hover:scale-105">
          <img
            src="/logo-source.jpg"
            alt={t('site.name')}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="text-center">
          <div className="font-serif text-xl font-bold tracking-wide text-foreground">
            {t('site.name')}
          </div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {t('auth.tagline')}
          </div>
        </div>
      </Link>

      <div className="relative z-10 flex w-full justify-center">
        <div className="w-[440px] max-w-full overflow-hidden rounded-[2rem] border border-white/10 glass-strong shadow-2xl">
          <div className="p-6 sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SignInPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      setLocation('/portal');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="font-serif text-3xl font-bold tracking-tight">{t('auth.signInTitle')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('auth.signInSubtitle')}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signin-email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('auth.email')}
          </Label>
          <Input
            id="signin-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            className="h-12 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signin-password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('auth.password')}
          </Label>
          <Input
            id="signin-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
            className="h-12 rounded-xl"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-full text-sm font-bold tracking-widest uppercase glow-gold gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('auth.signInButton')}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link href="/sign-up" className="font-semibold text-primary hover:underline">
            {t('auth.signUpButton')}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

function SignUpPage() {
  const { t } = useLanguage();
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(email, password, name);
      setLocation('/portal');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="font-serif text-3xl font-bold tracking-tight">{t('auth.signUpTitle')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('auth.signUpSubtitle')}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('auth.name')} <span className="opacity-60">({t('auth.nameOptional')})</span>
          </Label>
          <Input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('auth.namePlaceholder')}
            className="h-12 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('auth.email')}
          </Label>
          <Input
            id="signup-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            className="h-12 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('auth.password')}
          </Label>
          <Input
            id="signup-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.signUpPasswordPlaceholder')}
            className="h-12 rounded-xl"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-full text-sm font-bold tracking-widest uppercase glow-gold gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('auth.signUpButton')}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t('auth.haveAccount')}{' '}
          <Link href="/sign-in" className="font-semibold text-primary hover:underline">
            {t('auth.signInButton')}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

function Router() {
  const [location] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        <Switch location={location}>
          <Route path="/" component={Home} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/posts" component={PostsPage} />
          <Route path="/posts/:slug" component={SinglePostPage} />
          <Route path="/hadiths" component={HadithsPage} />
          <Route path="/hadiths/:id" component={SingleHadithPage} />
          <Route path="/quran" component={QuranPage} />

          <Route path="/portal">
            {!isLoaded ? null : isSignedIn ? (
              <NicknameGate>
                <PortalPage />
              </NicknameGate>
            ) : (
              <SignInPage />
            )}
          </Route>
          <Route path="/messages">
            {!isLoaded ? null : isSignedIn ? (
              <NicknameGate>
                <MessagesPage />
              </NicknameGate>
            ) : (
              <SignInPage />
            )}
          </Route>
          <Route path="/profile">
            {!isLoaded ? null : isSignedIn ? <ProfilePage /> : <SignInPage />}
          </Route>
          <Route path="/admin" component={AdminPage} />
          <Route path="/admins" component={AdminsPage} />

          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <Router />
              </AuthProvider>
            </QueryClientProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
