'use client';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import Link from 'next/link';
import { Plus, Calendar, DollarSign, Settings } from 'lucide-react';

export default function ProjectsPage() {
  const projects = [
    {
      id: 1,
      name: 'Living Room Smart Home',
      status: 'In Progress',
      progress: 80,
      budget: '₦2,100,000',
      timeline: 'Mar 15 - Apr 30, 2024',
      features: ['Lighting', 'Climate', 'Surveillance'],
      image: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400&h=300&fit=crop'
    },
    {
      id: 2,
      name: 'Office Automation',
      status: 'Completed',
      progress: 100,
      budget: '₦1,850,000',
      timeline: 'Jan 10 - Feb 28, 2024',
      features: ['Access Control', 'Lighting', 'Climate'],
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage and track all your automation projects</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select defaultValue="all">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="date">
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
        {projects.map((project) => (
          <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="md:flex">
              {/* Project Image */}
              <div className="md:w-64 h-48 md:h-auto bg-muted">
                <img
                  src={project.image}
                  alt={project.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3C/svg%3E';
                  }}
                />
              </div>

              {/* Project Details */}
              <div className="flex-1">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <CardTitle className="text-2xl">{project.name}</CardTitle>
                        <Badge 
                          variant={project.status === 'Completed' ? 'default' : 'secondary'}
                          className={project.status === 'Completed' ? 'bg-accent' : ''}
                        >
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress */}
                  {project.progress < 100 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Progress</span>
                        <span className="text-sm font-medium">{project.progress}% complete</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                  )}

                  {/* Project Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Budget</p>
                        <p className="font-medium">{project.budget}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Timeline</p>
                        <p className="font-medium">{project.timeline}</p>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Features</p>
                    <div className="flex flex-wrap gap-2">
                      {project.features.map((feature) => (
                        <Badge key={feature} variant="outline">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="default" size="sm">
                      View Details
                    </Button>
                    {project.status !== 'Completed' && (
                      <>
                        <Button variant="outline" size="sm">
                          <Settings className="mr-2 h-4 w-4" />
                          Operations
                        </Button>
                        <Button variant="outline" size="sm">
                          Billing
                        </Button>
                      </>
                    )}
                    {project.status === 'Completed' && (
                      <Button variant="outline" size="sm">
                        Download Invoice
                      </Button>
                    )}
                  </div>
                </CardContent>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State (if no projects) */}
      {projects.length === 0 && (
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
                Get started by creating your first smart home automation project
              </p>
              <Link href="/onboarding">
                <Button size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your First Project
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
