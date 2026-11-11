import { DARK_QUERY, THEME_STORAGE_KEY } from './theme-store'

/**
 * Inline script that runs before first paint, so the page never flashes the
 * wrong theme: an explicit stored choice wins, anything else follows the OS.
 * It mirrors getThemeSnapshot in ./theme-store, which takes over once the
 * page's JavaScript runs. Reading storage and applying the class sit in
 * separate try blocks, so blocked storage still gets the OS theme.
 */
export const THEME_SCRIPT = `(function(){var d=document.documentElement,s=null;try{s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}try{var t=s==='light'||s==='dark'?s:window.matchMedia(${JSON.stringify(DARK_QUERY)}).matches?'dark':'light';d.classList.remove('light','dark');d.classList.add(t);d.style.colorScheme=t}catch(e){}})()`
