// Presentation-only model for the bundled two-minute example, not a trainer driver.
export function makeDemoSteps(workout) {
  const steps = [];
  let offset = 0;
  function walk(segment, depth = 0) {
    if (depth > 12 || !Number.isInteger(segment.repeat ?? 1) || (segment.repeat ?? 1) < 1 || (segment.repeat ?? 1) > 12) throw new Error('Demo non valida');
    for (let n = 0; n < (segment.repeat ?? 1); n++) {
      if (segment.kind === 'sequence') {
        if (!Array.isArray(segment.children) || !segment.children.length) throw new Error('Demo non valida');
        segment.children.forEach(child => walk(child, depth + 1));
      } else {
        const curve = segment.trainerTarget?.target;
        if (!Number.isInteger(segment.durationSeconds) || segment.durationSeconds < 1 || curve?.unit !== 'percentResistance' || !Number.isFinite(curve.start) || !Number.isFinite(curve.end ?? curve.start)) throw new Error('Demo non valida');
        if (steps.length >= 24 || offset + segment.durationSeconds > 600) throw new Error('Demo troppo lunga');
        steps.push({name: segment.name, kind: segment.id === 'work' ? 'work' : 'other', duration: segment.durationSeconds,
          startsAt: offset, endsAt: offset + segment.durationSeconds, start: curve.start, end: curve.end ?? curve.start,
          cadence: segment.athleteTargets?.cadence?.start ?? null});
        offset += segment.durationSeconds;
      }
    }
  }
  walk(workout.root);
  if (!steps.length) throw new Error('Demo vuota');
  return steps;
}
export function sampleDemo(steps, elapsed) {
  const total = steps.at(-1).endsAt;
  const time = Math.min(total, Math.max(0, Number.isFinite(elapsed) ? elapsed : 0));
  const complete = time >= total;
  const index = complete ? steps.length - 1 : steps.findIndex(step => time < step.endsAt);
  const step = steps[index];
  const fraction = (time - step.startsAt) / step.duration;
  return {step, index, elapsed: time, total, complete,
    remaining: Math.max(0, step.endsAt - time), resistance: step.start + (step.end - step.start) * fraction};
}
