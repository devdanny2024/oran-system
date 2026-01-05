'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Home, DollarSign, FolderKanban, ArrowRight, CheckCircle, Wrench, Camera } from 'lucide-react';
import Link from 'next/link';

export default function OverviewPage() {
  const router = useRouter();
  const [requestingInspection, setRequestingInspection] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [inspectionProjectId, setInspectionProjectId] = useState<string | null>(null);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionAddress, setInspectionAddress] = useState('');
  const [inspectionPhone, setInspectionPhone] = useState('');
  const [submittingInspection, setSubmittingInspection] = useState(false);

  const activeProject = {
    name: 'Living Room Smart Home',
    progress: 80,
    status: 'In Progress',
    nextMilestone: 'Final Testing',
    dueDate: '5 days'
  };

  const stats = [
    { name: 'Site Visits', value: '7', icon: Home, change: '+2 this month' },
    { name: 'Total Spent', value: '₦2.8M', icon: DollarSign, change: 'Of ₦3.7M total' },
    { name: 'Active Projects', value: '2', icon: FolderKanban, change: '1 completed' }
  ];

  const recentActivity = [
    { 
      id: 1, 
      icon: CheckCircle, 
      text: 'Lighting installation completed', 
      time: '2 hours ago',
      iconColor: 'text-accent'
    },
    { 
      id: 2, 
      icon: Wrench, 
      text: 'Technician John scheduled for tomorrow 10 AM', 
      time: '5 hours ago',
      iconColor: 'text-primary'
    },
    { 
      id: 3, 
      icon: DollarSign, 
      text: 'Milestone 2 payment received', 
      time: 'Yesterday',
      iconColor: 'text-green-500'
    },
    { 
      id: 4, 
      icon: Camera, 
      text: 'Progress photos uploaded', 
      time: '2 days ago',
      iconColor: 'text-blue-500'
    }
  ];

  const projects = [
    {
      id: 1,
      name: 'Living Room Smart Home',
      status: 'In Progress',
      startDate: 'Mar 15, 2024',
      progress: 80,
      badge: 'in-progress'
    },
    {
      id: 2,
      name: 'Office Automation',
      status: 'Completed',
      startDate: 'Jan 10, 2024',
      progress: 100,
      badge: 'completed'
    }
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('oran_user');
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as {
        id?: string;
        name?: string | null;
        email?: string;
      };

      if (parsed?.id) {
        setUserId(parsed.id);
      }

      const displayName = (parsed.name || parsed.email || '').trim();
      if (displayName) {
        setUserDisplayName(displayName);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleOverviewInspection = async () => {
    if (!userId) {
      toast.error('Please log in again to request an inspection.');
      router.push('/login');
      return;
    }

    try {
      setRequestingInspection(true);

      const displayName = userDisplayName?.trim();
      const projectName = displayName
        ? `${displayName}'s ORAN Smart Home Project`
        : 'My ORAN Smart Home Project';

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          userId,
        }),
      });

      const isJson =
        res.headers.get('content-type')?.toLowerCase().includes('application/json') ?? false;
      const body = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to create a project for inspection.';
        toast.error(message);
        return;
      }

      const created = body as any;
      const projectId = created?.id as string | undefined;

      if (!projectId) {
        toast.error('Unable to create a project for inspection.');
        return;
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('oran_last_project_id', projectId);
      }

      setInspectionProjectId(projectId);
      setInspectionAddress('');
      setInspectionPhone('');
      setInspectionOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to start inspection request. Please try again.';
      toast.error(message);
    } finally {
      setRequestingInspection(false);
    }
  };

  const submitInspectionFromOverview = async () => {
    if (!inspectionProjectId) {
      toast.error('Unable to determine which project to use for inspection.');
      return;
    }

    const address = inspectionAddress.trim();
    const phone = inspectionPhone.trim();

    if (!address || !phone) {
      toast.error('Please provide both site address and a phone number for inspection.');
      return;
    }

    try {
      setSubmittingInspection(true);
      const res = await fetch(
        `/api/projects/${encodeURIComponent(inspectionProjectId)}/request-inspection`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteAddress: address,
            contactPhone: phone,
          }),
        },
      );

      const isJson =
        res.headers.get('content-type')?.toLowerCase().includes('application/json') ?? false;
      const body = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to request site inspection. Please try again.';
        toast.error(message);
        return;
      }

      const fee = Number((body as any)?.inspectionFee ?? 0);
      const region = (body as any)?.inferredRegion ?? 'your location';
      const authorizationUrl = (body as any)?.authorizationUrl as string | undefined;

      toast.success(
        `Inspection requested. Fee: ₦${fee.toLocaleString()} for ${region.toLowerCase()}.`,
      );

      setInspectionOpen(false);

      if (authorizationUrl) {
        window.location.href = authorizationUrl;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to request site inspection. Please try again.';
      toast.error(message);
    } finally {
      setSubmittingInspection(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your projects.</p>
      </div>

      {/* Team member / inspection CTA */}
      <Card className="border-primary bg-primary/5">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                You need a team member on your project
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Request a site inspection so ORAN can assign a technician, confirm wiring and device needs and prepare an
                inspection-based quote for you.
              </p>
            </div>
            <Button
              size="sm"
              className="self-start md:self-auto"
              disabled={requestingInspection}
              onClick={handleOverviewInspection}
            >
              {requestingInspection ? 'Loading...' : 'Request site inspection'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={inspectionOpen} onOpenChange={setInspectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a site inspection</DialogTitle>
            <DialogDescription>
              Enter the site address and a representative phone number. ORAN will assign a technician
              and redirect you to Paystack to pay the inspection fee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="grid gap-2 md:grid-cols-2">
              <p className="text-muted-foreground">
                Lagos sites: <span className="font-semibold text-foreground">₦15,000</span>
              </p>
              <p className="text-muted-foreground">
                South-West near Lagos (e.g. Ogun, Osun, Oyo, Ibadan, Ekiti, Ondo, Kwara):
                <span className="font-semibold text-foreground"> ₦30,000</span>
              </p>
              <p className="text-muted-foreground">
                Abuja sites: <span className="font-semibold text-foreground">₦15,000</span>
              </p>
              <p className="text-muted-foreground">
                Other locations: <span className="font-semibold text-foreground">₦100,000</span>
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Site address</span>
                <input
                  className="border rounded-md px-2 py-1 text-xs bg-background w-full"
                  placeholder="Street, area, city and state"
                  value={inspectionAddress}
                  onChange={(event) => setInspectionAddress(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">
                  Representative phone number
                </span>
                <input
                  className="border rounded-md px-2 py-1 text-xs bg-background w-full"
                  placeholder="Phone number we should call"
                  value={inspectionPhone}
                  onChange={(event) => setInspectionPhone(event.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspectionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={submittingInspection}
              onClick={submitInspectionFromOverview}
            >
              {submittingInspection ? 'Submitting...' : 'Continue to payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Project Banner */}
      <Card className="border-primary bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-xl font-semibold">{activeProject.name}</h3>
                <Badge variant="secondary">{activeProject.status}</Badge>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Installation Progress</span>
                    <span className="text-sm font-medium">{activeProject.progress}%</span>
                  </div>
                  <Progress value={activeProject.progress} className="h-2" />
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Next Milestone:</span>
                    <span className="font-medium ml-2">{activeProject.nextMilestone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Due in:</span>
                    <span className="font-medium ml-2">{activeProject.dueDate}</span>
                  </div>
                </div>
              </div>
            </div>
            <Link href="/dashboard/projects">
              <Button>
                View Details <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.name}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.name}</p>
                      <p className="text-3xl font-bold mt-2">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity & Projects */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id}>
                    <div className="flex items-start space-x-3">
                      <div className={`mt-0.5 ${activity.iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                    {index < recentActivity.length - 1 && <Separator className="my-4" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* All Projects */}
        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.map((project, index) => (
                <div key={project.id}>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{project.name}</h4>
                          <Badge 
                            variant={project.badge === 'completed' ? 'default' : 'secondary'}
                            className={project.badge === 'completed' ? 'bg-accent' : ''}
                          >
                            {project.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Started: {project.startDate}
                        </p>
                      </div>
                    </div>
                    {project.progress < 100 && (
                      <Progress value={project.progress} className="h-1.5" />
                    )}
                    <div className="flex space-x-2">
                      <Link href="/dashboard/projects" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      {project.progress < 100 && (
                        <Button variant="outline" size="sm">
                          Operations
                        </Button>
                      )}
                    </div>
                  </div>
                  {index < projects.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
