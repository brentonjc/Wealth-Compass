// charts.js — Chart.js Compass Rose radars. Assumes Chart is loaded globally
// (via CDN in index.html). Colours match the fintech design tokens.

const BLURPLE = '#635BFF';
const PURPLELIGHT = '#8B85FF';

export function labelsFor(assessment) {
  return assessment.compass.map((d) => `${d.icon} ${d.name}`);
}

function scaleDark() {
  return {
    r: {
      min: 0, max: 100, beginAtZero: true,
      ticks: { display: false, stepSize: 25 },
      grid: { color: 'rgba(130,145,173,.22)' },
      angleLines: { color: 'rgba(130,145,173,.22)' },
      pointLabels: { color: '#EAF0FA', font: { size: 11, weight: '500' } },
    },
  };
}

// Single-person compass rose (the Reveal screen).
export function renderRose(canvas, assessment, scores) {
  const data = assessment.compass.map((d) => scores.compass[d.id]);
  return new Chart(canvas, {
    type: 'radar',
    data: {
      labels: labelsFor(assessment),
      datasets: [{
        data,
        backgroundColor: 'rgba(99,91,255,.30)',
        borderColor: BLURPLE, borderWidth: 2,
        pointBackgroundColor: BLURPLE, pointRadius: 3,
      }],
    },
    options: { responsive: false, layout: { padding: 22 }, plugins: { legend: { display: false } }, scales: scaleDark() },
  });
}

// Two overlaid roses (the Shared Compass screen).
export function renderSharedRose(canvas, assessment, mine, theirs, names) {
  return new Chart(canvas, {
    type: 'radar',
    data: {
      labels: labelsFor(assessment),
      datasets: [
        {
          label: names.me,
          data: assessment.compass.map((d) => mine.compass[d.id]),
          backgroundColor: 'rgba(99,91,255,.22)', borderColor: BLURPLE, borderWidth: 2,
          pointBackgroundColor: BLURPLE, pointRadius: 2.5,
        },
        {
          label: names.partner,
          data: assessment.compass.map((d) => theirs.compass[d.id]),
          backgroundColor: 'rgba(139,133,255,.16)', borderColor: PURPLELIGHT, borderWidth: 2,
          pointBackgroundColor: PURPLELIGHT, pointRadius: 2.5, borderDash: [5, 4],
        },
      ],
    },
    options: { responsive: false, layout: { padding: 22 }, plugins: { legend: { display: false } }, scales: scaleDark() },
  });
}
