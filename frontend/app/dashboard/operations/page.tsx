"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar } from "../../../src/app/components/ui/calendar";
import { Card } from "../../../src/app/components/ui/card";
import { Badge } from "../../../src/app/components/ui/badge";
import { Button } from "../../../src/app/components/ui/button";
import { Progress } from "../../../src/app/components/ui/progress";
import { Textarea } from "../../../src/app/components/ui/textarea";
import {
  RadioGroup,
  RadioGroupItem,
} from "../../../src/app/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../src/app/components/ui/dialog";
import {
  CalendarIcon,
  CheckCircle2,
  Clock3,
  Circle,
  FileText,
} from "lucide-react";

type Trip = {
  id: string;
  projectId: string;
  technicianId: string | null;
  technician?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | string;
  scheduledFor: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  notes?: string | null;
};

export default function Page() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("morning");
  const [selectedTechnician, setSelectedTechnician] = useState("john");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [tripsError, setTripsError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("projectId");
    setProjectId(id);
  }, []);

  useEffect(() => {
    if (!projectId) {
      setTrips([]);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoadingTrips(true);
        setTripsError(null);

        const res = await fetch(
          `/api/operations/trips?projectId=${encodeURIComponent(projectId)}`,
          { signal: controller.signal },
        );

        const contentType = res.headers.get("content-type")?.toLowerCase();
        const isJson = contentType?.includes("application/json");
        const body = isJson ? await res.json() : await res.text();

        if (!res.ok) {
          const message =
            typeof body === "string"
              ? body
              : body?.message ?? "Unable to load operations trips.";
          setTripsError(message);
          setTrips([]);
          return;
        }

        const items = (body?.items ?? []) as Trip[];
        setTrips(items);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error
            ? error.message
            : "Unable to reach ORAN operations service.";
        setTripsError(message);
        setTrips([]);
      } finally {
        setLoadingTrips(false);
      }
    };

    void load();

    return () => controller.abort();
  }, [projectId]);

  const { allocatedTrips, usedTrips, remainingTrips, usedPercentage } =
    useMemo(() => {
      const allocated = trips.length || 0;
      const used = trips.filter((t) => t.status === "COMPLETED").length;
      const remaining = Math.max(allocated - used, 0);
      const percentage = allocated > 0 ? (used / allocated) * 100 : 0;

      return {
        allocatedTrips: allocated,
        usedTrips: used,
        remainingTrips: remaining,
        usedPercentage: percentage,
      };
    }, [trips]);

  const upcomingTrip = useMemo(() => {
    const candidates = trips.filter((t) =>
      ["SCHEDULED", "IN_PROGRESS"].includes(t.status),
    );
    return candidates.sort(
      (a, b) =>
        new Date(a.scheduledFor).getTime() -
        new Date(b.scheduledFor).getTime(),
    )[0];
  }, [trips]);

  const completedTrips = useMemo(
    () =>
      trips
        .filter((t) => t.status === "COMPLETED")
        .sort(
          (a, b) =>
            new Date(b.checkOutAt ?? b.scheduledFor).getTime() -
            new Date(a.checkOutAt ?? a.scheduledFor).getTime(),
        ),
    [trips],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Operations {projectId ? "— Project timeline" : ""}
      </h1>

      {/* Section 1: Site Trips Summary */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Site Trips</h2>
            <p className="text-sm text-muted-foreground">
              Track allocated, used, and remaining site visits for this
              project.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            Live operations
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-baseline gap-1">
            <span className="font-semibold">Allocated:</span>
            <span>{allocatedTrips}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-semibold">Used:</span>
            <span>{usedTrips}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-semibold">Remaining:</span>
            <span>{remainingTrips}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {allocatedTrips === 0
                ? "No trips scheduled yet"
                : `${usedPercentage.toFixed(0)}% Used`}
            </span>
            <span>
              {usedTrips} / {allocatedTrips} trips
            </span>
          </div>
          <Progress value={usedPercentage} />
          {tripsError && (
            <p className="text-[11px] text-red-500">{tripsError}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">Request Site Visit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Site Visit</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Remaining Trips:{" "}
                  <span className="font-semibold text-foreground">
                    {remainingTrips}
                  </span>
                </p>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Preferred Date</p>
                  <div className="border rounded-md">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      fromDate={new Date()}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Preferred Time</p>
                  <RadioGroup
                    value={selectedTime}
                    onValueChange={setSelectedTime}
                    className="grid gap-2"
                  >
                    <label className="flex cursor-pointer items-center gap-3 rounded-md border bg-input-background px-3 py-2 text-sm">
                      <RadioGroupItem value="morning" />
                      <span>8:00 AM – 12:00 PM</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md border bg-input-background px-3 py-2 text-sm">
                      <RadioGroupItem value="afternoon" />
                      <span>12:00 PM – 4:00 PM</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md border bg-input-background px-3 py-2 text-sm">
                      <RadioGroupItem value="evening" />
                      <span>4:00 PM – 7:00 PM</span>
                    </label>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Purpose of Visit</p>
                  <Textarea
                    placeholder="Describe what needs to be done on-site (e.g. final calibration, additional device installation, inspection)…"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Technician</p>
                  <RadioGroup
                    value={selectedTechnician}
                    onValueChange={setSelectedTechnician}
                    className="grid gap-2"
                  >
                    <label className="flex cursor-pointer items-center justify-between rounded-md border bg-input-background px-3 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="john" />
                        <div>
                          <p className="font-medium">John Doe</p>
                          <p className="text-xs text-muted-foreground">
                            Available tomorrow
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Recommended</Badge>
                    </label>
                    <label className="flex cursor-pointer items-center justify-between rounded-md border bg-input-background px-3 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="jane" />
                        <div>
                          <p className="font-medium">Jane Smith</p>
                          <p className="text-xs text-muted-foreground">
                            Available in 3 days
                          </p>
                        </div>
                      </div>
                    </label>
                  </RadioGroup>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setRequestDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="button">Confirm Booking</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="lg">
            Purchase Additional Trips
          </Button>
        </div>
      </Card>

      {/* Section 2: Visit History */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Visit History</h2>
          <Badge variant="outline" className="text-xs">
            {loadingTrips
              ? "Loading..."
              : trips.length > 0
              ? "Live from operations"
              : "No visits yet"}
          </Badge>
        </div>

        <div className="space-y-4 text-sm">
          {loadingTrips && (
            <p className="text-sm text-muted-foreground">
              Loading operations timeline...
            </p>
          )}

          {!loadingTrips && trips.length === 0 && !tripsError && (
            <p className="text-sm text-muted-foreground">
              No site visits have been scheduled for this project yet. Once
              your first milestone is paid, ORAN will create an initial visit
              here automatically.
            </p>
          )}

          {upcomingTrip && (
            <div className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">
                    {new Date(upcomingTrip.scheduledFor).toLocaleString()}
                  </p>
                </div>
                <Badge
                  variant={
                    upcomingTrip.status === "IN_PROGRESS"
                      ? "secondary"
                      : "outline"
                  }
                  className="flex items-center gap-1"
                >
                  <Clock3 className="h-3.5 w-3.5" />
                  {upcomingTrip.status === "IN_PROGRESS"
                    ? "In progress"
                    : "Scheduled"}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Technician:{" "}
                {upcomingTrip.technician?.name
                  ? upcomingTrip.technician.name
                  : upcomingTrip.technicianId
                  ? "Assigned technician"
                  : "Pending assignment"}
              </p>
              {upcomingTrip.notes && (
                <p className="text-muted-foreground">{upcomingTrip.notes}</p>
              )}
            </div>
          )}

          {completedTrips.map((trip) => (
            <div
              key={trip.id}
              className="space-y-2 border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">
                    {new Date(
                      trip.checkOutAt ?? trip.scheduledFor,
                    ).toLocaleString()}
                  </p>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Technician:{" "}
                {trip.technician?.name
                  ? trip.technician.name
                  : trip.technicianId
                  ? "Assigned technician"
                  : "Technician assignment not recorded"}
              </p>
              {trip.notes && (
                <p className="text-muted-foreground">{trip.notes}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Section 3: Work Progress Tracker */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Work Progress</h2>
        <div className="space-y-4 text-sm">
          <ProgressRow
            label="Lighting Automation"
            status="complete"
            percent={100}
            detail="6 devices"
          />
          <ProgressRow
            label="Climate Control"
            status="complete"
            percent={100}
            detail="4 units"
          />
          <ProgressRow
            label="Access Control"
            status="in-progress"
            percent={60}
            detail="3 / 5 devices"
          />
          <ProgressRow
            label="Surveillance System"
            status="in-progress"
            percent={40}
            detail="2 / 6 cameras"
          />
          <ProgressRow
            label="Gate Automation"
            status="not-started"
            percent={0}
            detail="Not started"
          />
        </div>
      </Card>

      {/* Section 4: Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 mt-2">
        <p className="text-sm text-muted-foreground">
          Keep all operations documentation and support paths in one place.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm">
            <FileText className="mr-1.5 h-4 w-4" />
            Export Operations Report
          </Button>
          <Button variant="ghost" size="sm">
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  status,
  percent,
  detail,
}: {
  label: string;
  status: "complete" | "in-progress" | "not-started";
  percent: number;
  detail: string;
}) {
  const icon =
    status === "complete" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    ) : status === "in-progress" ? (
      <Clock3 className="h-4 w-4 text-amber-500" />
    ) : (
      <Circle className="h-4 w-4 text-muted-foreground" />
    );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <p className="font-medium">{label}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {percent}% · {detail}
        </p>
      </div>
      <Progress value={percent} />
    </div>
  );
}
