export function clickFavoriteButton(btn: HTMLElement): void {
  const cancelDefault = (event: Event) => event.preventDefault();
  btn.addEventListener("click", cancelDefault, { once: true });
  btn.click();
}
