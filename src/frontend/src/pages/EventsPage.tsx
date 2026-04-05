import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  MapPin,
  Music,
  Pencil,
  Plane,
  Plus,
  Trash2,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Event as CalEvent, UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";

interface Props {
  profile: UserProfile | null | undefined;
  tier: number;
}

const SEED_EVENTS: Omit<CalEvent, "isUserCreated">[] = [
  {
    eventId: "seed-1",
    title: "Soccer Match: Chiefs vs Pirates",
    description:
      "Big derby match — high demand near FNB Stadium before and after the game.",
    date: BigInt(new Date(new Date().setHours(15, 0, 0, 0)).getTime()),
    location: "FNB Stadium, Soweto",
    category: "Sports",
  },
  {
    eventId: "seed-2",
    title: "Airport Peak Hour — OR Tambo",
    description:
      "International arrivals spike. Position near terminals for airport runs.",
    date: BigInt(new Date(new Date().setHours(7, 0, 0, 0)).getTime()),
    location: "OR Tambo International Airport",
    category: "Airport",
  },
  {
    eventId: "seed-3",
    title: "Live Concert: Sun Arena",
    description: "Evening show — massive demand spike for pickups after 10pm.",
    date: BigInt(new Date(new Date().setHours(19, 30, 0, 0)).getTime()),
    location: "Time Square, Pretoria",
    category: "Music",
  },
  {
    eventId: "seed-4",
    title: "Sandton City Weekend Shoppers",
    description: "Saturday peak at the mall — short trips but high volume.",
    date: BigInt(new Date(new Date().setHours(11, 0, 0, 0)).getTime()),
    location: "Sandton City Mall",
    category: "Transport",
  },
];

const CATEGORIES = [
  "All",
  "Sports",
  "Music",
  "Airport",
  "Transport",
  "My Events",
];

const categoryIcons: Record<string, React.ReactNode> = {
  Sports: <Trophy className="w-4 h-4" />,
  Music: <Music className="w-4 h-4" />,
  Airport: <Plane className="w-4 h-4" />,
  Transport: <CalendarDays className="w-4 h-4" />,
  Custom: <MapPin className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  Sports: "bg-green-100 text-green-700",
  Music: "bg-purple-100 text-purple-700",
  Airport: "bg-blue-100 text-blue-700",
  Transport: "bg-orange-100 text-orange-700",
  Custom: "bg-muted text-muted-foreground",
};

