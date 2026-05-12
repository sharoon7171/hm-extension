import type { ReactNode } from "react";
import {
  rowClasses,
  switchKnob,
  switchTrack,
} from "../../ui-classes/options";

type ToggleRowProps = {
  title: string;
  hint?: ReactNode;
  checked: boolean;
  onToggle: () => void | Promise<void>;
  ariaLabel: string;
  indented?: boolean;
};

export function ToggleRow({
  title,
  hint,
  checked,
  onToggle,
  ariaLabel,
  indented,
}: ToggleRowProps) {
  const rootCls = indented
    ? `${rowClasses.root} ${rowClasses.rootIndented}`
    : rowClasses.root;
  return (
    <div className={rootCls}>
      <div className={rowClasses.label}>
        <span className={rowClasses.title}>{title}</span>
        {hint ? <span className={rowClasses.hint}>{hint}</span> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={() => void onToggle()}
        className={switchTrack(checked)}
      >
        <span className={switchKnob(checked)} />
      </button>
    </div>
  );
}
