import { playerClasses as cls } from "../../ui-classes/player";
import { buildIcon } from "./icons";

export type PlayerElement = {
  root: HTMLDivElement;
  video: HTMLVideoElement;
  centerHit: HTMLDivElement;
  bigPlay: HTMLButtonElement;
  prepStatus: HTMLDivElement;
  prepLabel: HTMLSpanElement;
  errorNote: HTMLDivElement;
  bottomBar: HTMLDivElement;
  stats: {
    speed: HTMLSpanElement;
    buffer: HTMLSpanElement;
    level: HTMLSpanElement;
    fragments: HTMLSpanElement;
  };
  seek: {
    track: HTMLDivElement;
    buffered: HTMLDivElement;
    progress: HTMLDivElement;
    hover: HTMLDivElement;
  };
  buttons: {
    play: HTMLButtonElement;
    playIcon: SVGSVGElement;
    skipBackward: HTMLButtonElement;
    skipForward: HTMLButtonElement;
    volume: HTMLButtonElement;
    volumeIcon: SVGSVGElement;
    settings: HTMLButtonElement;
    fullscreen: HTMLButtonElement;
    fullscreenIcon: SVGSVGElement;
  };
  volume: {
    wrapper: HTMLDivElement;
    slider: HTMLDivElement;
    fill: HTMLDivElement;
  };
  time: {
    current: HTMLSpanElement;
    total: HTMLSpanElement;
  };
  menu: {
    wrapper: HTMLDivElement;
    panel: HTMLDivElement;
  };
};

