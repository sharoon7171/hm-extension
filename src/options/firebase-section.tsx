import { useEffect, useMemo, useState } from "react";
import type { SceneKind } from "../firebase/scenes";
import { EXTENSION_DISPLAY_NAME } from "../shared/extension-brand";
import {
  EMPTY_AUTH_SNAPSHOT,
  readAuthSnapshot,
  watchAuthSnapshot,
  type AuthSnapshot,
} from "../shared/auth-snapshot";
import type {
  AckResponse,
  AuthStateResponse,
  SceneDeleteAllRequest,
} from "../shared/messages";
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
    subtitle: `Streams from the local cache; ${EXTENSION_DISPLAY_NAME} updates it in the background whenever any device favorites or unfavorites a scene.`,
    emptyMessage:
      "No favorited scenes yet. Open any clip page and tap the heart.",
  },
  {
    cacheKind: "hidden",
    collectionKind: "hiddenScenes",
    title: "Hidden scenes",
    subtitle: `Scenes you hid using the Hide / Unhide button on a clip page. ${EXTENSION_DISPLAY_NAME} removes them from grids when the matching toggle is on.`,
    emptyMessage:
      "No hidden scenes yet. Open any clip page and tap Hide.",
  },
];

export function FirebaseSection() {
  const [authSnapshot, setAuthSnapshot] = useState<AuthSnapshot>(EMPTY_AUTH_SNAPSHOT);
  const [cacheUid, setCacheUid] = useState<string | null>(null);

  useEffect(() => {
    void readAuthSnapshot().then(setAuthSnapshot);
    return watchAuthSnapshot(setAuthSnapshot);
  }, []);

  useEffect(() => {
    void refreshAuthState().then(setAuthSnapshot);
  }, []);

  useEffect(() => {
    void readScenesCache("favorite").then(cache => setCacheUid(cache.uid));
    return watchScenesCache("favorite", cache => setCacheUid(cache.uid));
  }, []);

  const accountUid = authSnapshot.uid ?? cacheUid;
  const accountEmail = authSnapshot.email;
  const signedIn = !!accountUid;

  if (!signedIn) {
    return <SignInPanel checking={!authSnapshot.ready} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <SignedInHeader
        email={accountEmail ?? "Signed in"}
        checking={!authSnapshot.ready && !accountEmail}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {LISTS.map(spec => (
          <ScenesListPanel key={spec.cacheKind} accountUid={accountUid} spec={spec} />
        ))}
      </div>
    </div>
  );
}

function SignInPanel({ checking }: { checking: boolean }) {
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
      const response = await sendSignInLink(email.trim());
      if (!response.ok) throw new Error(response.error);
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      setError((err as Error).message);
    }
  };

  return (
    <SectionCard
      title="Cloud sync"
      subtitle={`${EXTENSION_DISPLAY_NAME}: sign in with a passwordless email link to keep favorited and hidden scenes in sync across devices.${
        checking ? " Checking account…" : ""
      }`}
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
            Check {email} for a sign-in link. Click the link in any browser —{" "}
            {EXTENSION_DISPLAY_NAME} finishes signing you in on this page
            automatically.
          </p>
        ) : null}
      </form>
    </SectionCard>
  );
}

function SignedInHeader({
  email,
  checking,
}: {
  email: string;
  checking: boolean;
}) {
  const onSignOut = async () => {
    await sendSignOut();
  };
  return (
    <section className={cardClasses.root}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <h2 className={cardClasses.title}>Cloud sync</h2>
          <p className={cardClasses.subtitle}>
            Signed in as <span className="text-neutral-900">{email}</span>
            {checking ? " · checking account…" : null}.{" "}
            {`${EXTENSION_DISPLAY_NAME} streams favorites and hidden scenes live from the local cache.`}
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

function ScenesListPanel({
  accountUid,
  spec,
}: {
  accountUid: string;
  spec: ListSpec;
}) {
  const [cache, setCache] = useState<ScenesCache>(EMPTY_SCENES_CACHE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void readScenesCache(spec.cacheKind).then(setCache);
    return watchScenesCache(spec.cacheKind, setCache);
  }, [spec.cacheKind]);

  const scenes = useMemo(() => sortedScenes(cache), [cache]);
  const matchesUser = cache.uid === accountUid;
  const waitingForAccount = cache.uid !== null && !matchesUser;
  const syncing = matchesUser && !cache.ready;

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
          {waitingForAccount
            ? "Loading…"
            : `${scenes.length} scene${scenes.length === 1 ? "" : "s"}${
                syncing ? " · syncing" : ""
              }`}
        </span>
        <button
          type="button"
          onClick={onDeleteAll}
          disabled={busy || waitingForAccount || scenes.length === 0}
          className={buttonClasses.danger}
        >
          {busy ? "Deleting…" : "Delete all"}
        </button>
      </div>
      {error ? (
        <p className={`${noticeClasses.error} mt-2`}>Delete failed: {error}</p>
      ) : null}
      {!waitingForAccount && scenes.length > 0 ? (
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
      {!waitingForAccount && scenes.length === 0 ? (
        <p className={listClasses.empty}>{spec.emptyMessage}</p>
      ) : null}
    </SectionCard>
  );
}

function refreshAuthState(): Promise<AuthSnapshot> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "getAuthState" }, (response: AuthStateResponse | undefined) => {
      if (chrome.runtime.lastError || !response) {
        void readAuthSnapshot().then(resolve);
        return;
      }
      resolve(response);
    });
  });
}

function sendSignInLink(email: string): Promise<AckResponse> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "requestSignInLink", email }, (response: AckResponse | undefined) => {
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

function sendSignOut(): Promise<AckResponse> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "signOut" }, (response: AckResponse | undefined) => {
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
