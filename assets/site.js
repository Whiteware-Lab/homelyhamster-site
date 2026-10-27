import {makeDemoSteps, sampleDemo} from './demo-model.js';

document.body.classList.add('js-ready');
const menu = document.querySelector('.menu-button');
const nav = document.querySelector('#site-nav');
function closeMenu() {
  menu?.setAttribute('aria-expanded', 'false');
  nav?.removeAttribute('data-open');
}
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  nav?.setAttribute('data-open', String(open));
});
nav?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {closeMenu(); menu.focus();}
});

const profile = document.querySelector('#demo-profile');
if (profile) initializeDemo().catch(() => {
  document.querySelector('#demo-state').textContent = 'Anteprima non disponibile. Il file di esempio e la guida restano accessibili.';
});

async function initializeDemo() {
  const response = await fetch(new URL('./workout-demo.json', import.meta.url));
  if (!response.ok) throw new Error('Demo non disponibile');
  const steps = makeDemoSteps(await response.json());
  const play = document.querySelector('#demo-play');
  const skip = document.querySelector('#demo-skip');
  const reset = document.querySelector('#demo-reset');
  const title = document.querySelector('#demo-step');
  const stateLabel = document.querySelector('#demo-state');
  const progress = document.querySelector('#demo-progress');
  const announcement = document.querySelector('#demo-announcement');
  let elapsed = 0;
  let running = false;
  let anchorTime = 0;
  let anchorElapsed = 0;
  let frameId = null;
  let announcedIndex = -1;
  const time = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  function sync() { if (running) elapsed = Math.min(steps.at(-1).endsAt, anchorElapsed + (performance.now() - anchorTime) / 1000); }
  const bars = steps.map((step, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'profile-block';
    button.dataset.kind = step.kind;
    button.style.setProperty('--duration', String(step.duration));
    button.style.setProperty('--height', `${24 + Math.max(step.start, step.end) * 4.8}px`);
    button.setAttribute('aria-label', `${step.name}, ${step.duration} secondi. Vai al blocco ${index + 1}.`);
    button.setAttribute('aria-pressed', 'false');
    const label = document.createElement('span');
    label.textContent = `${step.duration}s`;
    label.setAttribute('aria-hidden', 'true');
    button.append(label);
    button.addEventListener('click', () => jump(step.startsAt));
    profile.append(button);
    return button;
  });
  function render() {
    const current = sampleDemo(steps, elapsed);
    if (current.complete) running = false;
    title.textContent = current.complete ? 'Giro completato!' : current.step.name;
    stateLabel.textContent = current.complete ? 'Puoi ricominciare o esplorare un blocco.' : `${running ? 'In corso' : 'In pausa'} · blocco ${current.index + 1} di ${steps.length}`;
    document.querySelector('#demo-resistance').innerHTML = `${current.resistance.toFixed(1).replace('.', ',')}<span>%</span>`;
    document.querySelector('#demo-remaining').textContent = time(Math.ceil(current.remaining));
    document.querySelector('#demo-elapsed').textContent = `${time(current.elapsed)} / ${time(current.total)}`;
    document.querySelector('#demo-cadence').textContent = current.complete || current.step.cadence === null ? 'Cadenza libera' : `Obiettivo ${current.step.cadence} rpm`;
    progress.max = current.total;
    progress.value = current.elapsed;
    play.textContent = running ? 'Pausa Ⅱ' : current.complete ? 'Ricomincia ↺' : 'Avvia ▶';
    skip.disabled = current.complete;
    bars.forEach((bar, index) => bar.setAttribute('aria-pressed', String(index === current.index && !current.complete)));
    if (announcedIndex !== current.index || current.complete) {
      announcement.textContent = current.complete ? 'Anteprima completata.' : `${current.step.name}. Blocco ${current.index + 1} di ${steps.length}.`;
      announcedIndex = current.index;
    }
  }
  function tick() {
    sync(); render();
    frameId = running ? requestAnimationFrame(tick) : null;
  }
  function jump(to) {
    elapsed = to;
    anchorElapsed = to;
    anchorTime = performance.now();
    render();
  }
  function pause() {
    sync(); running = false;
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    render();
  }
  play.addEventListener('click', () => {
    if (running) return pause();
    if (sampleDemo(steps, elapsed).complete) elapsed = 0;
    anchorElapsed = elapsed;
    anchorTime = performance.now();
    running = true;
    render();
    frameId = requestAnimationFrame(tick);
  });
  skip.addEventListener('click', () => {sync(); jump(sampleDemo(steps, elapsed).step.endsAt);});
  reset.addEventListener('click', () => {pause(); jump(0);});
  document.addEventListener('visibilitychange', () => {if (document.hidden && running) pause();});
  [play, skip, reset].forEach(button => {button.disabled = false;});
  render();
}
