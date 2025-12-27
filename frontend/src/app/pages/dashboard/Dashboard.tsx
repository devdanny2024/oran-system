import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Settings, 
  CreditCard, 
  FileText, 
  HelpCircle,
  Bell,
  MessageCircle,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent } from '../../components/ui/sheet';
import { Badge } from '../../components/ui/badge';

export default function Dashboard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'Operations', href: '/dashboard/operations', icon: Settings },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Documents', href: '/dashboard/documents', icon: FileText },
    { name: 'Support', href: '/dashboard/support', icon: HelpCircle },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">O</span>
          </div>
          <span className="ml-2 text-2xl font-semibold text-foreground">ORAN</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5 mr-3" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-white">JD</AvatarFallback>
          </Avatar>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">John Doe</p>
            <p className="text-xs text-muted-foreground">john@example.com</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-card border-r border-border">
          <SidebarContent />
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Top Bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="lg:hidden -m-2.5 p-2.5 text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-500">
                <Bell className="h-6 w-6" />
                <Badge className="absolute top-0 right-0 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  3
                </Badge>
              </button>

              {/* Start New Project Button */}
              <Link to="/onboarding">
                <Button>Start New Project</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* AI Chat Button */}
      <button className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center">
        <MessageCircle className="h-6 w-6" />
        <Badge className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-xs">
          1
        </Badge>
      </button>
    </div>
  );
}
