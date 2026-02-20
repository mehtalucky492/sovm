export default function decorate(block) {
  const rows = Array.from(block.children);

  // Get video source from the first row
  const videoSrc = rows[0]?.querySelector('a')?.href;

  // Clear block content
  block.innerHTML = '';

  if (videoSrc) {
    // Create video element directly (no wrapper div)
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.className = 'video-card-background';

    // Create source element
    const source = document.createElement('source');
    source.src = videoSrc;
    source.type = 'video/mp4';

    // Add fallback text
    const fallbackText = document.createTextNode('Your browser does not support the video tag.');

    video.appendChild(source);
    video.appendChild(fallbackText);
    block.appendChild(video);
  }
}
