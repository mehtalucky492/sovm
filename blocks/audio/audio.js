import { acdl } from '../../scripts/scripts.js';

export default function decorate(block) {
  const audioFallbackText = block.children[0].textContent.trim();
  const audioElement = document.createElement('audio');
  audioElement.controls = true;
  [...block.children].forEach((source, index) => {
    if (index > 0) {
      const sourceURL = source.textContent.trim();
      if (sourceURL.length) {
        const sourceExtension = sourceURL.split('.').pop().split(/#|\?/)[0];
        const sourceElement = document.createElement('source');
        sourceElement.src = sourceURL;
        sourceElement.type = `audio/${sourceExtension}`;
        audioElement.appendChild(sourceElement);
      }
    }
  });
  audioElement.appendChild(document.createTextNode(audioFallbackText));
  block.append(audioElement);

  // ACDL tracking for audio events
  audioElement.addEventListener('play', () => {
    acdl.pushEvent('mediaPlay', {
      component: {
        componentType: 'audio',
        componentTitle: audioFallbackText,
        componentPath: 'blocks/audio',
        mediaType: 'audio',
        mediaSrc: audioElement.currentSrc,
      },
    });
  });

  audioElement.addEventListener('pause', () => {
    acdl.pushEvent('mediaPause', {
      component: {
        componentType: 'audio',
        componentTitle: audioFallbackText,
        componentPath: 'blocks/audio',
        mediaType: 'audio',
        mediaSrc: audioElement.currentSrc,
        currentTime: audioElement.currentTime,
      },
    });
  });

  audioElement.addEventListener('ended', () => {
    acdl.pushEvent('mediaComplete', {
      component: {
        componentType: 'audio',
        componentTitle: audioFallbackText,
        componentPath: 'blocks/audio',
        mediaType: 'audio',
        mediaSrc: audioElement.currentSrc,
      },
    });
  });

  // Push component loaded event
  acdl.push({
    component: {
      componentType: 'audio',
      componentTitle: audioFallbackText,
      componentPath: 'blocks/audio',
    },
  });
}
