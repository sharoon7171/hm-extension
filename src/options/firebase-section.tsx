import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { requestSignInLink, signOut, watchAuthState } from "../firebase/auth";
import type { AckResponse, FavoriteSceneDeleteAllRequest } from "../shared/messages";
import {
  EMPTY_FAVORITE_SCENES_CACHE,
  readFavoriteScenesCache,
  sortedScenes,
  watchFavoriteScenesCache,
  type FavoriteScenesCache,
} from "../shared/scenes-cache";
import { optionsClasses as cls } from "../ui-classes/options";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FirebaseSection() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = watchAuthState(next => {
      setUser(next);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  if (!authReady) {
    return (
      <div className={cls.card}>
        <h2 className={cls.title}>Favorite scenes (cloud sync)</h2>
        <p className={cls.description}>Loading account…</p>
      </div>
    );
  }

  return user ? <SignedInPanel user={user} /> : <SignInPanel />;
}

function SignInPanel() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setStatus("sending");
    try {
      await requestSignInLink(email.trim());
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      setError((err as Error).message);
    }
  };

  return (
    <div className={cls.card}>
      <h2 className={cls.title}>Favorite scenes (cloud sync)</h2>
      <p className={cls.description}>
        Sign in with a passwordless email link to keep your favorited scenes
        in sync across devices. The extension reads from a local cache that
        the background service worker keeps fresh in real time, so this page
        never queries Firestore directly.
      </p>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-100">Email address</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={status !== "idle"}
            className="rounded-md bg-zinc-800 px-3 py-2 text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-emerald-500"
          />
        </label>
        <button
          type="submit"
          disabled={status !== "idle"}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {status === "sending" ? "Sending link…" : "Send sign-in link"}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {status === "sent" ? (
          <p className="text-sm text-emerald-400">
            Check {email} for a sign-in link. Click the link in any browser —
            this page will sign you in automatically once you do.
          </p>
        ) : null}
      </form>
    </div>
  );
}

function SignedInPanel({ user }: { user: User }) {
  const [cache, setCache] = useState<FavoriteScenesCache>(EMPTY_FAVORITE_SCENES_CACHE);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    void readFavoriteScenesCache().then(setCache);
    return watchFavoriteScenesCache(setCache);
  }, []);

  const scenes = useMemo(() => sortedScenes(cache), [cache]);
  const matchesUser = cache.uid === user.uid;
  const showLoading = !cache.ready || !matchesUser;

  const onDeleteAll = async () => {
    if (scenes.length === 0) return;
    const confirmed = window.confirm(
      `Delete all ${scenes.length} favorited scenes from your cloud library? This cannot be undone.`,
    );
    if (!confirmed) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const message: FavoriteSceneDeleteAllRequest = { type: "favoriteSceneDeleteAll" };
      const response = await sendMessage(message);
      if (!response.ok) throw new Error(response.error);
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const onSignOut = async () => {
    await signOut();
  };

  return (
    <div className={cls.card}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={cls.title}>Favorite scenes (cloud sync)</h2>
          <p className={cls.description}>
            Signed in as <span className="text-zinc-100">{user.email}</span>.
            This list streams from the local cache; the background updates it
            live whenever any device changes a favorite.
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-700 transition hover:bg-zinc-700"
        >
          Sign out
        </button>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-zinc-400">
          {showLoading
            ? "Loading…"
            : `${scenes.length} scene${scenes.length === 1 ? "" : "s"} favorited`}
        </div>
        <button
          type="button"
          onClick={onDeleteAll}
          disabled={deleting || showLoading || scenes.length === 0}
          className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-400 disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {deleting ? "Deleting…" : "Delete all"}
        </button>
      </div>
      {deleteError ? (
        <p className="mt-3 text-sm text-red-400">Delete failed: {deleteError}</p>
      ) : null}
      {!showLoading && scenes.length > 0 ? (
        <ul className="mt-4 max-h-96 divide-y divide-zinc-800 overflow-y-auto rounded-md ring-1 ring-zinc-800">
          {scenes.map(scene => (
            <li
              key={scene.sceneId}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <a
                href={scene.href}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm text-zinc-100 hover:text-emerald-400"
                title={scene.title}
              >
                {scene.title || `Scene ${scene.sceneId}`}
              </a>
              {scene.addedAt ? (
                <time
                  dateTime={new Date(scene.addedAt).toISOString()}
                  className="shrink-0 text-xs text-zinc-500"
                  title={new Date(scene.addedAt).toLocaleString()}
                >
                  {new Date(scene.addedAt).toLocaleDateString()}
                </time>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {!showLoading && scenes.length === 0 ? (
        <p className="mt-4 text-sm italic text-zinc-500">
          No favorited scenes yet. Open any clip page on hotmovies.com and tap
          the heart — it will appear here in real time.
        </p>
      ) : null}
    </div>
  );
}

function sendMessage(message: FavoriteSceneDeleteAllRequest): Promise<AckResponse> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(message, (response: AckResponse | undefined) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message ?? "background unavailable" });
        return;
      }
      if (!response) {
        resolve({ ok: false, error: "background unavailable" });
        return;
      }
      resolve(response);
    });
  });
}
