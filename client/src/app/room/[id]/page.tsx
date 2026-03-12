'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
// framer-motion kept for "all caught up" fade-in animation only
import MovieCard from '@/components/MovieCard';
import GenrePicker from '@/components/GenrePicker';
import { api } from '@/lib/api';
import LogoBanner from '@/components/LogoBanner';
import type { Room, Member, Movie } from '@/types';

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const roomId = Number(id);

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [matches, setMatches] = useState<Movie[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRoom = useCallback(async () => {
    const [r, m] = await Promise.all([api.rooms.get(roomId), api.rooms.members(roomId)]);
    setRoom(r as Room);
    setMembers(m as Member[]);
  }, [roomId]);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    loadRoom();
    api.auth.me().then((me) => {
      api.rooms.get(roomId).then((r) => setIsHost((r as Room).host_id === me.id));
    });
    api.movies.getGenres(roomId).then((g) => setSelectedGenres(g as number[])).catch(() => {});
    const interval = setInterval(loadRoom, 5000);
    return () => clearInterval(interval);
  }, [router, loadRoom, roomId]);

  useEffect(() => {
    if (room?.status === 'swiping') {
      setMoviesLoading(true);
      api.movies.list(roomId)
        .then((data) => setMovies(data as Movie[]))
        .catch(() => setError('Failed to load movies'))
        .finally(() => setMoviesLoading(false));
      api.movies.matches(roomId).then((data) => setMatches(data as Movie[])).catch(() => {});
    }
    if (room?.status === 'done') {
      api.movies.matches(roomId).then((data) => setMatches(data as Movie[])).catch(() => {});
    }
  }, [room?.status, roomId]);

  async function handleSwipe(direction: 'like' | 'dislike') {
    const movie = movies[0];
    if (!movie || swiping) return;
    setSwiping(true);
    try {
      await api.movies.swipe(roomId, movie.id, direction);
      const [updated, updatedMatches] = await Promise.all([
        api.movies.list(roomId),
        api.movies.matches(roomId),
      ]);
      setMovies(updated as Movie[]);
      setMatches(updatedMatches as Movie[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to swipe');
    } finally {
      setSwiping(false);
    }
  }

  async function startSwiping() {
    if (selectedGenres.length === 0) { setError('Pick at least one genre first'); return; }
    setError('');
    try {
      await api.movies.setGenres(roomId, selectedGenres);
      const updated = await api.rooms.updateStatus(roomId, 'swiping');
      setRoom(updated as Room);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function endSession() {
    setError('');
    try {
      const updated = await api.rooms.updateStatus(roomId, 'done');
      setRoom(updated as Room);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to end session');
    }
  }

  function logout() {
    localStorage.removeItem('token');
    router.push('/login');
  }

  const [swiping, setSwiping] = useState(false);
  const remaining = movies.slice(0, 3);
  const done = !moviesLoading && movies.length === 0;

  const header = (
    <div className="mb-4 px-3 pt-6">
      <div className="flex items-start justify-between mb-3">
        <LogoBanner />
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs text-muted hover:text-white transition px-2.5 py-1.5 bg-surface-dark border border-surface-light rounded-lg"
          >
            Home
          </button>
          <button
            onClick={logout}
            className="text-xs text-muted hover:text-white transition px-2.5 py-1.5 bg-surface-dark border border-surface-light rounded-lg"
          >
            Sign out
          </button>
        </div>
      </div>
      {room && (
        <div className="flex items-center gap-3 px-3 mb-3">
          <p className="font-semibold text-white">{room.name}</p>
          <span className="text-xs font-mono bg-surface-dark border border-surface-light px-2.5 py-1 rounded-full text-brand">
            {room.code}
          </span>
          {isHost && room.status === 'swiping' && (
            <button
              onClick={endSession}
              className="text-xs px-3 py-1.5 rounded-lg border border-surface-light text-muted hover:text-brand hover:border-brand/40 transition"
            >
              End
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (room?.status === 'done') {
    return (
      <div className="min-h-screen bg-surface max-w-5xl mx-auto">
        {header}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-white mb-1">Session complete</h2>
          <p className="text-muted text-sm">
            {matches.length} movie{matches.length !== 1 ? 's' : ''} everyone liked
          </p>
        </div>
        {matches.length === 0 ? (
          <p className="text-center text-muted text-sm px-4">No matches this time. Try again with different genres!</p>
        ) : (
          <div className="max-w-lg mx-auto space-y-2 px-3">
            {matches.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 bg-surface-dark border border-brand/40 rounded-xl px-4 py-3">
                <span className="text-muted text-xs w-5">{i + 1}</span>
                <div>
                  <p className="font-medium text-sm text-white">{m.title}</p>
                  <p className="text-xs text-muted">{m.year} · {m.genre}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface max-w-5xl mx-auto">
      {header}

      <div className="px-3 pb-6">
      <div className="flex gap-2 mb-6 flex-wrap">
        {members.map((m) => (
          <span key={m.id} className="text-xs bg-surface-dark border border-surface-light px-2.5 py-1 rounded-full text-muted">
            {m.username}
          </span>
        ))}
      </div>

      {error && <p className="text-brand text-sm mb-4">{error}</p>}

      {room?.status === 'waiting' && (
        <div className="max-w-lg space-y-6">
          {isHost ? (
            <div>
              <p className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Pick genres</p>
              <GenrePicker selected={selectedGenres} onChange={setSelectedGenres} />
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted text-sm">Waiting for the host to start swiping...</p>
            </div>
          )}
          {isHost && (
            <div className="pt-2">
              <p className="text-muted text-sm mb-4">Waiting for friends to join...</p>
              <button
                onClick={startSwiping}
                disabled={selectedGenres.length === 0}
                className="bg-brand hover:bg-brand-light disabled:opacity-40 text-surface font-semibold px-8 py-3 rounded-xl transition"
              >
                Start swiping
              </button>
            </div>
          )}
        </div>
      )}

      {room?.status === 'swiping' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
            <div className="relative w-full" style={{ height: 'min(420px, 72vw)' }}>
              <AnimatePresence>
                {moviesLoading ? (
                  <div className="flex items-center justify-center h-full text-muted text-sm">
                    Loading movies...
                  </div>
                ) : remaining.length > 0 && !done ? (
                  remaining.map((movie, i) => (
                    <motion.div
                      key={movie.id}
                      className="absolute inset-0"
                      style={{ zIndex: remaining.length - i, scale: 1 - i * 0.05, y: i * 10, rotate: i === 1 ? 4 : i === 2 ? -4 : 0 }}
                    >
                      <MovieCard movie={movie} isTop={i === 0} />
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full gap-3 text-center px-4"
                  >
                    {matches.length > 0 ? (
                      <>
                        <p className="text-white font-semibold text-sm">You&apos;re all caught up!</p>
                        <p className="text-muted text-xs">While you wait, watch your top match:</p>
                        <div className="relative w-24 h-36 rounded-xl overflow-hidden shadow-lg mt-1">
                          <Image
                            src={`https://image.tmdb.org/t/p/w200${matches[0].poster}`}
                            alt={matches[0].title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <p className="text-white text-sm font-medium">{matches[0].title}</p>
                        <p className="text-muted/60 text-xs">New movies drop in ~2 hrs</p>
                      </>
                    ) : (
                      <>
                        <p className="text-muted text-sm">You&apos;re all caught up!</p>
                        <p className="text-muted/60 text-xs">New movies drop in ~2 hrs</p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!done && (
              <div className="flex justify-center gap-8 mt-6">
                <button
                  onClick={() => handleSwipe('dislike')}
                  disabled={swiping || movies.length === 0}
                  className="w-16 h-16 rounded-xl bg-surface-dark hover:bg-surface-light disabled:opacity-40 border border-surface-light flex items-center justify-center text-xl font-bold text-muted hover:text-white transition active:scale-95"
                >
                  ✕
                </button>
                <button
                  onClick={() => handleSwipe('like')}
                  disabled={swiping || movies.length === 0}
                  className="w-16 h-16 rounded-xl bg-brand hover:bg-brand-light disabled:opacity-40 border border-brand flex items-center justify-center text-2xl text-surface transition active:scale-95"
                >
                  &#9829;
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 md:mt-0">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
              Matches {matches.length > 0 && `(${matches.length})`}
            </h3>
            {matches.length === 0 ? (
              <p className="text-muted text-sm">No matches yet — keep swiping!</p>
            ) : (
              <div className="space-y-2">
                {matches.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 bg-surface-dark border border-brand/40 rounded-xl px-4 py-3">
                    <span className="text-brand text-sm">&#10003;</span>
                    <div>
                      <p className="font-medium text-sm text-white">{m.title}</p>
                      <p className="text-xs text-muted">{m.year} · {m.genre}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
