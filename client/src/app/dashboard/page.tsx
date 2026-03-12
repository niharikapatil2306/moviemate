'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import LogoBanner from '@/components/LogoBanner';
import type { Room } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myId, setMyId] = useState<number | null>(null);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    api.auth.me().then((me) => setMyId(me.id)).catch(() => {});
    api.rooms.list().then((data) => setRooms(data as Room[])).catch(() => {});
  }, [router]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const room = await api.rooms.create(roomName) as Room;
      setRooms((prev) => [room, ...prev]);
      setRoomName('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (joinCode.length !== 6) { setError('Code must be 6 characters'); return; }
    setLoading(true);
    try {
      const room = await api.rooms.join(joinCode.toUpperCase()) as Room;
      setRooms((prev) => prev.find((r) => r.id === room.id) ? prev : [room, ...prev]);
      setJoinCode('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLeave(roomId: number) {
    try {
      await api.rooms.leave(roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to leave');
    }
  }

  async function handleDelete(roomId: number) {
    try {
      await api.rooms.delete(roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function logout() {
    localStorage.removeItem('token');
    router.push('/login');
  }

  const myRooms = rooms.filter((r) => r.host_id === myId);
  const invitedRooms = rooms.filter((r) => r.host_id !== myId);

  const statusBadge = (status: Room['status']) => (
    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
      status === 'swiping' ? 'bg-brand/20 text-brand' :
      status === 'done' ? 'bg-surface text-muted' :
      'bg-brand-light/20 text-brand-light'
    }`}>
      {status}
    </span>
  );

  return (
    <div className="min-h-screen bg-surface max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8 px-3 pt-6">
        <LogoBanner />
        <div className="flex gap-2">
          <button
            onClick={logout}
            className="text-sm text-muted hover:text-white transition px-3 py-1.5 bg-surface-dark border border-surface-light rounded-lg"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="bg-surface-dark rounded-xl p-5 mb-8 border border-surface-light mx-3">
        <div className="flex gap-2 mb-4">
          {(['create', 'join'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                tab === t ? 'bg-brand text-surface' : 'bg-surface text-muted hover:text-white'
              }`}
            >
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Room Name"
              required
              className="flex-1 bg-surface border border-surface-light rounded-lg px-3 py-3 text-sm text-white placeholder-muted focus:outline-none focus:border-brand transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-brand hover:bg-brand-light disabled:opacity-50 text-surface px-5 py-3 rounded-lg text-sm font-medium transition active:scale-95"
            >
              Create
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-char code"
              maxLength={6}
              required
              className="flex-1 bg-surface border border-surface-light rounded-lg px-3 py-3 text-sm font-mono tracking-widest text-white placeholder-muted focus:outline-none focus:border-brand transition uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-brand hover:bg-brand-light disabled:opacity-50 text-surface px-5 py-3 rounded-lg text-sm font-medium transition active:scale-95"
            >
              Join
            </button>
          </form>
        )}
        {error && <p className="text-brand text-xs mt-2">{error}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-3 pb-6">
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Your rooms</h2>
          {myRooms.length === 0 ? (
            <p className="text-muted text-sm">No rooms created yet.</p>
          ) : (
            <div className="space-y-2">
              {myRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between bg-surface-dark border border-surface-light rounded-xl px-4 py-3"
                >
                  <button
                    className="flex-1 text-left"
                    onClick={() => router.push(`/room/${room.id}`)}
                  >
                    <p className="font-medium text-white">{room.name}</p>
                    <p className="text-xs text-muted font-mono mt-0.5">{room.code}</p>
                  </button>
                  <div className="flex items-center gap-2 ml-3">
                    {statusBadge(room.status)}
                    <button
                      onClick={() => handleDelete(room.id)}
                      className="text-xs text-muted hover:text-brand transition px-2 py-1 rounded-lg border border-surface-light hover:border-brand/40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Invited rooms</h2>
          {invitedRooms.length === 0 ? (
            <p className="text-muted text-sm">No invites yet.</p>
          ) : (
            <div className="space-y-2">
              {invitedRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between bg-surface-dark border border-surface-light rounded-xl px-4 py-3"
                >
                  <button
                    className="flex-1 text-left"
                    onClick={() => router.push(`/room/${room.id}`)}
                  >
                    <p className="font-medium text-white">{room.name}</p>
                    <p className="text-xs text-muted font-mono mt-0.5">{room.code}</p>
                  </button>
                  <div className="flex items-center gap-2 ml-3">
                    {statusBadge(room.status)}
                    <button
                      onClick={() => handleLeave(room.id)}
                      className="text-xs text-muted hover:text-brand transition px-2 py-1 rounded-lg border border-surface-light hover:border-brand/40"
                    >
                      Leave
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
