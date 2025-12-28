'use client';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import Link from 'next/link';
import { Plus, Calendar, Settings } from 'lucide-react';
import { toast } from 'sonner';

type OranUser = {
  id: string;
};

type ProjectStatus =
  | 'ONBOARDING'
  | 'INSPECTION_REQUESTED'
  | 'INSPECTION_SCHEDULED'
  | 'INSPECTION_COMPLETED'
  | 'QUOTES_GENERATED'
  | 'QUOTE_SELECTED'
  | 'DOCUMENTS_PENDING'
  | 'DOCUMENTS_SIGNED'
  | 'PAYMENT_PLAN_SELECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  buildingType: string | null;
  roomsCount: number | null;
  createdAt: string;
  userId?: string;
};

export default function ProjectsPage() {
  const [user, setUser] = useState<OranUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem('oran_user');
      if (!stored) return;
      const parsed = JSON.parse(stored) as OranUser;
      if (parsed?.id) {
        setUser(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/projects');
        const isJson =
          res.headers
            .get('content-type')
            ?.toLowerCase()
            .includes('application/json') ?? false;
        const body = isJson ? await res.json() : await res.text();

        if (!res.ok) {
          const message =
            typeof body === 'string'
              ? body
              : body?.message ?? 'Unable to load projects.';
          toast.error(message);
          return;
        }

        setProjects((body?.items ?? []) as Project[]);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load projects. Please try again.';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const statusLabel = (status: ProjectStatus) =>
    status.toLowerCase().replace(/_/g, ' ');

  const filteredProjects = useMemo(() => {
    let list: Project[] = projects;

    if (user) {
      list = list.filter((p) => !p.userId || p.userId === user.id);
    }

    if (filter === 'active') {
      list = list.filter(
        (p) => p.status !== 'COMPLETED' && p.status !== 'DOCUMENTS_SIGNED',
      );
    } else if (filter === 'completed') {
      list = list.filter((p) => p.status === 'COMPLETED');
    } else if (filter === 'pending') {
      list = list.filter((p) => p.status === 'ONBOARDING');
    }

    if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'status') {
      list = [...list].sort((a, b) => a.status.localeCompare(b.status));
    } else {
      list = [...list].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return list;
  }, [projects, user, filter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your ORAN projects
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select
            value={filter}
            onValueChange={(
              value: 'all' | 'active' | 'completed' | 'pending',
            ) => setFilter(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Onboarding</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(value: 'date' | 'name' | 'status') =>
              setSortBy(value)
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Latest First</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/onboarding">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-6">
        {filteredProjects.map((project) => (
          <Card
            key={project.id}
            className="overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="md:flex">
              {/* Project Details */}
              <div className="flex-1">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <CardTitle className="text-2xl">
                          {project.name}
                        </CardTitle>
                        <Badge
                          variant={
                            project.status === 'COMPLETED'
                              ? 'default'
                              : 'secondary'
                          }
                          className={
                            project.status === 'COMPLETED' ? 'bg-accent' : ''
                          }
                        >
                          {statusLabel(project.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Project Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Building type</p>
                        <p className="font-medium">
                          {project.buildingType || 'Not specified'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() =>
                        window.location.assign(
                          `/dashboard/projects/${project.id}`,
                        )
                      }
                    >
                      View project
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Operations (coming soon)
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Billing (coming soon)
                    </Button>
                  </div>
                </CardContent>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State (if no projects) */}
      {!loading && filteredProjects.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                <Plus className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">
                Get started by creating your first ORAN project.
              </p>
              <Link href="/onboarding">
                <Button size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Create your first project
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
