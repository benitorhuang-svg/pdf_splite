import type { SVGProps } from 'react'

export const Icon = ({ name, ...props }: SVGProps<SVGSVGElement> & { name: string }) => {
  const paths: Record<string, React.ReactNode> = {
    file: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
    upload: <><path d="M12 17V3M7 8l5-5 5 5"/><path d="M4 14v7h16v-7"/></>,
    shield: <><path d="M12 3 4 6v6c0 5 3.4 8 8 10 4.6-2 8-5 8-10V6z"/><path d="m9 12 2 2 4-5"/></>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    download: <><path d="M12 3v13m-5-5 5 5 5-5"/><path d="M4 19v2h16v-2"/></>,
    play: <path d="m8 5 11 7-11 7z"/>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[name]}</svg>
}
