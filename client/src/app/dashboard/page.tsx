'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Room } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
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
      setRooms((prev) => [room, ...prev]);
      setJoinCode('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    router.push('/login');
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">MovieMate</h1>
        <button onClick={logout} className="text-sm text-neutral-500 hover:text-white transition">
          Sign out
        </button>
      </div>

      <div className="bg-neutral-900 rounded-xl p-5 mb-8 border border-neutral-800">
        <div className="flex gap-2 mb-4">
          {(['create', 'join'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                tab === t ? 'bg-brand text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {t === 'create' ? 'Create room' : 'Join room'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Room name"
              required
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-brand hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
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
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:border-brand transition uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-brand hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Join
            </button>
          </form>
        )}
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">Your rooms</h2>
      {rooms.length === 0 ? (
        <p className="text-neutral-600 text-sm">No rooms yet. Create or join one above.</p>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => router.push(`/room/${room.id}`)}
              className="w-full flex items-center justify-between bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl px-4 py-3 transition text-left"
            >
              <div>
                <p className="font-medium">{room.name}</p>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">{room.code}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                room.status === 'swiping' ? 'bg-green-900 text-green-400' :
                room.status === 'done' ? 'bg-neutral-700 text-neutral-400' :
                'bg-yellow-900 text-yellow-400'
              }`}>
                {room.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
