'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../src/app/components/ui/button';
import { Card } from '../../../src/app/components/ui/card';
import { Input } from '../../../src/app/components/ui/input';
import { Label } from '../../../src/app/components/ui/label';
import { defaultDemoVideos, DemoVideo } from '../../../src/app/lib/demo-videos';

type DemoVideoDraft = Omit<DemoVideo, 'id' | 'src'>;

function makeEmpty(): DemoVideoDraft {
  return { title: '', cost: '', location: '', sortOrder: 0, isActive: true };
}

export default function AdminDemoVideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<DemoVideo[]>([]);
  const [draft, setDraft] = useState<DemoVideoDraft>(makeEmpty());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    () => Boolean(draft.title.trim() && selectedFile),
    [draft, selectedFile],
  );

  const addVideo = async () => {
    if (!canSaveDraft || !selectedFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', selectedFile);

      const uploadRes = await fetch('/api/content/demo-videos/upload', {
        method: 'POST',
        body: form,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData?.src) {
        throw new Error(uploadData?.message || 'Video upload failed.');
      }

      await fetch('/api/content/demo-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, src: uploadData.src }),
      });

      setDraft(makeEmpty());
      setSelectedFile(null);
      await loadVideos();
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(error instanceof Error ? error.message : 'Unable to add video.');
    } finally {
      setUploading(false);
    }
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Watch Demo Content Manager</h1>
          <p className="text-sm text-muted-foreground">
            Upload videos and manage all demo entries shown on the landing page.
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
            <Label>Video file</Label>
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <Label>Cost</Label>
            <Input value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
          </div>
          <div>
            <Label>Sort order</Label>
            <Input
              type="number"
              value={draft.sortOrder ?? 0}
              onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={addVideo} disabled={!canSaveDraft || loading || uploading}>
            {uploading ? 'Uploading...' : 'Upload & add video'}
          </Button>
          <Button variant="outline" onClick={resetToDefault} disabled={loading || uploading}>
            Reset to default
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">All demo videos</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Preview</th>
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Cost</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">Order</th>
                <th className="py-2 pr-3">Active</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.id} className="border-b align-top">
                  <td className="py-3 pr-3 min-w-[200px]">
                    <video src={video.src} controls className="w-48 h-28 object-cover rounded bg-black" />
                  </td>
                  <td className="py-3 pr-3 min-w-[220px]">
                    <Input value={video.title} onChange={(e) => updateVideo(video.id, { title: e.target.value })} />
                  </td>
                  <td className="py-3 pr-3 min-w-[160px]">
                    <Input value={video.cost} onChange={(e) => updateVideo(video.id, { cost: e.target.value })} />
                  </td>
                  <td className="py-3 pr-3 min-w-[220px]">
                    <Input value={video.location} onChange={(e) => updateVideo(video.id, { location: e.target.value })} />
                  </td>
                  <td className="py-3 pr-3 w-[100px]">
                    <Input
                      type="number"
                      value={video.sortOrder ?? 0}
                      onChange={(e) => updateVideo(video.id, { sortOrder: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="py-3 pr-3 w-[100px]">
                    <input
                      type="checkbox"
                      checked={Boolean(video.isActive)}
                      onChange={(e) => updateVideo(video.id, { isActive: e.target.checked })}
                    />
                  </td>
                  <td className="py-3">
                    <Button variant="destructive" onClick={() => removeVideo(video.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
