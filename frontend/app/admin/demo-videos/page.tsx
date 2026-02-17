'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../src/app/components/ui/button';
import { Card } from '../../../src/app/components/ui/card';
import { Input } from '../../../src/app/components/ui/input';
import { Label } from '../../../src/app/components/ui/label';
import { defaultDemoVideos, DemoVideo } from '../../../src/app/lib/demo-videos';

type DemoVideoDraft = Omit<DemoVideo, 'id'>;

function makeEmpty(): DemoVideoDraft {
  return { title: '', src: '', cost: '', location: '', sortOrder: 0, isActive: true };
}

export default function AdminDemoVideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<DemoVideo[]>([]);
  const [draft, setDraft] = useState<DemoVideoDraft>(makeEmpty());
  const [loading, setLoading] = useState(false);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/content/demo-videos');
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVideos();
  }, []);

  const canSaveDraft = useMemo(
    () => Boolean(draft.title.trim() && draft.src.trim()),
    [draft],
  );

  const addVideo = async () => {
    if (!canSaveDraft) return;
    await fetch('/api/content/demo-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    setDraft(makeEmpty());
    await loadVideos();
  };

  const removeVideo = async (id: string) => {
    await fetch(`/api/content/demo-videos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    await loadVideos();
  };

  const updateVideo = async (id: string, patch: Partial<DemoVideo>) => {
    const previous = videos;
    setVideos((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    await fetch(`/api/content/demo-videos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => setVideos(previous));
  };

  const resetToDefault = async () => {
    for (const item of videos) {
      await fetch(`/api/content/demo-videos/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
      });
    }
    for (const item of defaultDemoVideos) {
      const { title, src, cost, location, sortOrder, isActive } = item;
      await fetch('/api/content/demo-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, src, cost, location, sortOrder, isActive }),
      });
    }
    await loadVideos();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Watch Demo Content Manager</h1>
          <p className="text-sm text-muted-foreground">
            Add, edit, or delete videos shown on the landing page Watch Demo flow.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          Back to Admin
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Add new demo video</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Title</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div>
            <Label>Video URL or path</Label>
            <Input value={draft.src} onChange={(e) => setDraft({ ...draft, src: e.target.value })} />
          </div>
          <div>
            <Label>Cost</Label>
            <Input value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={addVideo} disabled={!canSaveDraft || loading}>Add video</Button>
          <Button variant="outline" onClick={resetToDefault} disabled={loading}>Reset to default</Button>
        </div>
      </Card>

      <div className="space-y-3">
        {videos.map((video) => (
          <Card key={video.id} className="p-4 grid md:grid-cols-2 gap-3">
            <div>
              <Label>Title</Label>
              <Input value={video.title} onChange={(e) => updateVideo(video.id, { title: e.target.value })} />
            </div>
            <div>
              <Label>Video URL or path</Label>
              <Input value={video.src} onChange={(e) => updateVideo(video.id, { src: e.target.value })} />
            </div>
            <div>
              <Label>Cost</Label>
              <Input value={video.cost} onChange={(e) => updateVideo(video.id, { cost: e.target.value })} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={video.location} onChange={(e) => updateVideo(video.id, { location: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button variant="destructive" onClick={() => removeVideo(video.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
