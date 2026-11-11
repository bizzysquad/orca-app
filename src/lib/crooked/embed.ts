// Turns a pasted share link into something a page can play. Works in the
// browser and on the server.

export type EmbedInfo =
  | { kind: 'iframe'; src: string; provider: string }
  | { kind: 'video'; src: string }
  | { kind: 'link'; src: string }

export function toEmbed(url: string): EmbedInfo {
  const u = (url || '').trim()
  let m: RegExpMatchArray | null

  if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/)))
    return { kind: 'iframe', provider: 'YouTube', src: `https://www.youtube.com/embed/${m[1]}?rel=0&playsinline=1` }
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)))
    return { kind: 'iframe', provider: 'Vimeo', src: `https://player.vimeo.com/video/${m[1]}` }
  if ((m = u.match(/instagram\.com\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/)))
    return { kind: 'iframe', provider: 'Instagram', src: `https://www.instagram.com/${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}/embed` }
  if ((m = u.match(/tiktok\.com\/.*\/video\/(\d+)/)))
    return { kind: 'iframe', provider: 'TikTok', src: `https://www.tiktok.com/embed/v2/${m[1]}` }
  if ((m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/)))
    return { kind: 'iframe', provider: 'Google Drive', src: `https://drive.google.com/file/d/${m[1]}/preview` }
  if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(u)) return { kind: 'video', src: u }
  return { kind: 'link', src: u }
}

// Free thumbnail when the admin didn't upload one.
export function autoThumbnail(url: string): string {
  const m = (url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/)
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : ''
}
