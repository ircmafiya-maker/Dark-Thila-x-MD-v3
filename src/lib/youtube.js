import yts from 'yt-search';

const ID_RE = /(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/;

/** query or YouTube link -> { title, url, seconds, timestamp, author, thumbnail, views } */
export async function findVideo(input) {
  const id = (input.match(ID_RE) || [])[1];
  const v = id ? await yts({ videoId: id }) : (await yts(input)).videos?.[0];
  if (!v) return null;
  return {
    title: v.title,
    url: v.url || `https://www.youtube.com/watch?v=${id}`,
    seconds: v.seconds ?? v.duration?.seconds ?? 0,
    timestamp: v.timestamp || v.duration?.timestamp || '',
    author: v.author?.name || '',
    thumbnail: v.thumbnail || v.image,
    views: v.views || 0,
  };
}