export function buildPlayerElement(): PlayerElement {
  const root = div(cls.root);
  root.dataset.hmPlayer = "1";
  root.tabIndex = 0;

  const stage = div(cls.stage);

  const video = document.createElement("video");
  video.className = cls.video;
  video.playsInline = true;
  video.preload = "metadata";
  stage.appendChild(video);

  const errorNote = div(cls.error);
  errorNote.hidden = true;
  stage.appendChild(errorNote);

  const centerHit = div(cls.centerHit);
  stage.appendChild(centerHit);

  const bigPlay = document.createElement("button");
  bigPlay.type = "button";
  bigPlay.className = cls.bigPlay;
  bigPlay.setAttribute("aria-label", "Play");
  bigPlay.appendChild(buildIcon("play", cls.bigPlayIcon));
  bigPlay.dataset.show = "false";
  stage.appendChild(bigPlay);

  const prepStatus = div(cls.loadingPrepChip);
  prepStatus.dataset.show = "true";
  prepStatus.appendChild(div(cls.loadingPrepSpinner));
  const prepLabel = document.createElement("span");
  prepLabel.className = cls.loadingPrepText;
  prepLabel.textContent = "Opening stream…";
  prepStatus.appendChild(prepLabel);
  stage.appendChild(prepStatus);

  const bottomBar = div(cls.chrome);

  const seekWrap = div(cls.seekRow);
  const seekTrack = div(cls.seekTrack);
  seekTrack.dataset.waiting = "false";
  const seekBuffered = div(cls.seekBuffered);
  seekBuffered.style.width = "0%";
  const seekProgress = div(cls.seekProgress);
  seekProgress.style.width = "0%";
  const seekHover = div(cls.seekHover);
  seekHover.dataset.show = "false";
  seekTrack.appendChild(seekBuffered);
  seekTrack.appendChild(seekProgress);
  seekTrack.appendChild(seekHover);
  seekWrap.appendChild(seekTrack);

  const controlsRow = div(cls.controlsRow);
  const controlsLeft = div(cls.controlsLeft);
  const controlsRight = div(cls.controlsRight);

  const playBtn = iconButton(cls);
  const playIcon = buildIcon("play", cls.icon);
  playBtn.appendChild(playIcon);
  playBtn.setAttribute("aria-label", "Play");
  controlsLeft.appendChild(playBtn);

  const skipBackBtn = iconButton(cls);
  skipBackBtn.appendChild(buildIcon("skipBackward", cls.icon));
  skipBackBtn.setAttribute("aria-label", "Back 10 seconds");
  controlsLeft.appendChild(skipBackBtn);

  const skipFwdBtn = iconButton(cls);
  skipFwdBtn.appendChild(buildIcon("skipForward", cls.icon));
  skipFwdBtn.setAttribute("aria-label", "Forward 10 seconds");
  controlsLeft.appendChild(skipFwdBtn);

  const currentTime = document.createElement("span");
  currentTime.className = cls.time;
  currentTime.textContent = "0:00";
  const sep = document.createElement("span");
  sep.className = cls.timeSep;
  sep.textContent = "/";
  const totalTime = document.createElement("span");
  totalTime.className = cls.time;
  totalTime.textContent = "0:00";
  controlsLeft.appendChild(currentTime);
  controlsLeft.appendChild(sep);
  controlsLeft.appendChild(totalTime);

  const menuWrap = div(cls.menuWrap);
  const settingsBtn = iconButton(cls);
  settingsBtn.appendChild(buildIcon("settings", cls.icon));
  settingsBtn.setAttribute("aria-label", "Quality");
  const menuPanel = div(cls.menu);
  menuPanel.dataset.show = "false";
  menuWrap.appendChild(settingsBtn);
  menuWrap.appendChild(menuPanel);
  controlsRight.appendChild(menuWrap);

  const volumeWrapper = div(cls.volumeGroup);
  const volumeBtn = iconButton(cls);
  const volumeIcon = buildIcon("volumeFull", cls.icon);
  volumeBtn.appendChild(volumeIcon);
  volumeBtn.setAttribute("aria-label", "Mute");
  const volumeSlider = div(cls.volumeSlider);
  const volumeFill = div(cls.volumeFill);
  volumeFill.style.width = "100%";
  volumeSlider.appendChild(volumeFill);
  volumeWrapper.appendChild(volumeBtn);
  volumeWrapper.appendChild(volumeSlider);
  controlsRight.appendChild(volumeWrapper);

  const fullscreenBtn = iconButton(cls);
  const fullscreenIcon = buildIcon("fullscreen", cls.icon);
  fullscreenBtn.appendChild(fullscreenIcon);
  fullscreenBtn.setAttribute("aria-label", "Fullscreen");
  controlsRight.appendChild(fullscreenBtn);

  controlsRow.appendChild(controlsLeft);

  const statsRow = div(cls.telemetryRow);
  const statSpeed = document.createElement("span");
  statSpeed.className = cls.telemetrySpeed;
  statSpeed.textContent = "—";
  const teleSep1 = spanSep(cls);
  const statBuf = document.createElement("span");
  statBuf.className = cls.telemetryValue;
  statBuf.textContent = "—";
  const teleSep2 = spanSep(cls);
  const statLvl = document.createElement("span");
  statLvl.className = cls.telemetryValue;
  statLvl.textContent = "—";
  const teleSep3 = spanSep(cls);
  const statFrags = document.createElement("span");
  statFrags.className = cls.telemetryValue;
  statFrags.textContent = "—";
  statsRow.appendChild(statSpeed);
  statsRow.appendChild(teleSep1);
  statsRow.appendChild(statBuf);
  statsRow.appendChild(teleSep2);
  statsRow.appendChild(statLvl);
  statsRow.appendChild(teleSep3);
  statsRow.appendChild(statFrags);
  controlsRow.appendChild(statsRow);

  controlsRow.appendChild(controlsRight);

  bottomBar.appendChild(seekWrap);
  bottomBar.appendChild(controlsRow);
  stage.appendChild(bottomBar);

  root.appendChild(stage);

  return {
    root,
    video,
    centerHit,
    bigPlay,
    prepStatus,
    prepLabel,
    errorNote,
    bottomBar,
    stats: {
      speed: statSpeed,
      buffer: statBuf,
      level: statLvl,
      fragments: statFrags,
    },
    seek: {
      track: seekTrack,
      buffered: seekBuffered,
      progress: seekProgress,
      hover: seekHover,
    },
    buttons: {
      play: playBtn,
      playIcon,
      skipBackward: skipBackBtn,
      skipForward: skipFwdBtn,
      volume: volumeBtn,
      volumeIcon,
      settings: settingsBtn,
      fullscreen: fullscreenBtn,
      fullscreenIcon,
    },
    volume: {
      wrapper: volumeWrapper,
      slider: volumeSlider,
      fill: volumeFill,
    },
    time: {
      current: currentTime,
      total: totalTime,
    },
    menu: {
      wrapper: menuWrap,
      panel: menuPanel,
    },
  };
}

function div(className: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = className;
  return el;
}

function spanSep(c: typeof cls): HTMLSpanElement {
  const s = document.createElement("span");
  s.className = c.telemetrySep;
  s.textContent = "·";
  return s;
}

function iconButton(c: typeof cls): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = c.iconBtn;
  return btn;
}
