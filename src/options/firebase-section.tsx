import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import type { SceneKind } from "../firebase/scenes";
import { requestSignInLink, signOut, watchAuthState } from "../firebase/auth";
import type { AckResponse, SceneDeleteAllRequest } from "../shared/messages";
import {
  EMPTY_SCENES_CACHE,
  readScenesCache,
  sortedScenes,
  watchScenesCache,
  type SceneCacheKind,
  type ScenesCache,
} from "../shared/scenes-cache";
import {
  buttonClasses,
  cardClasses,
  inputClasses,
  listClasses,
  noticeClasses,
} from "../ui-classes/options";
import { SectionCard } from "./components/section-card";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ListSpec = {
  cacheKind: SceneCacheKind;
  collectionKind: SceneKind;
  title: string;
  subtitle: string;
  emptyMessage: string;
};

const LISTS: ListSpec[] = [
  {
    cacheKind: "favorite",
    collectionKind: "favoriteScenes",
    title: "Favorited scenes",
    subtitle:
      "Streams from the local cache; the background updates it whenever any device favorites or unfavorites a scene.",
    emptyMessage:
      "No favorited scenes yet. Open any clip page and tap the heart.",
  },
  {
    cacheKind: "hidden",
    collectionKind: "hiddenScenes",
    title: "Hidden scenes",
    subtitle:
      "Scenes you hid using the Hide / Unhide button on a clip page. Removed from grids when the matching toggle is on.",
    emptyMessage:
      "No hidden scenes yet. Open any clip page and tap Hide.",
  },
];

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
      <SectionCard title="Cloud sync" subtitle="Loading account…">
        <div />
      </SectionCard>
    );
  }

  if (!user) return <SignInPanel />;

  return (
    <div className="flex flex-col gap-4">
      <SignedInHeader user={user} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {LISTS.map(spec => (
          <ScenesListPanel key={spec.cacheKind} user={user} spec={spec} />
        ))}
      </div>
    </div>
  );
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
    <SectionCard
      title="Cloud sync"
      subtitle="Sign in with a passwordless email link to keep favorited and hidden scenes in sync across devices."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3 pt-3">
        <label className="flex flex-col">
          <span className={inputClasses.label}>Email address</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={status !== "idle"}
            className={inputClasses.root}
          />
        </label>
        <div>
          <button
            type="submit"
            disabled={status !== "idle"}
            className={buttonClasses.primary}
          >
            {status === "sending" ? "Sending link…" : "Send sign-in link"}
          </button>
        </div>
        {error ? <p className={noticeClasses.error}>{error}</p> : null}
        {status === "sent" ? (
          <p className={noticeClasses.success}>
            Check {email} for a sign-in link. Click the link in any browser —
            this page signs you in automatically once you do.
          </p>
        ) : null}
      </form>
    </SectionCard>
  );
}

function SignedInHeader({ user }: { user: User }) {
  const onSignOut = async () => {
    await signOut();
  };
  return (
    <section className={cardClasses.root}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <h2 className={cardClasses.title}>Cloud sync</h2>
          <p className={cardClasses.subtitle}>
            Signed in as <span className="text-neutral-900">{user.email}</span>.
            Favorites and hidden scenes stream live from the local cache.
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className={buttonClasses.secondary}
        >
          Sign out
        </button>
      </div>
    </section>
  );
}

function ScenesListPanel({ user, spec }: { user: User; spec: ListSpec }) {
  const [cache, setCache] = useState<ScenesCache>(EMPTY_SCENES_CACHE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void readScenesCache(spec.cacheKind).then(setCache);
    return watchScenesCache(spec.cacheKind, setCache);
  }, [spec.cacheKind]);

  const scenes = useMemo(() => sortedScenes(cache), [cache]);
  const matchesUser = cache.uid === user.uid;
  const showLoading = !cache.ready || !matchesUser;

  const onDeleteAll = async () => {
    if (scenes.length === 0) return;
    const confirmed = window.confirm(
      `Delete all ${scenes.length} ${spec.cacheKind === "favorite" ? "favorited" : "hidden"} scenes from your cloud library? This cannot be undone.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const message: SceneDeleteAllRequest = {
        type: "sceneDeleteAll",
        kind: spec.collectionKind,
      };
      const response = await sendMessage(message);
      if (!response.ok) throw new Error(response.error);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title={spec.title} subtitle={spec.subtitle}>
      <div className="flex items-center justify-between pt-3">
        <span className={listClasses.count}>
          {showLoading
            ? "Loading…"
            : `${scenes.length} scene${scenes.length === 1 ? "" : "s"}`}
        </span>
        <button
          type="button"
          onClick={onDeleteAll}
          disabled={busy || showLoading || scenes.length === 0}
          className={buttonClasses.danger}
        >
          {busy ? "Deleting…" : "Delete all"}
        </button>
      </div>
      {error ? (
        <p className={`${noticeClasses.error} mt-2`}>Delete failed: {error}</p>
      ) : null}
      {!showLoading && scenes.length > 0 ? (
        <ul className="mt-3 max-h-80 overflow-y-auto rounded-lg ring-1 ring-neutral-200 px-3 bg-neutral-50">
          {scenes.map(scene => (
            <li key={scene.sceneId} className={listClasses.row}>
              <a
                href={scene.href}
                target="_blank"
                rel="noopener noreferrer"
                className={listClasses.link}
                title={scene.title}
              >
                {scene.title || `Scene ${scene.sceneId}`}
              </a>
              {scene.addedAt ? (
                <time
                  dateTime={new Date(scene.addedAt).toISOString()}
                  className={listClasses.meta}
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
        <p className={listClasses.empty}>{spec.emptyMessage}</p>
      ) : null}
    </SectionCard>
  );
}

function sendMessage(message: SceneDeleteAllRequest): Promise<AckResponse> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(message, (response: AckResponse | undefined) => {
      if (chrome.runtime.lastError) {
        resolve({
          ok: false,
          error: chrome.runtime.lastError.message ?? "background unavailable",
        });
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
