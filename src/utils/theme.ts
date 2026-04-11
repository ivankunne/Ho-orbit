// TODO: replace with → api.patch('/user/preferences', { theme }) to sync across devices

export function getTheme() {
  return (
    localStorage.getItem('ho_theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
}

export function setTheme(theme) {
  localStorage.setItem('ho_theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
}

export function toggleTheme() {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
