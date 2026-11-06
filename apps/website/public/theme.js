// Apply before first paint. A blocked storage API should not prevent rendering.
try {
  const saved = localStorage.getItem('wotci-theme')
  document.documentElement.dataset.theme = saved === 'dark' || saved === 'light'
    ? saved
    : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
catch { /* Use the readable light default. */ }
