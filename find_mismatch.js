const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf8');

const stack = [];
const pairs = { '}': '{', ')': '(', ']': '[' };

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{' || char === '(' || char === '[') {
      stack.push({ char, line: i + 1, col: j + 1 });
    } else if (char === '}' || char === ')' || char === ']') {
      if (stack.length === 0) {
        console.log(`Unmatched closing ${char} at L${i + 1}:C${j + 1}`);
      } else {
        const top = stack.pop();
        if (top.char !== pairs[char]) {
          console.log(`Mismatched ${char} at L${i + 1}:C${j + 1} (expected closing for ${top.char} from L${top.line}:C${top.col})`);
        }
      }
    }
  }
}

if (stack.length > 0) {
  stack.forEach(unclosed => {
    console.log(`Unclosed ${unclosed.char} from L${unclosed.line}:C${unclosed.col}`);
  });
} else {
  console.log("No basic brace/paren mismatches found (excluding JSX tags).");
}
