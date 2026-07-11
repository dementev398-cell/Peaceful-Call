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
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { ruRU, enUS, arSA } from '@clerk/localizations';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NicknameGate } from '@/components/NicknameGate';
import { setBaseUrl } from '@workspace/api-client-react';

// Configure API base URL for cross-origin deployments (e.g. Render static site
// calling a separate API service). Defaults to '' (relative paths) which works
// when the frontend and API share the same origin.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  cssLayerName: 'clerk',
  layout: {
    // Remove Clerk's "Development mode" badge from the components.
    unsafe_disableDevelopmentModeWarnings: true,
  },
  variables: {
    colorPrimary: 'hsl(43 85% 58%)',
    colorForeground: 'hsl(40 10% 96%)',
    colorMutedForeground: 'hsl(220 12% 65%)',
    colorDanger: 'hsl(0 70% 52%)',
    colorBackground: 'hsl(224 24% 4%)',
    colorInput: 'hsl(224 16% 12%)',
    colorInputForeground: 'hsl(40 10% 96%)',
    colorNeutral: 'hsl(224 16% 12%)',
    colorText: 'hsl(40 10% 96%)',
    colorTextSecondary: 'hsl(220 12% 65%)',
    colorTextOnPrimaryBackground: 'hsl(224 24% 4%)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: '0.75rem',
  },
  elements: {
    // The branded logo lives in AuthShell, so hide Clerk's built-in one.
    logoBox: 'hidden',
    rootBox: 'w-full flex justify-center px-4',
    cardBox: 'rounded-[2rem] w-[440px] max-w-full overflow-hidden shadow-2xl border border-white/10 glass-strong',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none p-6 sm:p-8',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-serif text-3xl font-bold tracking-tight',
    headerSubtitle: '!text-[hsl(220_12%_65%)] font-serif text-sm mt-1',
    formButtonPrimary: 'rounded-full h-12 text-sm font-bold tracking-widest uppercase transition-all glow-gold shadow-lg shadow-primary/20 !text-[hsl(224_24%_4%)] hover:!brightness-110 hover:scale-[1.02] active:scale-[0.98]',
    socialButtonsBlockButton: 'rounded-xl h-12 !border-white/10 !text-[hsl(40_10%_96%)] hover:!bg-white/5 hover:!border-white/20 transition-all',
    socialButtonsBlockButtonText: '!text-[hsl(40_10%_96%)] font-semibold',
    formFieldInput: 'rounded-xl h-12 !bg-[hsl(224_20%_8%)] !border-white/10 hover:!border-white/20 focus:!border-[hsl(43_85%_58%)] focus:!ring-1 focus:!ring-[hsl(43_85%_58%)] transition-all shadow-inner',
    formFieldLabel: '!text-[hsl(220_12%_65%)] text-xs font-semibold tracking-wide uppercase',
    identityPreviewText: '!text-[hsl(40_10%_96%)]',
    dividerText: '!text-[hsl(220_12%_65%)]',
    dividerLine: '!bg-white/10',
    alternativeMethodsBlockButton: '!text-[hsl(40_10%_96%)]',
  },
};

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

      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthShell>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </AuthShell>
  );
}

function SignUpPage() {
  return (
    <AuthShell>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </AuthShell>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener]);

  return null;
}

function Router() {
  const [location] = useLocation();

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
            <Show when="signed-in">
              <NicknameGate>
                <PortalPage />
              </NicknameGate>
            </Show>
            <Show when="signed-out">
              <SignInPage />
            </Show>
          </Route>
          <Route path="/messages">
            <Show when="signed-in">
              <NicknameGate>
                <MessagesPage />
              </NicknameGate>
            </Show>
            <Show when="signed-out">
              <SignInPage />
            </Show>
          </Route>
          <Route path="/profile">
            <Show when="signed-in">
              <ProfilePage />
            </Show>
            <Show when="signed-out">
              <SignInPage />
            </Show>
          </Route>
          <Route path="/admin" component={AdminPage} />
          <Route path="/admins" component={AdminsPage} />

          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const baseLocalization =
    language === 'RU' ? ruRU : language === 'AR' ? arSA : enUS;
  const authText = {
    RU: {
      signInTitle: 'С возвращением',
      signInSubtitle: 'Войдите, чтобы продолжить',
      signUpTitle: 'Создайте аккаунт',
      signUpSubtitle: 'Присоединяйтесь к сообществу',
    },
    EN: {
      signInTitle: 'Welcome back',
      signInSubtitle: 'Sign in to continue',
      signUpTitle: 'Create your account',
      signUpSubtitle: 'Join the community',
    },
    AR: {
      signInTitle: 'مرحبًا بعودتك',
      signInSubtitle: 'سجّل الدخول للمتابعة',
      signUpTitle: 'أنشئ حسابك',
      signUpSubtitle: 'انضم إلى المجتمع',
    },
  }[language];
  // @clerk/localizations deliberately leaves some field placeholders as
  // `undefined` for RU/AR (they fall back to English at render time), which
  // is why the email/password/name inputs showed English text even when the
  // rest of the UI was in Russian or Arabic. We fill those gaps explicitly.
  const placeholderOverrides = {
    RU: {
      emailAddress: 'Введите ваш email',
      password: 'Введите ваш пароль',
      signUpPassword: 'Придумайте пароль',
      firstName: 'Имя',
      lastName: 'Фамилия',
      username: 'Имя пользователя',
    },
    EN: undefined,
    AR: {
      emailAddress: 'أدخل بريدك الإلكتروني',
      password: 'أدخل كلمة المرور',
      signUpPassword: 'أنشئ كلمة مرور',
      firstName: 'الاسم الأول',
      lastName: 'اسم العائلة',
      username: 'اسم المستخدم',
    },
  }[language];
  const clerkLocalization = {
    ...baseLocalization,
    formFieldInputPlaceholder__emailAddress:
      placeholderOverrides?.emailAddress ??
      baseLocalization.formFieldInputPlaceholder__emailAddress,
    formFieldInputPlaceholder__password:
      placeholderOverrides?.password ??
      baseLocalization.formFieldInputPlaceholder__password,
    formFieldInputPlaceholder__signUpPassword:
      placeholderOverrides?.signUpPassword ??
      baseLocalization.formFieldInputPlaceholder__signUpPassword,
    formFieldInputPlaceholder__firstName:
      placeholderOverrides?.firstName ??
      baseLocalization.formFieldInputPlaceholder__firstName,
    formFieldInputPlaceholder__lastName:
      placeholderOverrides?.lastName ??
      baseLocalization.formFieldInputPlaceholder__lastName,
    formFieldInputPlaceholder__username:
      placeholderOverrides?.username ??
      baseLocalization.formFieldInputPlaceholder__username,
    signIn: {
      ...baseLocalization.signIn,
      start: {
        ...baseLocalization.signIn?.start,
        title: authText.signInTitle,
        subtitle: authText.signInSubtitle,
      },
    },
    signUp: {
      ...baseLocalization.signUp,
      start: {
        ...baseLocalization.signUp?.start,
        title: authText.signUpTitle,
        subtitle: authText.signUpSubtitle,
      },
    },
  };

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={clerkLocalization as typeof baseLocalization}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Router />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <ClerkProviderWithRoutes />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