function generateICS(event: {
  title: string;
  date: bigint;
  description: string;
  location: string;
}) {
  const d = new Date(Number(event.date));
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
  const endDate = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DriverMax//EN",
    "BEGIN:VEVENT",
    `SUMMARY:${event.title}`,
    `DTSTART:${fmt(d)}`,
    `DTEND:${fmt(endDate)}`,
    `DESCRIPTION:${event.description}`,
    `LOCATION:${event.location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function addToCalendar(event: {
  title: string;
  date: bigint;
  description: string;
  location: string;
}) {
  const ics = generateICS(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]/gi, "-")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const BLANK_FORM = {
  title: "",
  description: "",
  date: "",
  time: "",
  location: "",
  category: "Custom",
};

export default function EventsPage({ profile: _profile }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const [catFilter, setCatFilter] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalEvent | null>(null);
  const [form, setForm] = useState(BLANK_FORM);

  const { data: customEvents } = useQuery({
    queryKey: ["customEvents"],
    queryFn: () => actor!.getCustomEvents(),
    enabled: !!actor,
  });

  const addEventMut = useMutation({
    mutationFn: (ev: CalEvent) => actor!.addCustomEvent(ev),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customEvents"] });
      setAddOpen(false);
      setEditEvent(null);
      setForm(BLANK_FORM);
      toast.success(editEvent ? "Event updated" : "Event added");
    },
    onError: () => toast.error("Failed to save event"),
  });

  const deleteEventMut = useMutation({
    mutationFn: (id: string) => actor!.deleteCustomEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customEvents"] });
      setEventToDelete(null);
      toast.success("Event removed");
    },
    onError: () => {
      setEventToDelete(null);
      toast.error("Failed to remove event");
    },
  });

  const userEvents: CalEvent[] = (customEvents ?? []).map((e) => ({
    ...e,
    isUserCreated: true,
  }));
  const seedEvents: CalEvent[] = SEED_EVENTS.map((e) => ({
    ...e,
    isUserCreated: false,
  }));
  const allEvents = [...seedEvents, ...userEvents];

  const filtered =
    catFilter === "All"
      ? allEvents
      : catFilter === "My Events"
        ? allEvents.filter((e) => e.isUserCreated === true)
        : allEvents.filter((e) => e.category === catFilter);
  const sorted = [...filtered].sort((a, b) => Number(a.date) - Number(b.date));

  const openEditDialog = (event: CalEvent) => {
    const d = new Date(Number(event.date));
    const dateStr = d.toISOString().split("T")[0];
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    setForm({
      title: event.title,
      description: event.description,
      date: dateStr,
      time: timeStr,
      location: event.location,
      category: event.category,
    });
    setEditEvent(event);
    setAddOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setAddOpen(false);
      setEditEvent(null);
      setForm(BLANK_FORM);
    }
  };

  const handleSaveEvent = () => {
    const dt = new Date(`${form.date}T${form.time || "00:00"}`);
    const eventPayload: CalEvent = {
      eventId: editEvent ? editEvent.eventId : crypto.randomUUID(),
      title: form.title,
      description: form.description,
      date: BigInt(dt.getTime()),
      location: form.location,
      category: form.category,
      isUserCreated: true,
    };
    addEventMut.mutate(eventPayload);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Event Calendar</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Events that drive demand in your area
          </p>
        </div>
        <Button
          onClick={() => {
            setEditEvent(null);
            setForm(BLANK_FORM);
            setAddOpen(true);
          }}
          className="gap-2"
          data-ocid="events.add_event.button"
        >
          <Plus className="w-4 h-4" /> Add Event
        </Button>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setCatFilter(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              catFilter === c
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:border-primary/40"
            }`}
            data-ocid="events.filter.tab"
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div
            className="text-center py-12"
            data-ocid="events.list.empty_state"
          >
            <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              No events in this category.
            </p>
          </div>
        ) : (
          sorted.map((event, idx) => {
            const d = new Date(Number(event.date));
            return (
              <Card
                key={event.eventId}
                className="shadow-card"
                data-ocid={`events.list.item.${idx + 1}`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={`text-xs gap-1 ${categoryColors[event.category] ?? categoryColors.Custom}`}
                        >
                          {categoryIcons[event.category]}
                          {event.category}
                        </Badge>
                        {event.isUserCreated && (
                          <Badge variant="outline" className="text-xs">
                            My Event
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm">{event.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {d.toLocaleDateString()} at{" "}
                          {d.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1 h-7"
                        onClick={() => addToCalendar(event)}
                        data-ocid={`events.add_to_calendar.button.${idx + 1}`}
                      >
                        <CalendarDays className="w-3 h-3" /> Add to Calendar
                      </Button>
                      {event.isUserCreated && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs gap-1 h-7 text-primary hover:text-primary"
                            onClick={() => openEditDialog(event)}
                            data-ocid={`events.edit.button.${idx + 1}`}
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-destructive h-7 hover:text-destructive"
                            onClick={() => setEventToDelete(event)}
                            data-ocid={`events.delete.button.${idx + 1}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit Event Dialog */}
      <Dialog open={addOpen} onOpenChange={handleDialogClose}>
        <DialogContent data-ocid="events.add_event.dialog">
          <DialogHeader>
            <DialogTitle>
              {editEvent ? "Edit Event" : "Add Custom Event"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Event Title</Label>
              <Input
                placeholder="e.g. Airport Peak Time"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                data-ocid="events.form.title.input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  data-ocid="events.form.date.input"
                />
              </div>
              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, time: e.target.value }))
                  }
                  data-ocid="events.form.time.input"
                />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Input
                placeholder="e.g. FNB Stadium, Soweto"
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
                data-ocid="events.form.location.input"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger data-ocid="events.form.category.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Sports", "Music", "Airport", "Transport", "Custom"].map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Why is this event important for drivers?"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                data-ocid="events.form.description.textarea"
              />
            </div>
            <Button
              className="w-full"
              disabled={!form.title || !form.date || addEventMut.isPending}
              onClick={handleSaveEvent}
              data-ocid="events.form.submit_button"
            >
              {addEventMut.isPending
                ? "Saving..."
                : editEvent
                  ? "Save Changes"
                  : "Add Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete event confirmation */}
      <AlertDialog
        open={!!eventToDelete}
        onOpenChange={(open) => {
          if (!open) setEventToDelete(null);
        }}
      >
        <AlertDialogContent data-ocid="events.delete_event.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this event?</AlertDialogTitle>
            <AlertDialogDescription>
              "{eventToDelete?.title}" will be permanently removed. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="events.delete_event.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                eventToDelete && deleteEventMut.mutate(eventToDelete.eventId)
              }
              data-ocid="events.delete_event.confirm_button"
            >
              Remove Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
