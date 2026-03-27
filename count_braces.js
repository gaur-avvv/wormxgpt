import fs from 'fs';
const content = fs.readFileSync('App.tsx', 'utf8');
const counts = {
  '{': 0, '}': 0,
  '(': 0, ')': 0,
  '[': 0, ']': 0,
  '<': 0, '>': 0
};
for (const char of content) {
  if (counts.hasOwnProperty(char)) counts[char]++;
}
console.log(counts);
