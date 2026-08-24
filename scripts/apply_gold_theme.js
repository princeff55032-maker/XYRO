const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/(dashboard)/settings/settings-client.tsx',
  'src/app/(dashboard)/members/members-form.tsx',
  'src/app/(dashboard)/members/page.tsx',
  'src/app/(dashboard)/trainers/trainers-form.tsx',
  'src/app/(dashboard)/trainers/page.tsx',
  'src/app/(dashboard)/plans/plans-form.tsx',
  'src/app/(dashboard)/plans/page.tsx',
  'src/app/(dashboard)/payments/payments-form.tsx',
  'src/app/(dashboard)/workouts/workout-form.tsx',
  'src/app/(dashboard)/attendance/page.tsx',
  'src/app/(dashboard)/attendance/attendance-form.tsx',
  'src/app/(member)/member/page.tsx',
  'src/app/(member)/member/qr-pass.tsx',
  'src/app/(trainer)/trainer/page.tsx',
  'src/app/admin/layout.tsx',
];

const root = path.join(__dirname, '..');

for (const rel of filesToUpdate) {
  const fullPath = path.join(root, rel);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');

  // Replace gradients
  content = content.replace(/from-purple-600 to-cyan-500/g, 'from-amber-300 via-amber-400 to-amber-500 text-black');
  content = content.replace(/from-purple-500\/70 to-cyan-500\/70/g, 'from-amber-400/80 to-amber-600/80 text-black');
  content = content.replace(/from-purple-500 to-cyan-500/g, 'from-amber-300 to-amber-500 text-black');
  content = content.replace(/from-purple-600\/40 to-cyan-400\/80/g, 'from-amber-600/40 to-amber-400/90');
  content = content.replace(/from-purple-900\/30 via-surface to-cyan-900\/20/g, 'from-amber-950/30 via-surface to-amber-900/20');
  content = content.replace(/from-amber-500 to-purple-600/g, 'from-amber-400 to-amber-600');
  content = content.replace(/from-purple-500 to-accent/g, 'from-amber-300 to-amber-500');

  // Replace focus borders and rings
  content = content.replace(/focus:border-purple-500\/50 focus:ring-2 focus:ring-purple-500\/30/g, 'focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20');
  content = content.replace(/focus:border-purple-500\/50 focus:bg-white\/\[0\.07\] focus:ring-2 focus:ring-purple-500\/20/g, 'focus:border-amber-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-amber-400/20');
  content = content.replace(/focus:ring-purple-500/g, 'focus:ring-amber-400');
  content = content.replace(/text-purple-600/g, 'text-amber-400');

  // Replace text colors
  content = content.replace(/text-purple-400/g, 'text-amber-300');
  content = content.replace(/text-purple-300/g, 'text-amber-200');
  content = content.replace(/bg-purple-500\/10/g, 'bg-amber-400/10');
  content = content.replace(/bg-purple-500\/20/g, 'bg-amber-400/15');
  content = content.replace(/bg-purple-500\/5/g, 'bg-amber-400/5');
  content = content.replace(/border-purple-500\/20/g, 'border-amber-400/20');
  content = content.replace(/border-purple-500\/30/g, 'border-amber-400/30');
  content = content.replace(/border-purple-500\/50/g, 'border-amber-400/40');
  content = content.replace(/bg-purple-600/g, 'bg-amber-500');
  content = content.replace(/shadow-purple-900\/30/g, 'shadow-amber-500/20');
  content = content.replace(/shadow-purple-900\/40/g, 'shadow-amber-500/25');
  content = content.replace(/accent-purple-500/g, 'accent-amber-400');

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${rel}`);
}

console.log('All components updated to Champagne Gold & Amber theme.');
