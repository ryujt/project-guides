const selector = document.querySelector('#scene-selector');
const sceneElements = [...document.querySelectorAll('[data-scenes]')];
const knownScenes = new Set([...selector.options].map(option => option.value));

function displayScene() {
  let requested;
  try {
    requested = decodeURIComponent(location.hash.slice(1));
  } catch {
    requested = '';
  }
  const scene = knownScenes.has(requested) ? requested : 'default';
  selector.value = scene;
  document.body.dataset.scene = scene;
  for (const element of sceneElements) {
    element.hidden = !element.dataset.scenes.split(' ').includes(scene);
  }
  const feedbackInput = document.querySelector('#feedback-input');
  if (feedbackInput) {
    feedbackInput.setAttribute('aria-invalid', String(scene === 'validation'));
  }
}

selector.addEventListener('change', () => {
  location.hash = selector.value;
});
addEventListener('hashchange', displayScene);

const form = document.querySelector('#feedback-form');
if (form) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const content = document.querySelector('#feedback-input').value.trim();
    location.hash = content ? 'result' : 'validation';
    displayScene();
  });
}

displayScene();
