import { Link } from 'wouter';
import { useUser, SignOutButton } from '@clerk/react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function UserMenu() {
  const { user } = useUser();
  const { t } = useLanguage();
  
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <Avatar className="w-9 h-9 border border-primary/20 hover:border-primary/50 transition-colors">
          <AvatarImage src={user.imageUrl} alt={user.fullName || ''} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {user.firstName?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 font-sans border-border/50">
        <div className="p-3">
          <p className="text-sm font-medium leading-none mb-1 text-foreground">
            {user.fullName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>
        <DropdownMenuSeparator className="bg-border/50" />
        <DropdownMenuItem asChild className="cursor-pointer py-2.5 hover:bg-muted/50 focus:bg-muted/50">
          <Link href="/portal" className="flex items-center w-full">
            <User className="w-4 h-4 mr-2 text-muted-foreground" />
            <span>{t('portal.greeting')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer py-2.5 hover:bg-muted/50 focus:bg-muted/50">
          <Link href="/profile" className="flex items-center w-full">
            <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
            <span>{t('nav.manageAccount')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/50" />
        <SignOutButton>
          <DropdownMenuItem className="cursor-pointer py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            <span>{t('nav.signout')}</span>
          </DropdownMenuItem>
        </SignOutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
